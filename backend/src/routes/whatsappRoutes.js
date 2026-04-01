const express = require('express');
const fs = require('fs');
const path = require('path');
const whaileys = require('whaileys');
const makeWASocket = whaileys.default;
const { DisconnectReason, fetchLatestWaWebVersion } = whaileys;
const authenticateToken = require('../middleware/authenticateToken');
const BaileysAuthStateAdapter = require('../services/baileysAuthStateAdapter');
const WhatsAppSessionService = require('../services/whatsappSessionService');

const router = express.Router();

const DEFAULT_SESSION_ID = 'default';
const MAX_RECONNECT_ATTEMPTS = 5;
// sessionManager removido — toda gestão de sessões usa WhatsAppSessionService (banco de dados)
const tenantRuntimes = new Map();

// Variáveis globais legadas mantidas por compatibilidade com blocos antigos do arquivo.
let sock = null;
let qrCodeData = null;
let isAuthenticated = false;
let isInitializing = false;
let currentSessionId = DEFAULT_SESSION_ID;
let authStateAdapter = null;
let reconnectAttempts = 0;
let connectionBlocked = false; // true quando 405 ou limite de tentativas atingido

const { getSocketIO } = require('../socket');

// Função para broadcast via Socket.IO (rooms por tenant)
const broadcast = (data) => {
  try {
    const io = getSocketIO();
    const payload = { ...data, timestamp: new Date().toISOString() };
    if (data.tenantId) {
      io.to(`whatsapp:${data.tenantId}`).emit('whatsapp:update', payload);
    } else {
      io.emit('whatsapp:update', payload);
    }
    console.log('📡 Socket.IO emitido:', data.type, '| tenant:', data.tenantId);
  } catch (err) {
    // Socket.IO ainda não está pronto (boot inicial)
    console.log('⚠️ broadcast ignorado (socket não pronto):', err.message);
  }
};

const sanitizeSessionId = (sessionId = DEFAULT_SESSION_ID) => {
  const normalized = String(sessionId || DEFAULT_SESSION_ID)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  return normalized || DEFAULT_SESSION_ID;
};

const getTenantSessionPrefix = (tenantId) => `tenant_${tenantId}__`;

const buildStoredSessionId = (tenantId, sessionId = DEFAULT_SESSION_ID) => {
  return `${getTenantSessionPrefix(tenantId)}${sanitizeSessionId(sessionId)}`;
};

const toPublicSessionId = (tenantId, storedSessionId) => {
  const prefix = getTenantSessionPrefix(tenantId);
  if (!storedSessionId) return DEFAULT_SESSION_ID;
  if (storedSessionId.startsWith(prefix)) {
    return storedSessionId.slice(prefix.length) || DEFAULT_SESSION_ID;
  }
  return storedSessionId;
};

const createTenantRuntime = (tenantId) => ({
  tenantId,
  sock: null,
  qrCodeData: null,
  isAuthenticated: false,
  isInitializing: false,
  currentSessionId: buildStoredSessionId(tenantId, DEFAULT_SESSION_ID),
  authStateAdapter: null,
  reconnectAttempts: 0,
  connectionBlocked: false,
});

const getTenantRuntime = (tenantId) => {
  const numericTenantId = Number(tenantId);

  if (!tenantRuntimes.has(numericTenantId)) {
    tenantRuntimes.set(numericTenantId, createTenantRuntime(numericTenantId));
  }

  return tenantRuntimes.get(numericTenantId);
};

const getCurrentPublicSessionId = (tenantId, runtime) => {
  return toPublicSessionId(tenantId, runtime.currentSessionId);
};

const getRequestSessionIds = (req, sessionId = DEFAULT_SESSION_ID) => {
  const publicSessionId = sanitizeSessionId(sessionId);
  return {
    publicSessionId,
    storedSessionId: buildStoredSessionId(req.tenantId, publicSessionId),
  };
};

const getTenantContext = (req) => {
  const runtime = getTenantRuntime(req.tenantId);

  return {
    runtime,
    sock: runtime.sock,
    qrCodeData: runtime.qrCodeData,
    isAuthenticated: runtime.isAuthenticated,
    isInitializing: runtime.isInitializing,
    currentSessionId: getCurrentPublicSessionId(req.tenantId, runtime),
    authStateAdapter: runtime.authStateAdapter,
    connectionBlocked: runtime.connectionBlocked,
  };
};

const resetTenantRuntimeState = (runtime) => {
  runtime.sock = null;
  runtime.qrCodeData = null;
  runtime.isAuthenticated = false;
  runtime.isInitializing = false;
  runtime.reconnectAttempts = 0;
  runtime.connectionBlocked = false;
};

const disconnectTenantRuntime = async (runtime, { deleteSession = false } = {}) => {
  const activeSessionId = runtime.currentSessionId;
  const adapter = runtime.authStateAdapter || new BaileysAuthStateAdapter(activeSessionId);

  if (runtime.sock) {
    try {
      await runtime.sock.logout();
    } catch (error) {
      console.log('⚠️ Erro no logout:', error.message);
    }
  }

  resetTenantRuntimeState(runtime);

  try {
    await adapter.markAsDisconnected();
  } catch (error) {
    console.log('⚠️ Erro ao marcar sessão como desconectada:', error.message);
  }

  if (deleteSession) {
    try {
      await adapter.deleteSession();
    } catch (error) {
      console.log('⚠️ Erro ao remover sessão:', error.message);
    }
    runtime.currentSessionId = buildStoredSessionId(runtime.tenantId, DEFAULT_SESSION_ID);
    runtime.authStateAdapter = null;
  } else {
    runtime.authStateAdapter = adapter;
  }

  return activeSessionId;
};

const optionalAuthenticateToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return next();
  }

  return authenticateToken(req, res, next);
};

const resolveWhatsAppTenant = (req, res, next) => {
  const headerTenantId = Number.parseInt(req.headers['x-tenant-id'], 10);

  if (req.user?.is_super_admin && Number.isInteger(headerTenantId) && headerTenantId > 0) {
    req.tenantId = headerTenantId;
    return next();
  }

  if (req.user?.tenant_id) {
    req.tenantId = req.user.tenant_id;
    return next();
  }

  if (Number.isInteger(headerTenantId) && headerTenantId > 0) {
    req.tenantId = headerTenantId;
    return next();
  }

  return res.status(400).json({
    success: false,
    error: 'Tenant não informado',
  });
};

const isCurrentSocketRuntime = (runtime, tenantSock, storedSessionId) => {
  return runtime.sock === tenantSock && runtime.currentSessionId === storedSessionId;
};

router.use(optionalAuthenticateToken);
router.use(resolveWhatsAppTenant);

// Função para inicializar o cliente Baileys com arquivos
const initializeWhatsAppClient = async (tenantId, storedSessionId = buildStoredSessionId(tenantId, DEFAULT_SESSION_ID)) => {
  const runtime = getTenantRuntime(tenantId);
  const publicSessionId = toPublicSessionId(tenantId, storedSessionId);

  if (runtime.isInitializing) {
    console.log(`⏳ Cliente da organização ${tenantId} já está sendo inicializado...`);
    return;
  }

  runtime.isInitializing = true;
  runtime.isAuthenticated = false;
  runtime.qrCodeData = null;
  runtime.currentSessionId = storedSessionId;

  try {
    console.log(`🚀 Inicializando cliente WhatsApp para tenant ${tenantId} com sessão: ${publicSessionId}`);
    
    // Criar adaptador de banco de dados
    runtime.authStateAdapter = new BaileysAuthStateAdapter(storedSessionId);
    await runtime.authStateAdapter.markAsConnecting();

    // Buscar versão mais recente do WhatsApp Web automaticamente
    let waVersion;
    try {
      const { version } = await fetchLatestWaWebVersion({});
      waVersion = version;
      console.log(`📱 Versão do WhatsApp Web: ${version.join('.')}`);
    } catch {
      waVersion = [2, 3000, 1035608266]; // Fallback
      console.log(`⚠️ Usando versão fallback: ${waVersion.join('.')}`);
    }

    // Carregar estado de autenticação do banco de dados
    const { state, saveCreds } = await runtime.authStateAdapter.useDBAuthState();
    const tenantSock = makeWASocket({
      auth: state,
      version: waVersion,
      browser: ['CRM IMOB', 'Chrome', '22.0'],
    });
    runtime.sock = tenantSock;

    // Timeout de segurança: se após 35s ainda não houve QR nem conexão, libera o estado
    const initTimeoutId = setTimeout(() => {
      const liveRuntime = getTenantRuntime(tenantId);
      if (isCurrentSocketRuntime(liveRuntime, tenantSock, storedSessionId) && liveRuntime.isInitializing) {
        console.log(`⏰ Timeout de inicialização para tenant ${tenantId}. Resetando estado...`);
        resetTenantRuntimeState(liveRuntime);
        try { tenantSock.end(); } catch {}
        broadcast({
          tenantId,
          sessionId: publicSessionId,
          type: 'error',
          message: 'Timeout ao gerar QR Code. Tente novamente.',
        });
      }
    }, 35000);

    tenantSock.ev.on('creds.update', saveCreds);

    tenantSock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      const liveRuntime = getTenantRuntime(tenantId);
      
      if (qr) {
        if (!isCurrentSocketRuntime(liveRuntime, tenantSock, storedSessionId)) {
          return;
        }

        clearTimeout(initTimeoutId);
        liveRuntime.isInitializing = false; // QR pronto — não é mais 'inicializando'
        liveRuntime.qrCodeData = qr;
        console.log('\u001b[32mQR Code para autenticação:\u001b[0m', qr);
        broadcast({
          type: 'qr',
          tenantId,
          qrCode: qr,
          message: 'QR Code disponível para escaneamento',
          sessionId: publicSessionId
        });
      }
      
      if (connection === 'open') {
        if (!isCurrentSocketRuntime(liveRuntime, tenantSock, storedSessionId)) {
          return;
        }

        clearTimeout(initTimeoutId);
        liveRuntime.isAuthenticated = true;
        liveRuntime.isInitializing = false;
        liveRuntime.qrCodeData = null;
        liveRuntime.reconnectAttempts = 0;
        liveRuntime.connectionBlocked = false;

        // Extrair número do telefone se disponível
        const phoneNumber = tenantSock.user?.id?.replace(/:\d+@.*/, '') || null;
        
        // Marcar sessão como autenticada no banco
        if (liveRuntime.authStateAdapter) {
          await liveRuntime.authStateAdapter.markAsAuthenticated(phoneNumber);
        }
        
        broadcast({
          type: 'status',
          tenantId,
          status: 'ready',
          message: 'WhatsApp conectado e pronto',
          sessionId: publicSessionId,
          phoneNumber
        });
        
        console.log(`✅ WhatsApp conectado - Tenant: ${tenantId}, Sessão: ${publicSessionId}, Telefone: ${phoneNumber}`);
      } 
      else if (connection === 'close') {
        const isCurrentRuntime = isCurrentSocketRuntime(liveRuntime, tenantSock, storedSessionId);

        if (isCurrentRuntime) {
          liveRuntime.isAuthenticated = false;
          liveRuntime.isInitializing = false;
          liveRuntime.qrCodeData = null;
        }
        
        // Marcar sessão como desconectada no banco
        const adapter = liveRuntime.authStateAdapter && liveRuntime.currentSessionId === storedSessionId
          ? liveRuntime.authStateAdapter
          : new BaileysAuthStateAdapter(storedSessionId);

        await adapter.markAsDisconnected();
        if (isCurrentRuntime) {
          liveRuntime.authStateAdapter = adapter;
        }
        
        if (update.lastDisconnect?.error) {
          console.error('❌ Detalhe do erro de conexão:', update.lastDisconnect.error);
          
          // Marcar como erro se for um erro real
          await adapter.markAsError();
        }
        
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 405;

        if (isCurrentRuntime) {
          broadcast({
            type: 'status',
            tenantId,
            status: 'disconnected',
            message: 'WhatsApp desconectado',
            sessionId: publicSessionId
          });
        }

        if (isCurrentRuntime && shouldReconnect && liveRuntime.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          liveRuntime.reconnectAttempts++;
          liveRuntime.isInitializing = true; // mantém spinner no frontend durante o delay
          const delay = Math.min(5000 * liveRuntime.reconnectAttempts, 30000); // backoff: 5s, 10s, 15s... max 30s
          console.log(`🔄 Tentando reconectar tenant ${tenantId}... (tentativa ${liveRuntime.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}, aguardando ${delay / 1000}s)`);
          setTimeout(() => {
            const rt = getTenantRuntime(tenantId);
            rt.isInitializing = false; // libera o guard para o próximo init
            initializeWhatsAppClient(tenantId, storedSessionId);
          }, delay);
        } else if (isCurrentRuntime && statusCode === 405) {
          console.log('🚫 Erro 405 — WhatsApp bloqueou a conexão. Não reconectando. Tente novamente mais tarde ou escaneie um novo QR Code.');
          liveRuntime.reconnectAttempts = 0;
          liveRuntime.connectionBlocked = true;
        } else if (isCurrentRuntime && liveRuntime.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log(`🛑 Limite de ${MAX_RECONNECT_ATTEMPTS} tentativas de reconexão atingido. Parando reconexão automática.`);
          liveRuntime.reconnectAttempts = 0;
          liveRuntime.connectionBlocked = true;
        } else if (isCurrentRuntime) {
          console.log('🚪 Usuário fez logout — não reconectando');
          liveRuntime.reconnectAttempts = 0;
        }
      }
    });

    tenantSock.ev.on('connection.error', (err) => {
      console.error('❌ Evento connection.error:', err);
    });

    tenantSock.ev.on('messages.upsert', (m) => {
      const liveRuntime = getTenantRuntime(tenantId);
      if (!isCurrentSocketRuntime(liveRuntime, tenantSock, storedSessionId)) {
        return;
      }

      broadcast({
        tenantId,
        sessionId: publicSessionId,
        type: 'messageReceived',
        data: m
      });
    });

    console.log('✅ Cliente Baileys iniciado!');
  } catch (error) {
    console.error('❌ Erro ao inicializar cliente Baileys:', error);
    resetTenantRuntimeState(runtime);
    broadcast({
      tenantId,
      sessionId: publicSessionId,
      type: 'error',
      message: 'Erro ao inicializar: ' + error.message
    });
  }
};

// Função para formatar número de telefone - CORRIGIDA PARA NÚMEROS SEM O 9
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < 10) return null;
  
  let formattedPhone = cleanPhone;
  
  console.log('🔍 Número original limpo:', cleanPhone);
  
  // 🔥 LÓGICA PARA NÚMEROS BRASILEIROS SEM O 9 ADICIONAL
  
  // Se já tem código do país (55)
  if (formattedPhone.startsWith('55')) {
    // Se tem 13 dígitos (55 + DDD + 9 + 8 dígitos) - REMOVER O 9
    if (formattedPhone.length === 13) {
      const codigoPais = formattedPhone.substring(0, 2); // 55
      const ddd = formattedPhone.substring(2, 4); // 61
      const nono = formattedPhone.substring(4, 5); // 9
      const numero = formattedPhone.substring(5); // 96080740
      
      // Se o 5º dígito é 9, remover (assumindo que é o 9 adicional)
      if (nono === '9') {
        formattedPhone = `${codigoPais}${ddd}${numero}`;
        console.log('📱 Removido 9 adicional:', formattedPhone);
      }
    }
    // Se tem 12 dígitos (55 + DDD + 8 dígitos) - já está correto
    else if (formattedPhone.length === 12) {
      console.log('📱 Número já no formato correto (12 dígitos):', formattedPhone);
    }
  } 
  // Se não tem código do país
  else {
    // Se tem 11 dígitos (DDD + 9 + 8 dígitos) - REMOVER O 9 e ADICIONAR 55
    if (formattedPhone.length === 11) {
      const ddd = formattedPhone.substring(0, 2); // 61
      const nono = formattedPhone.substring(2, 3); // 9
      const numero = formattedPhone.substring(3); // 96080740
      
      // Se o 3º dígito é 9, remover (assumindo que é o 9 adicional)
      if (nono === '9') {
        formattedPhone = `55${ddd}${numero}`;
        console.log('📱 Removido 9 e adicionado 55:', formattedPhone);
      } else {
        // Se não tem 9, apenas adicionar 55
        formattedPhone = `55${formattedPhone}`;
        console.log('📱 Adicionado apenas 55:', formattedPhone);
      }
    }
    // Se tem 10 dígitos (DDD + 8 dígitos) - ADICIONAR APENAS 55
    else if (formattedPhone.length === 10) {
      formattedPhone = `55${formattedPhone}`;
      console.log('📱 Adicionado 55 a número de 10 dígitos:', formattedPhone);
    }
  }
  
  // Validar se o número final tem 12 dígitos (55 + DDD + 8 dígitos SEM o 9)
  if (formattedPhone.length !== 12) {
    console.log('❌ Número inválido após formatação (deve ter 12 dígitos):', formattedPhone);
    return null;
  }
  
  const finalNumber = `${formattedPhone}@s.whatsapp.net`;
  console.log('✅ Número formatado final:', finalNumber);
  
  return finalNumber;
};

// ===== ROTAS DA API =====

// Rota para obter QR Code (não inicializa automaticamente — só retorna estado atual)
router.get('/qr-code', async (req, res) => {
  try {
    const { sock, isAuthenticated, connectionBlocked, isInitializing, qrCodeData, currentSessionId } = getTenantContext(req);

    if (isAuthenticated && sock) {
      return res.json({
        authenticated: true,
        hasQrCode: false,
        sessionId: currentSessionId,
        message: 'WhatsApp já está conectado'
      });
    }

    if (connectionBlocked) {
      return res.json({
        authenticated: false,
        hasQrCode: false,
        sessionId: currentSessionId,
        message: 'Conexão bloqueada pelo WhatsApp. Limpe a sessão e tente novamente.',
        blocked: true
      });
    }

    // Verificar QR ANTES de isInitializing: o QR pode já estar pronto enquanto
    // isInitializing ainda é true (Baileys emite o QR antes de indicar 'open')
    if (qrCodeData) {
      return res.json({
        authenticated: false,
        hasQrCode: true,
        sessionId: currentSessionId,
        qrCode: qrCodeData,
        message: 'QR Code disponível para escaneamento'
      });
    }

    if (isInitializing) {
      return res.json({
        authenticated: false,
        hasQrCode: false,
        sessionId: currentSessionId,
        message: 'Gerando QR Code, aguarde...',
        isInitializing: true
      });
    }

    // Não inicializa sozinho — retorna que está aguardando o usuário clicar "Conectar"
    return res.json({
      authenticated: false,
      hasQrCode: false,
      sessionId: currentSessionId,
      message: 'Clique em "Conectar WhatsApp" para gerar o QR Code.',
      idle: true
    });

  } catch (error) {
    console.error('❌ Erro ao obter QR Code:', error);
    res.status(500).json({
      error: true,
      message: 'Erro interno do servidor: ' + error.message
    });
  }
});

// Rota para iniciar conexão manualmente (usuário clica "Conectar")
router.post('/connect', async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    const runtime = getTenantRuntime(req.tenantId);
    const requestedSessionId = sessionId || getCurrentPublicSessionId(req.tenantId, runtime);
    const { publicSessionId, storedSessionId } = getRequestSessionIds(req, requestedSessionId);

    if (runtime.isAuthenticated && runtime.sock && runtime.currentSessionId === storedSessionId) {
      return res.json({ success: true, sessionId: publicSessionId, message: 'Já está conectado.' });
    }

    // Se está inicializando mas ainda não tem QR Code, considera stuck e força reinicialização
    if (runtime.isInitializing && runtime.qrCodeData) {
      return res.json({ success: true, sessionId: publicSessionId, message: 'Já está inicializando, aguarde...' });
    }
    if (runtime.isInitializing && !runtime.qrCodeData) {
      console.log(`⚠️ Tenant ${req.tenantId} preso em isInitializing sem QR. Forçando reset...`);
      resetTenantRuntimeState(runtime);
      if (runtime.sock) { try { runtime.sock.end(); } catch {} runtime.sock = null; }
    }

    if (runtime.sock && runtime.currentSessionId !== storedSessionId) {
      await disconnectTenantRuntime(runtime);
    }

    runtime.connectionBlocked = false;
    runtime.reconnectAttempts = 0;

    await initializeWhatsAppClient(req.tenantId, storedSessionId);

    // Aguardar um pouco para o QR aparecer
    await new Promise(resolve => setTimeout(resolve, 4000));

    const updatedRuntime = getTenantRuntime(req.tenantId);

    res.json({
      success: true,
      sessionId: publicSessionId,
      hasQrCode: !!updatedRuntime.qrCodeData,
      qrCode: updatedRuntime.qrCodeData || null,
      message: updatedRuntime.qrCodeData ? 'QR Code gerado! Escaneie com o WhatsApp.' : 'Inicializando, aguarde...'
    });
  } catch (error) {
    console.error('❌ Erro ao conectar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para verificar status
router.get('/status', async (req, res) => {
  try {
    const { sock, isAuthenticated, qrCodeData, isInitializing, currentSessionId, authStateAdapter } = getTenantContext(req);
    let isConnected = false;
    let sessionInfo = null;

    if (sock) {
      try {
        isConnected = sock.user !== undefined;
      } catch (error) {
        isConnected = false;
      }
    }

    // Obter informações da sessão do banco
    if (authStateAdapter) {
      try {
        sessionInfo = await authStateAdapter.getSessionInfo();
      } catch (error) {
        console.error('❌ Erro ao obter info da sessão:', error);
      }
    }

    res.json({
      authenticated: isAuthenticated && isConnected,
      clientExists: !!sock,
      isConnected: isConnected,
      hasQrCode: !!qrCodeData,
      isInitializing: isInitializing,
      sessionId: currentSessionId,
      sessionInfo: sessionInfo,
      message: (isAuthenticated && isConnected) ? 'WhatsApp conectado' : 'WhatsApp desconectado'
    });

  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    res.status(500).json({
      error: true,
      message: 'Erro ao verificar status: ' + error.message
    });
  }
});

// Rota para resetar bloqueio e tentar nova conexão
router.post('/reset', async (req, res) => {
  try {
    const { runtime, currentSessionId } = getTenantContext(req);
    const storedSessionId = runtime.currentSessionId;

    await disconnectTenantRuntime(runtime);
    await new BaileysAuthStateAdapter(storedSessionId).resetSession();

    runtime.currentSessionId = storedSessionId;
    runtime.authStateAdapter = null;

    console.log(`🔄 Reset manual realizado para tenant ${req.tenantId}, sessão ${currentSessionId}`);
    res.json({ success: true, message: 'Reset realizado. Tente conectar novamente.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para desconectar
router.post('/disconnect', async (req, res) => {
  try {
    const { deleteSession = false } = req.body;
    const { runtime, currentSessionId } = getTenantContext(req);

    await disconnectTenantRuntime(runtime, { deleteSession });

    broadcast({
      type: 'status',
      tenantId: req.tenantId,
      status: 'disconnected',
      message: deleteSession ? 'Sessão removida' : 'Desconectado manualmente',
      sessionId: currentSessionId
    });

    res.json({
      success: true,
      message: deleteSession ? 'WhatsApp desconectado e sessão removida' : 'WhatsApp desconectado',
      sessionDeleted: deleteSession
    });

  } catch (error) {
    console.error('❌ Erro ao desconectar:', error);
    res.status(500).json({
      error: true,
      message: 'Erro ao desconectar: ' + error.message
    });
  }
});

// Rota para enviar mensagem
router.post('/send-message', async (req, res) => {
  try {
    const { phone, message } = req.body;
    const { sock, isAuthenticated } = getTenantContext(req);

    if (!isAuthenticated || !sock) {
      return res.status(400).json({
        error: true,
        message: 'WhatsApp não está conectado'
      });
    }

    if (!phone || !message) {
      return res.status(400).json({
        error: true,
        message: 'Telefone e mensagem são obrigatórios'
      });
    }

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      return res.status(400).json({
        error: true,
        message: 'Número de telefone inválido'
      });
    }

    console.log('📤 Enviando mensagem para:', formattedPhone);

    const result = await sock.sendMessage(formattedPhone, { text: message });

    res.json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      messageId: result.key.id
    });

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    res.status(500).json({
      error: true,
      message: 'Erro ao enviar mensagem: ' + error.message
    });
  }
});

// Rota para reiniciar cliente
router.post('/restart', async (req, res) => {
  try {
    const { runtime, currentSessionId } = getTenantContext(req);
    const storedSessionId = runtime.currentSessionId;

    console.log(`🔄 Reiniciando cliente WhatsApp do tenant ${req.tenantId}, sessão ${currentSessionId}...`);

    await disconnectTenantRuntime(runtime);

    // Delay maior para garantir liberação da sessão anterior
    await new Promise(resolve => setTimeout(resolve, 1000));
    await new BaileysAuthStateAdapter(storedSessionId).resetSession();

    runtime.currentSessionId = storedSessionId;

    // Inicializar novamente
    setTimeout(() => {
      initializeWhatsAppClient(req.tenantId, storedSessionId);
    }, 2000);

    res.json({
      success: true,
      message: 'Cliente reiniciado, aguarde alguns segundos...'
    });

  } catch (error) {
    console.error('❌ Erro ao reiniciar:', error);
    res.status(500).json({
      error: true,
      message: 'Erro ao reiniciar: ' + error.message
    });
  }
});

// ===== ROTAS DE NOTIFICAÇÃO =====

// Rota para notificar cliente cadastrado - ATUALIZADA PARA CORRESPONDENTES
router.post('/notificarClienteCadastrado', async (req, res) => {
  try {
    const { sock, isAuthenticated } = getTenantContext(req);
    const {
      clienteId,
      clienteNome,
      usuarioResponsavel,
      telefoneUsuarioResponsavel,
      nomeCorrespondente, // não será usado nesse novo formato
      cpfCliente,
      telefoneCliente,
      emailCliente,
      valorRenda,
      // Novos campos para ficha completa
      estado_civil,
      naturalidade,
      profissao,
      data_admissao,
      data_nascimento,
      renda_tipo,
      possui_carteira_mais_tres_anos,
      numero_pis,
      possui_dependente,
      status,
      possui_fiador,
      fiador_nome,
      fiador_cpf,
      fiador_telefone,
      fiador_email,
      possui_formularios_caixa,
      created_at
    } = req.body;

    console.log('📱 Notificação: Cliente cadastrado para usuário vinculado', {
      clienteId,
      clienteNome,
      usuarioResponsavel,
      telefoneUsuarioResponsavel
    });

    if (isAuthenticated && sock && telefoneUsuarioResponsavel) {
      // Montar ficha completa do cliente
      let ficha = `👤 *Nome:* ${clienteNome}\n` +
        `🆔 *ID:* ${clienteId}\n` +
        `📄 *CPF:* ${cpfCliente}\n` +
        `📞 *Telefone:* ${telefoneCliente}\n` +
        `📧 *Email:* ${emailCliente}\n` +
        (valorRenda ? `💰 *Renda:* ${valorRenda}\n` : '') +
        (estado_civil ? `💍 *Estado civil:* ${estado_civil}\n` : '') +
        (naturalidade ? `🌎 *Naturalidade:* ${naturalidade}\n` : '') +
        (profissao ? `💼 *Profissão:* ${profissao}\n` : '') +
        (data_admissao ? `📅 *Admissão:* ${data_admissao}\n` : '') +
        (data_nascimento ? `🎂 *Nascimento:* ${data_nascimento}\n` : '') +
        (renda_tipo ? `🏦 *Tipo de renda:* ${renda_tipo}\n` : '') +
        (possui_carteira_mais_tres_anos !== undefined ? `🪪 *Carteira +3 anos:* ${possui_carteira_mais_tres_anos ? 'Sim' : 'Não'}\n` : '') +
        (numero_pis ? `🔢 *PIS:* ${numero_pis}\n` : '') +
        (possui_dependente !== undefined ? `👶 *Possui dependente:* ${possui_dependente ? 'Sim' : 'Não'}\n` : '') +
        (status ? `📊 *Status:* ${status}\n` : '') +
        (possui_fiador !== undefined ? `🧑‍💼 *Possui fiador:* ${possui_fiador ? 'Sim' : 'Não'}\n` : '') +
        (fiador_nome ? `🧑‍💼 *Fiador:* ${fiador_nome}\n` : '') +
        (fiador_cpf ? `📄 *CPF Fiador:* ${fiador_cpf}\n` : '') +
        (fiador_telefone ? `📞 *Telefone Fiador:* ${fiador_telefone}\n` : '') +
        (fiador_email ? `📧 *Email Fiador:* ${fiador_email}\n` : '') +
        (possui_formularios_caixa !== undefined ? `📄 *Formulários Caixa:* ${possui_formularios_caixa ? 'Sim' : 'Não'}\n` : '') +
        (created_at ? `🕒 *Data de cadastro:* ${created_at}\n` : '');

      const mensagem = `Olá, o usuário *${usuarioResponsavel}* cadastrou o cliente *${clienteNome}* no CRM.\n\nSegue a ficha completa:\n\n${ficha}\n\n_Sistema CRM - Notificação Automática_`;

      const phoneFormatted = formatPhoneNumber(telefoneUsuarioResponsavel);
      if (phoneFormatted) {
        await sock.sendMessage(phoneFormatted, { text: mensagem });
        console.log('📤 Notificação enviada para usuário vinculado:', telefoneUsuarioResponsavel);
      } else {
        console.log('❌ Número inválido para usuário vinculado:', telefoneUsuarioResponsavel);
      }
    } else {
      console.log('❌ Condições não atendidas para usuário vinculado:', {
        isAuthenticated,
        sockExists: !!sock,
        telefoneExiste: !!telefoneUsuarioResponsavel
      });
    }

    res.json({ success: true, message: 'Notificação para usuário vinculado processada' });

  } catch (error) {
    console.error('❌ Erro ao notificar usuário vinculado:', error);
    res.status(500).json({ error: true, message: 'Erro ao processar notificação para usuário vinculado' });
  }
});

// Rota para notificar status alterado
router.post('/notificarStatusAlterado', async (req, res) => {
  try {
    const { sock, isAuthenticated } = getTenantContext(req);
    const { clienteId, clienteNome, statusAntigo, statusNovo, usuarioAlterou, telefoneUsuarioResponsavel } = req.body;
    
    console.log('📱 Notificação: Status alterado', { 
      clienteId, 
      clienteNome, 
      statusAntigo, 
      statusNovo,
      telefoneUsuarioResponsavel, // ✅ Valor real do telefone
      telefoneExiste: !!telefoneUsuarioResponsavel, // ✅ Corrigir: usar nome diferente
      isAuthenticated,
      sockExists: !!sock
    });
    
    if (isAuthenticated && sock && telefoneUsuarioResponsavel) {
      const mensagem = `🔄 *STATUS ALTERADO*\n\n` +
                      `👤 *Cliente:* ${clienteNome}\n` +
                      `🆔 *ID:* ${clienteId}\n` +
                      `📊 *De:* ${statusAntigo}\n` +
                      `📊 *Para:* ${statusNovo}\n` +
                      `👨‍💼 *Alterado por:* ${usuarioAlterou}\n` +
                      `📅 *Data:* ${new Date().toLocaleString('pt-BR')}\n\n` +
                      `_Sistema CRM - Notificação do seu cliente_`;
      
      const phoneFormatted = formatPhoneNumber(telefoneUsuarioResponsavel);
      if (phoneFormatted) {
        await sock.sendMessage(phoneFormatted, { text: mensagem });
        console.log('📤 Notificação enviada para usuário responsável:', telefoneUsuarioResponsavel);
      }
    } else {
      console.log('❌ Condições não atendidas:', {
        isAuthenticated,
        sockExists: !!sock,
        telefoneExiste: !!telefoneUsuarioResponsavel // ✅ Usar nome consistente
      });
    }
    
    res.json({ success: true, message: 'Notificação processada' });
    
  } catch (error) {
    console.error('❌ Erro ao notificar status alterado:', error);
    res.status(500).json({ error: true, message: 'Erro ao processar notificação' });
  }
});

// Nova rota para notificar sobre nota adicionada
router.post('/notificarNotaAdicionada', async (req, res) => {
    try {
      const { sock, isAuthenticated } = getTenantContext(req);
        const { 
            clienteId, 
            clienteNome, 
            notaTexto, 
            usuarioAdicionou, 
            prioridade, 
            telefoneUsuarioResponsavel 
        } = req.body;

        console.log('📨 Dados recebidos para notificação WhatsApp:', {
            clienteId,
            clienteNome,
            notaTexto,
            usuarioAdicionou,
            prioridade,
            telefoneUsuarioResponsavel
        });

        // Verificar se o telefone está presente
        if (!telefoneUsuarioResponsavel) {
            console.log('❌ Telefone não informado');
            return res.status(400).json({ 
                success: false, 
                error: 'Telefone do usuário responsável não informado' 
            });
        }

        // Montar a mensagem
        const prioridadeEmoji = prioridade === 'alta' ? '🚨' : '📝';
        const mensagem = `${prioridadeEmoji} *NOVA NOTA ADICIONADA*

👤 *Cliente:* ${clienteNome}
📋 *Nota:* ${notaTexto}
✍️ *Adicionada por:* ${usuarioAdicionou}
⏰ *Data:* ${new Date().toLocaleString('pt-BR')}

${prioridade === 'alta' ? '⚠️ *PRIORIDADE ALTA*' : ''}

_Sistema CRM CAIXA_`;

        // ✅ VERIFICAR SE O CLIENTE BAILEYS ESTÁ CONECTADO (USAR 'sock' EM VEZ DE 'client')
        if (!sock) {
            console.log('❌ Cliente WhatsApp (sock) não está conectado');
            return res.status(503).json({ 
                success: false, 
                error: 'Cliente WhatsApp não está conectado' 
            });
        }

        // ✅ VERIFICAR SE ESTÁ AUTENTICADO
        if (!isAuthenticated) {
            console.log('❌ WhatsApp não está autenticado');
            return res.status(503).json({ 
                success: false, 
                error: 'WhatsApp não está autenticado' 
            });
        }

        // ✅ USAR A FUNÇÃO formatPhoneNumber DO PRÓPRIO ARQUIVO
        const phoneFormatted = formatPhoneNumber(telefoneUsuarioResponsavel);
        if (!phoneFormatted) {
            console.log('❌ Número de telefone inválido:', telefoneUsuarioResponsavel);
            return res.status(400).json({ 
                success: false, 
                error: 'Número de telefone inválido' 
            });
        }

        console.log('📤 Enviando mensagem para:', phoneFormatted);


        // ✅ ENVIAR A MENSAGEM USANDO BAILEYS (sock)
        const result = await sock.sendMessage(phoneFormatted, { text: mensagem });

        // Emitir evento socket para notificação de nota adicionada
        try {
            const { getSocketIO } = require('../socket');
            getSocketIO().emit('whatsapp-nota-adicionada', {
            tenantId: req.tenantId,
                clienteId,
                clienteNome,
                notaTexto,
                usuarioAdicionou,
                prioridade,
                telefoneUsuarioResponsavel
            });
        } catch (e) {
            console.warn('Socket.IO não inicializado:', e.message);
        }

        console.log('✅ Notificação enviada com sucesso para:', telefoneUsuarioResponsavel);

        res.json({ 
            success: true, 
            message: 'Notificação enviada com sucesso',
            telefone: telefoneUsuarioResponsavel,
            cliente: clienteNome,
            messageId: result.key.id
        });

    } catch (error) {
        console.error('❌ Erro ao enviar notificação WhatsApp:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: 'Erro interno do servidor ao enviar WhatsApp'
        });
    }
});

// Rota para notificar notas concluídas
router.post('/notificarNotasConcluidas', async (req, res) => {
  try {
    const { sock, isAuthenticated } = getTenantContext(req);
    const { clienteId, clienteNome, totalNotas, telefoneUsuarioResponsavel } = req.body;
    
    console.log('📱 Notificação: Notas concluídas', { clienteId, clienteNome, totalNotas });
    
    if (isAuthenticated && sock && telefoneUsuarioResponsavel) {
      const mensagem = `✅ *NOTAS CONCLUÍDAS*\n\n` +
                      `👤 *Cliente:* ${clienteNome}\n` +
                      `🆔 *ID:* ${clienteId}\n` +
                      `📊 *Total concluídas:* ${totalNotas}\n` +
                      `📅 *Data:* ${new Date().toLocaleString('pt-BR')}\n\n` +
                      `_Sistema CRM - Notificação do seu cliente_`;
      
      const phoneFormatted = formatPhoneNumber(telefoneUsuarioResponsavel);
      if (phoneFormatted) {
        await sock.sendMessage(phoneFormatted, { text: mensagem });
        console.log('📤 Notificação enviada para usuário responsável:', telefoneUsuarioResponsavel);
      }
    }
    
    res.json({ success: true, message: 'Notificação processada' });
    
  } catch (error) {
    console.error('❌ Erro ao notificar notas concluídas:', error);
    res.status(500).json({ error: true, message: 'Erro ao processar notificação' });
  }
});

// Nova rota para notificar correspondentes sobre nota concluída
router.post('/notificarCorrespondentesNotaConcluida', async (req, res) => {
    try {
      const { sock, isAuthenticated } = getTenantContext(req);
        const { 
            clienteId, 
            clienteNome, 
            notaTexto, 
            notaId,
            usuarioConcluiu,
            acao
        } = req.body;

        console.log('📨 Notificação de conclusão recebida:', {
            clienteId,
            clienteNome,
            notaTexto,
            notaId,
            usuarioConcluiu,
            acao
        });

        // ✅ VERIFICAR SE O CLIENTE BAILEYS ESTÁ CONECTADO
        if (!sock) {
            console.log('❌ Cliente WhatsApp (sock) não está conectado');
            return res.status(503).json({ 
                success: false, 
                error: 'Cliente WhatsApp não está conectado' 
            });
        }

        // ✅ VERIFICAR SE ESTÁ AUTENTICADO
        if (!isAuthenticated) {
            console.log('❌ WhatsApp não está autenticado');
            return res.status(503).json({ 
                success: false, 
                error: 'WhatsApp não está autenticado' 
            });
        }

        // 🔍 BUSCAR TODOS OS CORRESPONDENTES ATIVOS USANDO AS COLUNAS CORRETAS
        const { User } = require('../models');
        
        const correspondentes = await User.findAll({
            where: {
            tenant_id: req.tenantId,
                is_correspondente: true // ✅ USAR is_correspondente EM VEZ DE role
            },
            attributes: ['id', 'first_name', 'last_name', 'telefone']
        });

        console.log(`📋 ${correspondentes.length} correspondentes encontrados`);

        if (correspondentes.length === 0) {
            return res.json({ 
                success: true, 
                message: 'Nenhum correspondente encontrado para notificar',
                enviadas: 0
            });
        }

        // 📱 MONTAR A MENSAGEM
        const mensagem = `✅ *NOTA CONCLUÍDA*

👤 *Cliente:* ${clienteNome}
📋 *Nota:* ${notaTexto}
✍️ *Concluída por:* ${usuarioConcluiu}
⏰ *Data:* ${new Date().toLocaleString('pt-BR')}
📝 *ID da Nota:* ${notaId}

🎉 *Status: CONCLUÍDA*

_Sistema CRM CAIXA_`;

        let enviadasComSucesso = 0;
        let errosEnvio = 0;

        // 📤 ENVIAR PARA CADA CORRESPONDENTE
        for (const correspondente of correspondentes) {
            try {
                const telefone = correspondente.telefone;
                
                if (!telefone) {
                    console.log(`⚠️ Correspondente ${correspondente.first_name} sem telefone`);
                    continue;
                }

                const phoneFormatted = formatPhoneNumber(telefone);
                if (!phoneFormatted) {
                    console.log(`❌ Telefone inválido para ${correspondente.first_name}: ${telefone}`);
                    continue;
                }

                console.log(`📤 Enviando para ${correspondente.first_name} ${correspondente.last_name}: ${phoneFormatted}`);

                await sock.sendMessage(phoneFormatted, { text: mensagem });
                
                enviadasComSucesso++;
                console.log(`✅ Notificação enviada para ${correspondente.first_name}`);

                // Pequeno delay entre envios para evitar spam
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (envioError) {
                console.error(`❌ Erro ao enviar para ${correspondente.first_name}:`, envioError.message);
                errosEnvio++;
            }
        }

        console.log(`📊 Resultado: ${enviadasComSucesso} enviadas, ${errosEnvio} erros`);

        res.json({ 
            success: true, 
            message: `Notificações processadas para ${correspondentes.length} correspondentes`,
            total: correspondentes.length,
            enviadas: enviadasComSucesso,
            erros: errosEnvio,
            cliente: clienteNome,
            acao: 'NOTA_CONCLUIDA'
        });

    } catch (error) {
        console.error('❌ Erro ao notificar correspondentes:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: 'Erro interno do servidor ao enviar notificações'
        });
    }
});

// ✅ NOVA ROTA PARA ENVIAR PAGAMENTO DIRETAMENTE PARA O CLIENTE
router.post('/enviar-pagamento', async (req, res) => {
  try {
    const { sock, isAuthenticated } = getTenantContext(req);
    const { telefone, clienteNome, pagamento } = req.body;

    console.log('💳 Enviando pagamento via WhatsApp:', {
      telefone,
      clienteNome,
      pagamento_id: pagamento.id,
      tipo: pagamento.tipo,
      valor: pagamento.valor
    });

    if (!isAuthenticated || !sock) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp não está conectado'
      });
    }

    if (!telefone || !clienteNome || !pagamento) {
      return res.status(400).json({
        success: false,
        error: 'Dados obrigatórios: telefone, clienteNome e pagamento'
      });
    }

    const formattedPhone = formatPhoneNumber(telefone);
    if (!formattedPhone) {
      return res.status(400).json({
        success: false,
        error: 'Número de telefone inválido',
        telefone_original: telefone
      });
    }

    // ✅ CRIAR MENSAGEM PERSONALIZADA PARA O CLIENTE
    const tipoEmoji = pagamento.tipo === 'pix' ? '⚡' : '🎫';
    const tipoTexto = pagamento.tipo === 'pix' ? 'PIX' : 'BOLETO';
    
    let mensagem = `${tipoEmoji} *${tipoTexto} DISPONÍVEL*\n\n`;
    mensagem += `👋 Olá *${clienteNome}*!\n\n`;
    mensagem += `Seu ${tipoTexto.toLowerCase()} está pronto para pagamento:\n\n`;
    mensagem += `📄 *Descrição:* ${pagamento.titulo}\n`;
    
    if (pagamento.descricao) {
      mensagem += `📋 *Detalhes:* ${pagamento.descricao}\n`;
    }
    
    mensagem += `💰 *Valor:* R$ ${pagamento.valor}\n`;
    
    if (pagamento.parcelas > 1) {
      mensagem += `📊 *Parcelas:* ${pagamento.parcelas}x de R$ ${pagamento.valor_parcela}\n`;
    }
    
    if (pagamento.tipo === 'pix') {
      const agora = new Date();
      const vencimento = new Date(pagamento.data_vencimento);
      const minutosRestantes = Math.floor((vencimento - agora) / (1000 * 60));
      mensagem += `⏰ *Válido por:* ${minutosRestantes} minutos\n`;
    } else {
      const dataVencimento = new Date(pagamento.data_vencimento);
      mensagem += `📅 *Vencimento:* ${dataVencimento.toLocaleDateString('pt-BR')}\n`;
    }
    
    mensagem += `🆔 *ID:* #${pagamento.id}\n\n`;
    
    mensagem += `🔗 *Clique aqui para pagar:*\n${pagamento.link_pagamento}\n\n`;
    
    if (pagamento.tipo === 'pix') {
      mensagem += `⚡ *PIX - Pagamento instantâneo*\n`;
      mensagem += `💳 _Aprovação imediata após pagamento_\n\n`;
    } else {
      mensagem += `🎫 *BOLETO BANCÁRIO*\n`;
      mensagem += `🏦 _Pode ser pago em qualquer banco_\n`;
      mensagem += `📱 _Ou pelo aplicativo do seu banco_\n\n`;
    }
    
    const EMPRESA_NOME = process.env.EMPRESA_NOME || 'Sistema CRM CAIXA';
    mensagem += `_${EMPRESA_NOME}_\n`;
    mensagem += `_📞 Dúvidas? Entre em contato conosco_`;

    console.log('📱 Enviando mensagem para:', formattedPhone);
    console.log('📝 Conteúdo da mensagem:', mensagem.substring(0, 100) + '...');

    const result = await sock.sendMessage(formattedPhone, { text: mensagem });

    console.log('✅ Pagamento enviado via WhatsApp com sucesso!');

    res.json({
      success: true,
      message: 'Pagamento enviado via WhatsApp com sucesso',
      messageId: result.key.id,
      telefone_formatado: formattedPhone,
      telefone_original: telefone,
      cliente: clienteNome,
      pagamento_id: pagamento.id,
      tipo: pagamento.tipo
    });

  } catch (error) {
    console.error('❌ Erro ao enviar pagamento via WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao enviar pagamento via WhatsApp',
      details: error.message
    });
  }
});

// ✅ ROTA PARA REENVIAR PAGAMENTO PARA CLIENTE
router.post('/reenviar-pagamento/:pagamentoId', async (req, res) => {
  try {
    const { sock, isAuthenticated } = getTenantContext(req);
    const { pagamentoId } = req.params;

    if (!isAuthenticated || !sock) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp não está conectado'
      });
    }

    // Buscar pagamento no banco
    const { Pagamento, Cliente } = require('../models');
    
    const pagamento = await Pagamento.findOne({
      where: {
        id: pagamentoId,
        tenant_id: req.tenantId
      },
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'telefone', 'email']
        }
      ]
    });

    if (!pagamento) {
      return res.status(404).json({
        success: false,
        error: 'Pagamento não encontrado'
      });
    }

    if (!pagamento.cliente.telefone) {
      return res.status(400).json({
        success: false,
        error: 'Cliente não possui telefone cadastrado'
      });
    }

    // Usar a rota de envio de pagamento
    const resultadoEnvio = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/api/whatsapp/enviar-pagamento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': String(req.tenantId)
      },
      body: JSON.stringify({
        telefone: pagamento.cliente.telefone,
        clienteNome: pagamento.cliente.nome,
        pagamento: {
          id: pagamento.id,
          tipo: pagamento.tipo,
          titulo: pagamento.titulo,
          descricao: pagamento.descricao,
          valor: pagamento.valor,
          parcelas: pagamento.parcelas,
          valor_parcela: pagamento.valor_parcelas,
          data_vencimento: pagamento.data_vencimento,
          link_pagamento: pagamento.link_pagamento
        }
      })
    });

    const resultado = await resultadoEnvio.json();

    if (resultado.success) {
      // Atualizar data de reenvio
      await pagamento.update({
        whatsapp_enviado: true,
        data_envio_whatsapp: new Date()
      });
    }

    res.json({
      success: resultado.success,
      message: resultado.success ? 'Pagamento reenviado com sucesso' : 'Erro ao reenviar pagamento',
      resultado
    });

  } catch (error) {
    console.error('❌ Erro ao reenviar pagamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// ===== NOVAS ROTAS PARA GERENCIAMENTO DE SESSÕES VIA BANCO =====

// Rota para criar nova sessão
router.post('/session/create', async (req, res) => {
  try {
    const { sessionId, forceCreate = false } = req.body;
    const runtime = getTenantRuntime(req.tenantId);
    
    if (!sessionId || sessionId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'ID da sessão é obrigatório'
      });
    }

    const previousSession = getCurrentPublicSessionId(req.tenantId, runtime);
    const { publicSessionId, storedSessionId } = getRequestSessionIds(req, sessionId);

    // Verificar se sessão já existe
    const sessionExists = await WhatsAppSessionService.sessionExists(storedSessionId);
    
    if (sessionExists && !forceCreate) {
      return res.status(409).json({
        success: false,
        error: 'Sessão já existe',
        sessionId: publicSessionId,
        suggestion: 'Use forceCreate=true para sobrescrever'
      });
    }

    // Criar a sessão
    const created = await WhatsAppSessionService.createSession(storedSessionId, forceCreate);
    
    if (!created) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar sessão'
      });
    }

    // Se não é a sessão atual, pode inicializar imediatamente
    // Se é a sessão atual, desconectar primeiro
    if (runtime.currentSessionId !== storedSessionId) {
      if (runtime.sock) {
        console.log(`🔄 Trocando sessão do tenant ${req.tenantId} de ${previousSession} para ${publicSessionId}`);
      }

      await disconnectTenantRuntime(runtime);

      // Inicializar nova sessão
      setTimeout(() => {
        initializeWhatsAppClient(req.tenantId, storedSessionId);
      }, 1000);
    }

    res.json({
      success: true,
      message: 'Nova sessão criada com sucesso',
      sessionId: publicSessionId,
      previousSession
    });

  } catch (error) {
    console.error('❌ Erro ao criar sessão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar sessão',
      details: error.message
    });
  }
});

// Rota para deletar sessão
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { force = false } = req.query;
    const runtime = getTenantRuntime(req.tenantId);

    if (!sessionId || sessionId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'ID da sessão é obrigatório'
      });
    }

    const { publicSessionId, storedSessionId } = getRequestSessionIds(req, sessionId);
    const wasActive = storedSessionId === runtime.currentSessionId;

    // Verificar se é a sessão ativa
    if (wasActive && runtime.sock) {
      if (!force) {
        return res.status(409).json({
          success: false,
          error: 'Não é possível deletar sessão ativa',
          suggestion: 'Use force=true para forçar remoção ou desconecte primeiro',
          sessionId: publicSessionId
        });
      }

      // Forçar desconexão da sessão ativa
      console.log(`🔌 Forçando desconexão da sessão ativa do tenant ${req.tenantId}: ${publicSessionId}`);
      await disconnectTenantRuntime(runtime);
    }

    // Deletar sessão
    const deleted = await WhatsAppSessionService.deleteSession(storedSessionId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada',
        sessionId: publicSessionId
      });
    }

    if (wasActive) {
      runtime.currentSessionId = buildStoredSessionId(req.tenantId, DEFAULT_SESSION_ID);
      runtime.authStateAdapter = null;
    }

    broadcast({
      type: 'sessionDeleted',
      tenantId: req.tenantId,
      sessionId: publicSessionId,
      message: 'Sessão removida'
    });

    res.json({
      success: true,
      message: 'Sessão deletada com sucesso',
      sessionId: publicSessionId,
      wasActive
    });

  } catch (error) {
    console.error('❌ Erro ao deletar sessão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar sessão',
      details: error.message
    });
  }
});

// Rota para listar todas as sessões
router.get('/sessions', async (req, res) => {
  try {
    const runtime = getTenantRuntime(req.tenantId);
    const prefix = getTenantSessionPrefix(req.tenantId);
    const sessions = (await WhatsAppSessionService.listSessions())
      .filter((session) => session.id.startsWith(prefix))
      .map((session) => ({
        ...session,
        id: toPublicSessionId(req.tenantId, session.id),
        isActive: session.id === runtime.currentSessionId,
        isConnected: session.id === runtime.currentSessionId && runtime.isAuthenticated
      }));

    res.json({
      success: true,
      sessions,
      currentSession: getCurrentPublicSessionId(req.tenantId, runtime),
      totalSessions: sessions.length
    });

  } catch (error) {
    console.error('❌ Erro ao listar sessões:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar sessões',
      details: error.message
    });
  }
});

// Rota para trocar sessão ativa
router.post('/session/switch', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const runtime = getTenantRuntime(req.tenantId);

    if (!sessionId || sessionId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'ID da sessão é obrigatório'
      });
    }

    const previousSession = getCurrentPublicSessionId(req.tenantId, runtime);
    const { publicSessionId, storedSessionId } = getRequestSessionIds(req, sessionId);

    // Verificar se sessão existe
    const sessionExists = await WhatsAppSessionService.sessionExists(storedSessionId);
    
    if (!sessionExists) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada',
        sessionId: publicSessionId
      });
    }

    // Se já é a sessão ativa, não fazer nada
    if (storedSessionId === runtime.currentSessionId) {
      return res.json({
        success: true,
        message: 'Sessão já está ativa',
        sessionId: publicSessionId
      });
    }

    // Desconectar sessão atual
    console.log(`🔄 Trocando sessão do tenant ${req.tenantId} de ${previousSession} para ${publicSessionId}`);
    await disconnectTenantRuntime(runtime);

    // Inicializar nova sessão
    setTimeout(() => {
      initializeWhatsAppClient(req.tenantId, storedSessionId);
    }, 1000);

    res.json({
      success: true,
      message: 'Trocando para nova sessão',
      sessionId: publicSessionId,
      previousSession
    });

  } catch (error) {
    console.error('❌ Erro ao trocar sessão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao trocar sessão',
      details: error.message
    });
  }
});

// Rota para resetar sessão (limpar dados corrompidos)
router.post('/session/reset/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const runtime = getTenantRuntime(req.tenantId);

    if (!sessionId || sessionId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'ID da sessão é obrigatório'
      });
    }

    const { publicSessionId, storedSessionId } = getRequestSessionIds(req, sessionId);
    const wasActive = storedSessionId === runtime.currentSessionId;

    // Se é a sessão ativa, desconectar primeiro
    if (wasActive && runtime.sock) {
      console.log(`🔌 Desconectando sessão ativa do tenant ${req.tenantId} para reset: ${publicSessionId}`);
      await disconnectTenantRuntime(runtime);
    }

    // Reset da sessão
    await WhatsAppSessionService.resetSession(storedSessionId);

    if (wasActive) {
      runtime.currentSessionId = storedSessionId;
      runtime.authStateAdapter = null;
    }

    // Se era a sessão ativa, reinicializar
    if (wasActive) {
      setTimeout(() => {
        initializeWhatsAppClient(req.tenantId, storedSessionId);
      }, 1000);
    }

    res.json({
      success: true,
      message: 'Sessão resetada com sucesso',
      sessionId: publicSessionId,
      wasActive
    });

  } catch (error) {
    console.error('❌ Erro ao resetar sessão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao resetar sessão',
      details: error.message
    });
  }
});

// Rota para limpar sessões antigas
router.post('/sessions/cleanup', async (req, res) => {
  try {
    const prefix = getTenantSessionPrefix(req.tenantId);
    const sessions = (await WhatsAppSessionService.listSessions()).filter((session) => session.id.startsWith(prefix));
    const thirtyDaysAgo = new Date();
    let deletedCount = 0;

    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const session of sessions) {
      const lastActivity = new Date(session.updatedAt || session.createdAt);
      if (lastActivity < thirtyDaysAgo) {
        const del = await WhatsAppSessionService.deleteSession(session.id);
        if (del) {
          deletedCount += 1;
        }
      }
    }

    res.json({
      success: true,
      message: `${deletedCount} sessões antigas removidas`,
      deletedCount
    });

  } catch (error) {
    console.error('❌ Erro ao limpar sessões:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao limpar sessões antigas',
      details: error.message
    });
  }
});

// Rota para obter informações detalhadas de uma sessão
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const runtime = getTenantRuntime(req.tenantId);

    if (!sessionId || sessionId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'ID da sessão é obrigatório'
      });
    }

    const { publicSessionId, storedSessionId } = getRequestSessionIds(req, sessionId);
    const sessionInfo = await WhatsAppSessionService.getSessionInfo(storedSessionId);

    if (!sessionInfo) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada',
        sessionId: publicSessionId
      });
    }

    res.json({
      success: true,
      sessionInfo: {
        ...sessionInfo,
        id: publicSessionId,
        isActive: storedSessionId === runtime.currentSessionId,
        isConnected: storedSessionId === runtime.currentSessionId && runtime.isAuthenticated
      }
    });

  } catch (error) {
    console.error('❌ Erro ao obter info da sessão:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao obter informações da sessão',
      details: error.message
    });
  }
});

// Inicialização automática removida no modo multi-tenant.
// Cada organização inicia a própria sessão ao acessar a tela e clicar em conectar.

// Rota para notificar cliente cadastrado - ATUALIZADA PARA CORRESPONDENTES
router.post('/notificarClienteCadastrado', async (req, res) => {
  try {
    const {
      clienteId,
      clienteNome,
      usuarioResponsavel,
      telefoneUsuarioResponsavel,
      nomeCorrespondente, // não será usado nesse novo formato
      cpfCliente,
      telefoneCliente,
      emailCliente,
      valorRenda,
      // Novos campos para ficha completa
      estado_civil,
      naturalidade,
      profissao,
      data_admissao,
      data_nascimento,
      renda_tipo,
      possui_carteira_mais_tres_anos,
      numero_pis,
      possui_dependente,
      status,
      possui_fiador,
      fiador_nome,
      fiador_cpf,
      fiador_telefone,
      fiador_email,
      possui_formularios_caixa,
      created_at
    } = req.body;

    console.log('📱 Notificação: Cliente cadastrado para usuário vinculado', {
      clienteId,
      clienteNome,
      usuarioResponsavel,
      telefoneUsuarioResponsavel
    });

    if (isAuthenticated && sock && telefoneUsuarioResponsavel) {
      // Montar ficha completa do cliente
      let ficha = `👤 *Nome:* ${clienteNome}\n` +
        `🆔 *ID:* ${clienteId}\n` +
        `📄 *CPF:* ${cpfCliente}\n` +
        `📞 *Telefone:* ${telefoneCliente}\n` +
        `📧 *Email:* ${emailCliente}\n` +
        (valorRenda ? `💰 *Renda:* ${valorRenda}\n` : '') +
        (estado_civil ? `💍 *Estado civil:* ${estado_civil}\n` : '') +
        (naturalidade ? `🌎 *Naturalidade:* ${naturalidade}\n` : '') +
        (profissao ? `💼 *Profissão:* ${profissao}\n` : '') +
        (data_admissao ? `📅 *Admissão:* ${data_admissao}\n` : '') +
        (data_nascimento ? `🎂 *Nascimento:* ${data_nascimento}\n` : '') +
        (renda_tipo ? `🏦 *Tipo de renda:* ${renda_tipo}\n` : '') +
        (possui_carteira_mais_tres_anos !== undefined ? `🪪 *Carteira +3 anos:* ${possui_carteira_mais_tres_anos ? 'Sim' : 'Não'}\n` : '') +
        (numero_pis ? `🔢 *PIS:* ${numero_pis}\n` : '') +
        (possui_dependente !== undefined ? `👶 *Possui dependente:* ${possui_dependente ? 'Sim' : 'Não'}\n` : '') +
        (status ? `📊 *Status:* ${status}\n` : '') +
        (possui_fiador !== undefined ? `🧑‍💼 *Possui fiador:* ${possui_fiador ? 'Sim' : 'Não'}\n` : '') +
        (fiador_nome ? `🧑‍💼 *Fiador:* ${fiador_nome}\n` : '') +
        (fiador_cpf ? `📄 *CPF Fiador:* ${fiador_cpf}\n` : '') +
        (fiador_telefone ? `📞 *Telefone Fiador:* ${fiador_telefone}\n` : '') +
        (fiador_email ? `📧 *Email Fiador:* ${fiador_email}\n` : '') +
        (possui_formularios_caixa !== undefined ? `📄 *Formulários Caixa:* ${possui_formularios_caixa ? 'Sim' : 'Não'}\n` : '') +
        (created_at ? `🕒 *Data de cadastro:* ${created_at}\n` : '');

      const mensagem = `Olá, o usuário *${usuarioResponsavel}* cadastrou o cliente *${clienteNome}* no CRM.\n\nSegue a ficha completa:\n\n${ficha}\n\n_Sistema CRM - Notificação Automática_`;

      const phoneFormatted = formatPhoneNumber(telefoneUsuarioResponsavel);
      if (phoneFormatted) {
        await sock.sendMessage(phoneFormatted, { text: mensagem });
        console.log('📤 Notificação enviada para usuário vinculado:', telefoneUsuarioResponsavel);
      } else {
        console.log('❌ Número inválido para usuário vinculado:', telefoneUsuarioResponsavel);
      }
    } else {
      console.log('❌ Condições não atendidas para usuário vinculado:', {
        isAuthenticated,
        sockExists: !!sock,
        telefoneExiste: !!telefoneUsuarioResponsavel
      });
    }

    res.json({ success: true, message: 'Notificação para usuário vinculado processada' });

  } catch (error) {
    console.error('❌ Erro ao notificar usuário vinculado:', error);
    res.status(500).json({ error: true, message: 'Erro ao processar notificação para usuário vinculado' });
  }
});

// Rota para notificar status alterado
router.post('/notificarStatusAlterado', async (req, res) => {
  try {
    const { clienteId, clienteNome, statusAntigo, statusNovo, usuarioAlterou, telefoneUsuarioResponsavel } = req.body;
    
    console.log('📱 Notificação: Status alterado', { 
      clienteId, 
      clienteNome, 
      statusAntigo, 
      statusNovo,
      telefoneUsuarioResponsavel, // ✅ Valor real do telefone
      telefoneExiste: !!telefoneUsuarioResponsavel, // ✅ Corrigir: usar nome diferente
      isAuthenticated,
      sockExists: !!sock
    });
    
    if (isAuthenticated && sock && telefoneUsuarioResponsavel) {
      const mensagem = `🔄 *STATUS ALTERADO*\n\n` +
                      `👤 *Cliente:* ${clienteNome}\n` +
                      `🆔 *ID:* ${clienteId}\n` +
                      `📊 *De:* ${statusAntigo}\n` +
                      `📊 *Para:* ${statusNovo}\n` +
                      `👨‍💼 *Alterado por:* ${usuarioAlterou}\n` +
                      `📅 *Data:* ${new Date().toLocaleString('pt-BR')}\n\n` +
                      `_Sistema CRM - Notificação do seu cliente_`;
      
      const phoneFormatted = formatPhoneNumber(telefoneUsuarioResponsavel);
      if (phoneFormatted) {
        await sock.sendMessage(phoneFormatted, { text: mensagem });
        console.log('📤 Notificação enviada para usuário responsável:', telefoneUsuarioResponsavel);
      }
    } else {
      console.log('❌ Condições não atendidas:', {
        isAuthenticated,
        sockExists: !!sock,
        telefoneExiste: !!telefoneUsuarioResponsavel // ✅ Usar nome consistente
      });
    }
    
    res.json({ success: true, message: 'Notificação processada' });
    
  } catch (error) {
    console.error('❌ Erro ao notificar status alterado:', error);
    res.status(500).json({ error: true, message: 'Erro ao processar notificação' });
  }
});

// Nova rota para notificar sobre nota adicionada
router.post('/notificarNotaAdicionada', async (req, res) => {
    try {
        const { 
            clienteId, 
            clienteNome, 
            notaTexto, 
            usuarioAdicionou, 
            prioridade, 
            telefoneUsuarioResponsavel 
        } = req.body;

        console.log('📨 Dados recebidos para notificação WhatsApp:', {
            clienteId,
            clienteNome,
            notaTexto,
            usuarioAdicionou,
            prioridade,
            telefoneUsuarioResponsavel
        });

        // Verificar se o telefone está presente
        if (!telefoneUsuarioResponsavel) {
            console.log('❌ Telefone não informado');
            return res.status(400).json({ 
                success: false, 
                error: 'Telefone do usuário responsável não informado' 
            });
        }

        // Montar a mensagem
        const prioridadeEmoji = prioridade === 'alta' ? '🚨' : '📝';
        const mensagem = `${prioridadeEmoji} *NOVA NOTA ADICIONADA*

👤 *Cliente:* ${clienteNome}
📋 *Nota:* ${notaTexto}
✍️ *Adicionada por:* ${usuarioAdicionou}
⏰ *Data:* ${new Date().toLocaleString('pt-BR')}

${prioridade === 'alta' ? '⚠️ *PRIORIDADE ALTA*' : ''}

_Sistema CRM CAIXA_`;

        // ✅ VERIFICAR SE O CLIENTE BAILEYS ESTÁ CONECTADO (USAR 'sock' EM VEZ DE 'client')
        if (!sock) {
            console.log('❌ Cliente WhatsApp (sock) não está conectado');
            return res.status(503).json({ 
                success: false, 
                error: 'Cliente WhatsApp não está conectado' 
            });
        }

        // ✅ VERIFICAR SE ESTÁ AUTENTICADO
        if (!isAuthenticated) {
            console.log('❌ WhatsApp não está autenticado');
            return res.status(503).json({ 
                success: false, 
                error: 'WhatsApp não está autenticado' 
            });
        }

        // ✅ USAR A FUNÇÃO formatPhoneNumber DO PRÓPRIO ARQUIVO
        const phoneFormatted = formatPhoneNumber(telefoneUsuarioResponsavel);
        if (!phoneFormatted) {
            console.log('❌ Número de telefone inválido:', telefoneUsuarioResponsavel);
            return res.status(400).json({ 
                success: false, 
                error: 'Número de telefone inválido' 
            });
        }

        console.log('📤 Enviando mensagem para:', phoneFormatted);

        // ✅ ENVIAR A MENSAGEM USANDO BAILEYS (sock)
        const result = await sock.sendMessage(phoneFormatted, { text: mensagem });

        console.log('✅ Notificação enviada com sucesso para:', telefoneUsuarioResponsavel);

        res.json({ 
            success: true, 
            message: 'Notificação enviada com sucesso',
            telefone: telefoneUsuarioResponsavel,
            cliente: clienteNome,
            messageId: result.key.id
        });

    } catch (error) {
        console.error('❌ Erro ao enviar notificação WhatsApp:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: 'Erro interno do servidor ao enviar WhatsApp'
        });
    }
});

// Rota para notificar notas concluídas
router.post('/notificarNotasConcluidas', async (req, res) => {
  try {
    const { clienteId, clienteNome, totalNotas, telefoneUsuarioResponsavel } = req.body;
    
    console.log('📱 Notificação: Notas concluídas', { clienteId, clienteNome, totalNotas });
    
    if (isAuthenticated && sock && telefoneUsuarioResponsavel) {
      const mensagem = `✅ *NOTAS CONCLUÍDAS*\n\n` +
                      `👤 *Cliente:* ${clienteNome}\n` +
                      `🆔 *ID:* ${clienteId}\n` +
                      `📊 *Total concluídas:* ${totalNotas}\n` +
                      `📅 *Data:* ${new Date().toLocaleString('pt-BR')}\n\n` +
                      `_Sistema CRM - Notificação do seu cliente_`;
      
      const phoneFormatted = formatPhoneNumber(telefoneUsuarioResponsavel);
      if (phoneFormatted) {
        await sock.sendMessage(phoneFormatted, { text: mensagem });
        console.log('📤 Notificação enviada para usuário responsável:', telefoneUsuarioResponsavel);
      }
    }
    
    res.json({ success: true, message: 'Notificação processada' });
    
  } catch (error) {
    console.error('❌ Erro ao notificar notas concluídas:', error);
    res.status(500).json({ error: true, message: 'Erro ao processar notificação' });
  }
});

// Nova rota para notificar correspondentes sobre nota concluída
router.post('/notificarCorrespondentesNotaConcluida', async (req, res) => {
    try {
        const { 
            clienteId, 
            clienteNome, 
            notaTexto, 
            notaId,
            usuarioConcluiu,
            acao
        } = req.body;

        console.log('📨 Notificação de conclusão recebida:', {
            clienteId,
            clienteNome,
            notaTexto,
            notaId,
            usuarioConcluiu,
            acao
        });

        // ✅ VERIFICAR SE O CLIENTE BAILEYS ESTÁ CONECTADO
        if (!sock) {
            console.log('❌ Cliente WhatsApp (sock) não está conectado');
            return res.status(503).json({ 
                success: false, 
                error: 'Cliente WhatsApp não está conectado' 
            });
        }

        // ✅ VERIFICAR SE ESTÁ AUTENTICADO
        if (!isAuthenticated) {
            console.log('❌ WhatsApp não está autenticado');
            return res.status(503).json({ 
                success: false, 
                error: 'WhatsApp não está autenticado' 
            });
        }

        // 🔍 BUSCAR TODOS OS CORRESPONDENTES ATIVOS USANDO AS COLUNAS CORRETAS
        const { User } = require('../models');
        
        const correspondentes = await User.findAll({
            where: {
                is_correspondente: true // ✅ USAR is_correspondente EM VEZ DE role
            },
            attributes: ['id', 'first_name', 'last_name', 'telefone']
        });

        console.log(`📋 ${correspondentes.length} correspondentes encontrados`);

        if (correspondentes.length === 0) {
            return res.json({ 
                success: true, 
                message: 'Nenhum correspondente encontrado para notificar',
                enviadas: 0
            });
        }

        // 📱 MONTAR A MENSAGEM
        const mensagem = `✅ *NOTA CONCLUÍDA*

👤 *Cliente:* ${clienteNome}
📋 *Nota:* ${notaTexto}
✍️ *Concluída por:* ${usuarioConcluiu}
⏰ *Data:* ${new Date().toLocaleString('pt-BR')}
📝 *ID da Nota:* ${notaId}

🎉 *Status: CONCLUÍDA*

_Sistema CRM CAIXA_`;

        let enviadasComSucesso = 0;
        let errosEnvio = 0;

        // 📤 ENVIAR PARA CADA CORRESPONDENTE
        for (const correspondente of correspondentes) {
            try {
                const telefone = correspondente.telefone;
                
                if (!telefone) {
                    console.log(`⚠️ Correspondente ${correspondente.first_name} sem telefone`);
                    continue;
                }

                const phoneFormatted = formatPhoneNumber(telefone);
                if (!phoneFormatted) {
                    console.log(`❌ Telefone inválido para ${correspondente.first_name}: ${telefone}`);
                    continue;
                }

                console.log(`📤 Enviando para ${correspondente.first_name} ${correspondente.last_name}: ${phoneFormatted}`);

                await sock.sendMessage(phoneFormatted, { text: mensagem });
                
                enviadasComSucesso++;
                console.log(`✅ Notificação enviada para ${correspondente.first_name}`);

                // Pequeno delay entre envios para evitar spam
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (envioError) {
                console.error(`❌ Erro ao enviar para ${correspondente.first_name}:`, envioError.message);
                errosEnvio++;
            }
        }

        console.log(`📊 Resultado: ${enviadasComSucesso} enviadas, ${errosEnvio} erros`);

        res.json({ 
            success: true, 
            message: `Notificações processadas para ${correspondentes.length} correspondentes`,
            total: correspondentes.length,
            enviadas: enviadasComSucesso,
            erros: errosEnvio,
            cliente: clienteNome,
            acao: 'NOTA_CONCLUIDA'
        });

    } catch (error) {
        console.error('❌ Erro ao notificar correspondentes:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: 'Erro interno do servidor ao enviar notificações'
        });
    }
});

// ✅ NOVA ROTA PARA NOTIFICAR CORRESPONDENTES SOBRE DOCUMENTOS ENVIADOS
router.post('/notificarCorrespondenteDocumentosEnviados', async (req, res) => {
    try {
        const { 
            clienteId, 
            clienteNome, 
            clienteCpf,
            documentosEnviados, // Objeto com tipos de documentos específicos
            usuarioEnvio,
            nomeUsuarioEnvio,
            dataEnvio,
            observacoes
        } = req.body;

        console.log('📨 Notificação de documentos enviados recebida:', {
            clienteId,
            clienteNome,
            clienteCpf,
            documentosEnviados,
            usuarioEnvio,
            nomeUsuarioEnvio,
            dataEnvio,
            observacoes
        });

        // ✅ VERIFICAR SE O CLIENTE BAILEYS ESTÁ CONECTADO
        if (!sock) {
            console.log('❌ Cliente WhatsApp (sock) não está conectado');
            return res.status(503).json({ 
                success: false, 
                error: 'Cliente WhatsApp não está conectado' 
            });
        }

        // ✅ VERIFICAR SE ESTÁ AUTENTICADO
        if (!isAuthenticated) {
            console.log('❌ WhatsApp não está autenticado');
            return res.status(503).json({ 
                success: false, 
                error: 'WhatsApp não está autenticado' 
            });
        }

        // 🔍 BUSCAR TODOS OS CORRESPONDENTES ATIVOS USANDO AS COLUNAS CORRETAS
        const { User } = require('../models');
        
        const correspondentes = await User.findAll({
            where: {
                is_correspondente: true // ✅ USAR is_correspondente EM VEZ DE role
            },
            attributes: ['id', 'first_name', 'last_name', 'telefone']
        });

        console.log(`📋 ${correspondentes.length} correspondentes encontrados`);

        if (correspondentes.length === 0) {
            return res.json({ 
                success: true, 
                message: 'Nenhum correspondente encontrado para notificar',
                enviadas: 0
            });
        }

        // 📱 MONTAR A MENSAGEM COM DETALHES DOS DOCUMENTOS
        let mensagem = `📄 *DOCUMENTOS ATUALIZADOS*

👤 *Cliente:* ${clienteNome}`;

        if (clienteCpf) {
            mensagem += `\n📄 *CPF:* ${clienteCpf}`;
        }

        mensagem += `\n🆔 *ID Cliente:* ${clienteId}
📤 *Enviado por:* ${nomeUsuarioEnvio || usuarioEnvio || 'Cliente'}
⏰ *Data:* ${dataEnvio ? new Date(dataEnvio).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}`;

        // ✅ MAPEAR TIPOS DE DOCUMENTOS COM EMOJIS E NOMES AMIGÁVEIS
        const tiposDocumentos = {
            'documentos_pessoais': '👤 Documentos Pessoais',
            'extrato_bancario': '🏦 Extrato Bancário',
            'documentos_dependente': '👶 Documentos do Dependente',
            'documentos_conjuge': '💑 Documentos do Cônjuge',
            'tela_aprovacao': '✅ Tela de Aprovação',
            'formularios_caixa': '📄 Formulários da Caixa',
            'fiador_documentos': '🧑‍💼 Documentos do Fiador'
        };

        // ✅ PROCESSAR DOCUMENTOS ENVIADOS
        let totalDocumentos = 0;
        let documentosDetalhados = [];

        if (documentosEnviados && typeof documentosEnviados === 'object') {
            Object.entries(documentosEnviados).forEach(([tipoDoc, arquivos]) => {
                if (arquivos && Array.isArray(arquivos) && arquivos.length > 0) {
                    const nomeAmigavel = tiposDocumentos[tipoDoc] || `📎 ${tipoDoc}`;
                    totalDocumentos += arquivos.length;
                    
                    documentosDetalhados.push({
                        tipo: nomeAmigavel,
                        quantidade: arquivos.length,
                        arquivos: arquivos.map(arquivo => arquivo.originalname || arquivo.filename || 'arquivo')
                    });
                }
            });
        }

        if (totalDocumentos > 0) {
            mensagem += `\n\n📋 *Documentos Enviados (${totalDocumentos}):*`;
            
            documentosDetalhados.forEach((docTipo) => {
                mensagem += `\n\n${docTipo.tipo}`;
                if (docTipo.quantidade > 1) {
                    mensagem += ` (${docTipo.quantidade} arquivos)`;
                }
                
                // Listar até 3 arquivos por tipo para não deixar a mensagem muito longa
                docTipo.arquivos.slice(0, 3).forEach((arquivo, index) => {
                    mensagem += `\n  ${index + 1}. ${arquivo}`;
                });
                
                if (docTipo.arquivos.length > 3) {
                    mensagem += `\n  ... e mais ${docTipo.arquivos.length - 3} arquivo(s)`;
                }
            });
        } else {
            mensagem += `\n\n📋 *Documentos atualizados*`;
        }

        if (observacoes) {
            mensagem += `\n\n📝 *Observações:* ${observacoes}`;
        }

        mensagem += `\n\n✅ *Status: DOCUMENTOS RECEBIDOS*

_Sistema CRM CAIXA_`;

        let enviadasComSucesso = 0;
        let errosEnvio = 0;

        // 📤 ENVIAR PARA CADA CORRESPONDENTE
        for (const correspondente of correspondentes) {
            try {
                const telefone = correspondente.telefone;
                
                if (!telefone) {
                    console.log(`⚠️ Correspondente ${correspondente.first_name} sem telefone`);
                    continue;
                }

                const phoneFormatted = formatPhoneNumber(telefone);
                if (!phoneFormatted) {
                    console.log(`❌ Telefone inválido para ${correspondente.first_name}: ${telefone}`);
                    continue;
                }

                console.log(`📤 Enviando para ${correspondente.first_name} ${correspondente.last_name}: ${phoneFormatted}`);

                await sock.sendMessage(phoneFormatted, { text: mensagem });
                
                enviadasComSucesso++;
                console.log(`✅ Notificação enviada para ${correspondente.first_name}`);

                // Pequeno delay entre envios para evitar spam
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (envioError) {
                console.error(`❌ Erro ao enviar para ${correspondente.first_name}:`, envioError.message);
                errosEnvio++;
            }
        }

        console.log(`📊 Resultado: ${enviadasComSucesso} enviadas, ${errosEnvio} erros`);

        res.json({ 
            success: true, 
            message: `Notificações processadas para ${correspondentes.length} correspondentes`,
            total: correspondentes.length,
            enviadas: enviadasComSucesso,
            erros: errosEnvio,
            cliente: clienteNome,
            acao: 'DOCUMENTOS_ENVIADOS'
        });

    } catch (error) {
        console.error('❌ Erro ao notificar correspondentes sobre documentos:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: 'Erro interno do servidor ao enviar notificações de documentos'
        });
    }
});

// ===== AUTO-RECONEXÃO AO INICIAR O SERVIDOR =====
// Após 5 s, busca no banco sessões marcadas como 'active' e reconecta.
setTimeout(async () => {
  try {
    const activeSessions = await WhatsAppSessionService.listActiveSessions();
    if (activeSessions.length === 0) {
      console.log('📱 Nenhuma sessão WhatsApp ativa encontrada no banco para reconectar.');
      return;
    }

    console.log(`📱 Reconectando ${activeSessions.length} sessão(ões) WhatsApp do banco...`);

    for (const session of activeSessions) {
      const match = session.id.match(/^tenant_(\d+)__(.+)/);
      if (!match) continue;
      const tenantId = parseInt(match[1], 10);
      const storedSessionId = session.id;
      console.log(`🔄 Auto-reconectando tenant ${tenantId}, sessão ${session.id}...`);
      try {
        await initializeWhatsAppClient(tenantId, storedSessionId);
      } catch (err) {
        console.error(`❌ Falha ao reconectar sessão ${session.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ Erro ao buscar sessões ativas para reconexão:', err.message);
  }
}, 5000);

module.exports = router;
