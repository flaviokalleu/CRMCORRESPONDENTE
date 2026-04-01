const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const multer = require('multer');
const { User, Cliente, Nota, TelaAprovacao, sequelize } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('./authRoutes');

// ✅ IMPORTAÇÕES CORRETAS
const { uploadFields, logUploadedFiles, handleMulterError, uploadDirectories } = require('../middleware/upload');
const { validateCliente } = require('../middleware/validators');
const PDFService = require('../services/pdfService');
const { getSocketIO } = require('../socket');

// ===========================
// Função para garantir apenas a data (YYYY-MM-DD) sem horário/timezone
function formatDateOnly(dateStr) {
  if (!dateStr) return null;
  // Aceita tanto 'YYYY-MM-DD' quanto 'YYYY-MM-DDTHH:mm' (caso algum browser envie assim)
  const onlyDate = dateStr.split('T')[0];
  return onlyDate;
}
// CONFIGURAÇÕES E INICIALIZAÇÃO
// ===========================

// Inicializar PDFService com validação robusta
let pdfService;
try {
  const baseUploadDir = uploadDirectories?.clientes || path.join(__dirname, '../../uploads/clientes');
  
  if (!fs.existsSync(baseUploadDir)) {
    fs.mkdirSync(baseUploadDir, { recursive: true });
    console.log(`📁 Diretório criado: ${baseUploadDir}`);
  }
  
  // ✅ CONFIGURAÇÃO OTIMIZADA PARA CLIENTES
  pdfService = new PDFService(baseUploadDir, {
    enableImageConversion: true, // Ativar conversão por imagem para documentos problemáticos
    imageConversionTypes: ['ctps', 'carteira', 'rg', 'cpf'], // Tipos que precisam de conversão especial
    dpi: 150, // Qualidade adequada
    quality: 85, // Boa qualidade de imagem
    maxWidth: 1200, // Resolução otimizada
    enableDetailedLogs: process.env.NODE_ENV !== 'production' // Logs detalhados em desenvolvimento
  });
  console.log(`✅ PDFService inicializado com conversão por imagem: ${baseUploadDir}`);
} catch (error) {
  console.error('❌ Erro ao inicializar PDFService:', error);
  const fallbackDir = path.join(__dirname, '../../uploads');
  pdfService = new PDFService(fallbackDir, {
    enableImageConversion: true,
    imageConversionTypes: ['ctps', 'carteira'],
    enableDetailedLogs: false
  });
  console.log(`⚠️ PDFService com fallback e conversão por imagem: ${fallbackDir}`);
}

// Configuração WhatsApp
const WHATSAPP_BASE_URL = process.env.WHATSAPP_BASE_URL || 'http://localhost:8000/api/whatsapp';

// ===========================
// CONSTANTES E MAPEAMENTOS
// ===========================

const documentTypeMap = {
  'documentosPessoais': 'documentos_pessoais',
  'extratoBancario': 'extrato_bancario',
  'documentosDependente': 'documentos_dependente',
  'documentosConjuge': 'documentos_conjuge',
  'fiadorDocumentos': 'fiador_documentos',
  'formulariosCaixa': 'formularios_caixa',
  'tela_aprovacao': 'tela_aprovacao', // Campo correto para tela de aprovação
};

// ✅ ATUALIZAR LISTA DE STATUS VÁLIDOS NO BACKEND (incluindo "não descondiciona", "conferência de documento" e "reserva")
const STATUS_VALIDOS = [
  'aguardando_aprovacao',
  'proposta_apresentada',
  'documentacao_pendente',
  'visita_efetuada',
  'aguardando_cancelamento_qv',
  'condicionado',
  'cliente_aprovado',
  'reprovado',
  'reserva',
  'conferencia_documento',
  'nao_descondiciona',
  'conformidade',
  'concluido',
  'nao_deu_continuidade',
  // status antigos e extras para compatibilidade
  'aguardando_reserva_orcamentaria',
  'fechamento_proposta',
  'processo_em_aberto',
  'aprovado',
  'em_andamento',
  'finalizado',
  'cancelado'
];

// ===========================
// FUNÇÕES UTILITÁRIAS
// ===========================

// Formatação de valores monetários
const formatarValorMonetario = (valor) => {
  if (!valor) return null;
  
  if (typeof valor === 'string' && valor.includes(',')) {
    return valor;
  }
  
  const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
  
  if (isNaN(numero)) return null;
  
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Converter valor formatado para número
const converterValorParaNumero = (valorFormatado) => {
  if (!valorFormatado) return 0;
  
  const valorLimpo = valorFormatado.toString().replace(/\./g, '').replace(',', '.');
  return parseFloat(valorLimpo) || 0;
};

// Validar CPF - ACEITA QUALQUER CPF (SEM VALIDAÇÃO)
const validarCPF = (cpf) => {
  if (!cpf) {
    console.log(`❌ CPF não fornecido`);
    return false;
  }
  
  // Remove caracteres não numéricos
  const cpfLimpo = cpf.toString().replace(/\D/g, '');
  
  console.log(`🔍 CPF recebido: "${cpf}" -> limpo: "${cpfLimpo}"`);
  
  // Verifica apenas se tem 11 dígitos
  if (cpfLimpo.length !== 11) {
    console.log(`❌ CPF com ${cpfLimpo.length} dígitos (esperado: 11)`);
    return false;
  }
  
  console.log(`✅ CPF aceito: ${cpfLimpo}`);
  return true;
};

// Encontrar usuário por email
const findUserByEmail = async (email) => {
  try {
    if (!email) throw new Error('Email não fornecido');
    
    const user = await User.findOne({ where: { email } });
    if (!user) throw new Error('Usuário não encontrado');
    
    if (user.is_administrador) return { user, role: 'Administrador' };
    if (user.is_corretor) return { user, role: 'Corretor' };
    if (user.is_correspondente) return { user, role: 'Correspondente' };
    
    throw new Error('Usuário sem permissões adequadas');
  } catch (error) {
    console.error('Erro ao encontrar usuário:', error);
    throw error;
  }
};

// Limpeza de arquivos temporários
const cleanupAllTempFiles = async (req) => {
  if (!req.files) return;
  
  try {
    const allFiles = Object.values(req.files).flat();
    if (pdfService && pdfService.cleanupTempFiles) {
      await pdfService.cleanupTempFiles(allFiles);
    }
  } catch (error) {
    console.error('Erro na limpeza de arquivos:', error);
  }
};

// Enviar notificação WhatsApp
const sendWhatsAppNotification = async (endpoint, data, tenantId) => {
  try {
    const response = await axios.post(`${WHATSAPP_BASE_URL}${endpoint}`, data, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(tenantId ? { 'X-Tenant-Id': String(tenantId) } : {})
      }
    });
    
    console.log(`📱 WhatsApp enviado para ${endpoint}:`, response.data.message);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ Erro WhatsApp ${endpoint}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ===========================
// PROCESSAMENTO DE DOCUMENTOS
// ===========================

const processDocumentUploads = async ({ files, user, cliente, cpf }) => {
  const documentUpdates = {};
  if (!cpf) throw new Error('CPF é obrigatório para processar documentos');
  if (!user || !user.id) throw new Error('Usuário é obrigatório para processar documentos');
  if (!pdfService) throw new Error('PDFService não inicializado');
  console.log(`📄 Processando documentos para CPF: ${cpf}, User: ${user.id}`);

  for (const [fieldName, dbField] of Object.entries(documentTypeMap)) {
    let arquivos = files[fieldName];
    if (!arquivos) continue;
    if (!Array.isArray(arquivos)) arquivos = [arquivos];
    if (arquivos.length > 0) {
      console.log(`📁 Processando: ${fieldName} -> ${dbField} (${arquivos.length} arquivos)`);
      arquivos.forEach((arquivo, index) => {
        console.log(`📄 Arquivo ${index + 1}:`);
        console.log(`  - Nome original: ${arquivo.originalname}`);
        console.log(`  - Nome no campo: ${arquivo.fieldname}`);
        console.log(`  - Tamanho: ${arquivo.size} bytes`);
        console.log(`  - Tipo MIME: ${arquivo.mimetype}`);
        console.log(`  - Caminho temporário: ${arquivo.path}`);
        console.log(`  - Encoding: ${arquivo.encoding}`);
        if (fs.existsSync(arquivo.path)) {
          const stats = fs.statSync(arquivo.path);
          console.log(`  - Tamanho no disco: ${stats.size} bytes`);
          console.log(`  - Última modificação: ${stats.mtime}`);
        } else {
          console.error(`  - ❌ ARQUIVO NÃO ENCONTRADO NO DISCO!`);
        }
      });
      try {
        // Se for tela_aprovacao, garantir subpasta correta
        if (dbField === 'tela_aprovacao') {
          const destDir = path.join(__dirname, '../../uploads/clientes', cpf, 'tela_aprovacao');
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          const arquivo = arquivos[0]; // Suporte a 1 arquivo (ajustar se quiser múltiplos)
          const ext = path.extname(arquivo.originalname);
          const sanitized = pdfService.sanitizeFileName(arquivo.originalname);
          const destPath = path.join(destDir, sanitized);
          fs.renameSync(arquivo.path, destPath);
          const relativePath = path.relative(path.join(__dirname, '../../uploads'), destPath).replace(/\\/g, '/');
          documentUpdates[dbField] = relativePath;
          console.log(`✅ Tela de aprovação salva em: ${relativePath}`);
        } else {
          const pdfPath = await pdfService.processFiles(
            arquivos,
            user,
            cpf,
            dbField,
            cliente ? cliente[dbField] : undefined
          );
          if (pdfPath) {
            documentUpdates[dbField] = pdfPath;
            console.log(`✅ Documento processado: ${dbField} = ${pdfPath}`);
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao processar ${fieldName}:`, error);
        throw new Error(`Erro ao processar documento ${fieldName}: ${error.message}`);
      }
    }
  }
  return documentUpdates;
};

// ===========================
// BUILDERS DE DADOS
// ===========================

const buildClienteData = (body) => {
  const data = {
    nome: body.nome?.trim(),
    email: body.email?.toLowerCase()?.trim(),
    telefone: body.telefone?.trim(),
    cpf: body.cpf ? body.cpf.toString().replace(/\D/g, '') : '',
    valor_renda: body.valor_renda ? formatarValorMonetario(body.valor_renda) : null,
    estado_civil: body.estado_civil,
    naturalidade: body.naturalidade?.trim(),
    profissao: body.profissao?.trim(),
    data_admissao: body.data_admissao ? formatDateOnly(body.data_admissao) : null,
    data_nascimento: body.data_nascimento ? formatDateOnly(body.data_nascimento) : null,
    renda_tipo: body.renda_tipo,
    // Garantir booleano
    possui_carteira_mais_tres_anos: !!Number(body.possui_carteira_mais_tres_anos),
    numero_pis: body.numero_pis?.trim(),
    possui_dependente: !!Number(body.possui_dependente),

    // ✅ Status (se fornecido)
    ...(body.status ? { status: body.status } : {}),

    // CAMPOS DO CÔNJUGE
    conjuge_nome: body.conjuge_nome?.trim() || null,
    conjuge_email: body.conjuge_email?.toLowerCase()?.trim() || null,
    conjuge_telefone: body.conjuge_telefone?.trim() || null,
    conjuge_cpf: body.conjuge_cpf ? body.conjuge_cpf.toString().replace(/\D/g, '') : null,
    conjuge_profissao: body.conjuge_profissao?.trim() || null,
    conjuge_data_nascimento: body.conjuge_data_nascimento ? formatDateOnly(body.conjuge_data_nascimento) : null,
    conjuge_valor_renda: body.conjuge_valor_renda ? formatarValorMonetario(body.conjuge_valor_renda) : null,
    conjuge_renda_tipo: body.conjuge_renda_tipo || null,
    conjuge_data_admissao: body.conjuge_data_admissao ? formatDateOnly(body.conjuge_data_admissao) : null,

    // Campos do fiador
    possui_fiador: body.possui_fiador === true || body.possui_fiador === 'true' ? 1 : 0,
    fiador_nome: body.fiador_nome?.trim() || null,
    fiador_cpf: body.fiador_cpf ? body.fiador_cpf.toString().replace(/\D/g, '') : null,
    fiador_telefone: body.fiador_telefone?.trim() || null,
    fiador_email: body.fiador_email?.toLowerCase()?.trim() || null,

    // Campos dos formulários Caixa
    possui_formularios_caixa: body.possui_formularios_caixa === true || body.possui_formularios_caixa === 'true' ? 1 : 0,
  };

  // Validações
  if (!data.nome || !data.email || !data.cpf) {
    throw new Error('Nome, email e CPF são obrigatórios');
  }

  if (!validarCPF(data.cpf)) {
    throw new Error('CPF inválido');
  }

  // ✅ Validar status com a nova lista
  if (data.status && !STATUS_VALIDOS.includes(data.status)) {
    throw new Error(`Status inválido. Valores aceitos: ${STATUS_VALIDOS.join(', ')}`);
  }

  return data;
};

// ✅ CRIAR NOVA FUNÇÃO PARA CRIAÇÃO DE CLIENTE
const buildClienteDataForCreate = (body) => {
  const data = buildClienteData(body);
  
  // ✅ Apenas na CRIAÇÃO definir status padrão se não fornecido
  if (!data.status) {
    data.status = 'aguardando_aprovacao';
  }
  
  return data;
};

// ===========================
// ROTAS
// ===========================

// CRIAR CLIENTE - USAR A NOVA FUNÇÃO
router.post('/clientes',
  authenticateToken,
  uploadFields,
  handleMulterError,
  logUploadedFiles,
  validateCliente,
  async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      // Normalizar userId no payload recebido (aceita user_id ou userId)
      if (req.body.user_id && !req.body.userId) {
        req.body.userId = req.body.user_id;
      }
      console.log('🔄 Iniciando criação de cliente');
      
      const userResult = await findUserByEmail(req.user?.email);
      if (!userResult) {
        throw new Error('Usuário não autorizado');
      }
      const { user, role } = userResult;

      // Log das datas recebidas no body
      console.log('📅 Recebido data_nascimento:', req.body.data_nascimento);
      console.log('📅 Recebido data_criacao:', req.body.data_criacao);
      console.log('📅 Recebido data_admissao:', req.body.data_admissao);
      console.log('📅 Recebido conjuge_data_nascimento:', req.body.conjuge_data_nascimento);
      console.log('📅 Recebido conjuge_data_admissao:', req.body.conjuge_data_admissao);
      // ✅ USAR A FUNÇÃO ESPECÍFICA PARA CRIAÇÃO
      const clienteData = buildClienteDataForCreate(req.body);
      
      // Verificar CPF existente
      const existingCliente = await Cliente.findOne({ 
        where: { cpf: clienteData.cpf } 
      });
      if (existingCliente) {
        throw new Error('CPF já cadastrado');
      }

      // Determinar userId (Sequelize model)
      let userIdParaVincular = user.id;
      if ((user.is_administrador || user.is_correspondente) && req.body.user_id) {
        userIdParaVincular = req.body.user_id;
      }
      clienteData.userId = userIdParaVincular;

      // Data de criação personalizada
      if (req.body.data_criacao) {
        const dataCustom = new Date(req.body.data_criacao);
        clienteData.created_at = dataCustom;
        clienteData.updated_at = dataCustom;
      }


      // Criar cliente
      const cliente = await Cliente.create(clienteData, { transaction });
      
      console.log(`👤 Cliente criado: ${cliente.id} por ${user.username}`);

      // Emitir evento socket para todos os clientes conectados
      try {
        getSocketIO().emit('cliente-criado', {
          clienteId: cliente.id,
          nome: cliente.nome,
          criadoPor: user.username
        });
      } catch (e) {
        console.warn('Socket.IO não inicializado:', e.message);
      }

      // Processar documentos
      const documentUpdates = await processDocumentUploads({
        files: req.files || {},
        user,
        cliente,
        cpf: clienteData.cpf
      });

      // Atualizar cliente com documentos
      if (Object.keys(documentUpdates).length > 0) {
        await cliente.update(documentUpdates, { transaction });
      }

      // Processar notas
      if (req.files?.notas && req.files.notas.length > 0) {
        const notasPromises = req.files.notas.map(file =>
          Nota.create({
            clienteId: cliente.id,
            content: `Nota: ${file.originalname}`
          }, { transaction })
        );
        await Promise.all(notasPromises);
      }

      await transaction.commit();

      // Buscar cliente completo
      const clienteCompleto = await Cliente.findByPk(cliente.id, {
        include: [{ model: Nota, as: 'notas' }]
      });

      // Buscar usuário vinculado ao cliente para notificação
      let usuarioVinculado, nomeUsuarioVinculado, telefoneUsuarioVinculado;
      if (userIdParaVincular === user.id) {
        // Não selecionou outro usuário, usa o próprio logado
        usuarioVinculado = user;
      } else {
        // Selecionou outro usuário, busca no banco
        usuarioVinculado = await User.findByPk(userIdParaVincular, {
          attributes: ['first_name', 'last_name', 'username', 'telefone', 'email']
        });
      }
      nomeUsuarioVinculado = `${usuarioVinculado?.first_name || ''} ${usuarioVinculado?.last_name || ''}`.trim() || usuarioVinculado?.username || '';
      telefoneUsuarioVinculado = usuarioVinculado?.telefone || '';

      // Notificação WhatsApp para o usuário responsável
      const whatsappNotification = await sendWhatsAppNotification('/notificarClienteCadastrado', {
        clienteId: cliente.id,
        clienteNome: clienteData.nome,
        usuarioResponsavel: nomeUsuarioVinculado,
        telefoneUsuarioResponsavel: telefoneUsuarioVinculado,
        cpfCliente: clienteData.cpf,
        telefoneCliente: clienteData.telefone,
        emailCliente: clienteData.email,
        valorRenda: clienteData.valor_renda,
        estado_civil: clienteData.estado_civil,
        naturalidade: clienteData.naturalidade,
        profissao: clienteData.profissao,
        data_admissao: clienteData.data_admissao,
        data_nascimento: clienteData.data_nascimento,
        renda_tipo: clienteData.renda_tipo,
        possui_carteira_mais_tres_anos: clienteData.possui_carteira_mais_tres_anos,
        numero_pis: clienteData.numero_pis,
        possui_dependente: clienteData.possui_dependente,
        status: clienteData.status,
        possui_fiador: clienteData.possui_fiador,
        fiador_nome: clienteData.fiador_nome,
        fiador_cpf: clienteData.fiador_cpf,
        fiador_telefone: clienteData.fiador_telefone,
        fiador_email: clienteData.fiador_email,
        possui_formularios_caixa: clienteData.possui_formularios_caixa,
        created_at: clienteData.created_at,
        // CAMPOS DO CÔNJUGE
        conjuge_nome: clienteData.conjuge_nome,
        conjuge_email: clienteData.conjuge_email,
        conjuge_telefone: clienteData.conjuge_telefone,
        conjuge_cpf: clienteData.conjuge_cpf,
        conjuge_profissao: clienteData.conjuge_profissao,
        conjuge_data_nascimento: clienteData.conjuge_data_nascimento,
        conjuge_valor_renda: clienteData.conjuge_valor_renda,
        conjuge_renda_tipo: clienteData.conjuge_renda_tipo,
        conjuge_data_admissao: clienteData.conjuge_data_admissao
      }, req.tenantId || req.user?.tenant_id);

      // ✅ NOTIFICAR CORRESPONDENTES SOBRE NOVO CLIENTE
      let notificacaoCorrespondentes = null;
      try {
        notificacaoCorrespondentes = await notificarCorrespondentes(
          'cliente_criado',
          clienteData,
          `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
        );
      } catch (notificacaoError) {
        console.error('❌ Erro nas notificações (não bloqueante):', notificacaoError);
        notificacaoCorrespondentes = { 
          success: false, 
          error: 'Erro ao enviar notificações', 
          details: notificacaoError.message 
        };
      }

      res.status(201).json({
        message: 'Cliente criado com sucesso!',
        cliente: {
          ...clienteCompleto.toJSON(),
          valor_renda_formatado: clienteData.valor_renda
        },
        whatsapp: whatsappNotification,
        notificacaoCorrespondentes: notificacaoCorrespondentes
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erro ao criar cliente:', error);
      
      res.status(400).json({ 
        error: error.message || 'Erro ao criar cliente'
      });
    } finally {
      await cleanupAllTempFiles(req);
    }
  }
);

// ATUALIZAR CLIENTE - USAR A FUNÇÃO ORIGINAL (SEM STATUS PADRÃO)
router.put('/clientes/:id',
  authenticateToken,
  uploadFields,
  handleMulterError,
  logUploadedFiles,
  async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      // Normalizar userId no payload recebido (aceita user_id ou userId)
      if (req.body.user_id && !req.body.userId) {
        req.body.userId = req.body.user_id;
      }
      const { id } = req.params;
      const user = req.user;
      // Buscar role do usuário autenticado
      const userResult = await findUserByEmail(user.email);
      const role = userResult?.role;

      // Fetch the client
      const cliente = await Cliente.findByPk(id);
      if (!cliente) {
        throw new Error('Cliente não encontrado');
      }

      // Verificar permissões
      if (role === 'Corretor' && cliente.userId !== user.id) {
        throw new Error('Sem permissão para editar este cliente');
      }

      // ✅ USAR buildClienteData (sem status padrão)
      const updateData = buildClienteData(req.body);
      console.log(`📝 Status no updateData:`, updateData.status);
      
      // ✅ VALIDAR PERMISSÃO PARA ALTERAR STATUS
      if (updateData.status && role === 'Corretor') {
        console.warn(`⚠️ Corretor ${user.username} tentou alterar status - BLOQUEADO`);
        delete updateData.status; // Remove status da atualização se for corretor
      }
      
      const cpfParaProcessar = updateData.cpf || cliente.cpf;
      if (!cpfParaProcessar) {
        throw new Error('CPF é obrigatório');
      }

      const statusAnterior = cliente.status;
      console.log(`📝 Status anterior:`, statusAnterior);

      if (req.body.data_criacao) {
        updateData.created_at = new Date(req.body.data_criacao);
      }

      // ✅ FILTRAR APENAS CAMPOS QUE FORAM ENVIADOS
      const fieldsToUpdate = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && updateData[key] !== null) {
          fieldsToUpdate[key] = updateData[key];
        }
      });

      // ✅ PERMITIR ALTERAÇÃO DO userId POR ADMIN/CORRESPONDENTE COM LOG DE AUDITORIA
      if ((user.is_administrador || user.is_correspondente) && req.body.user_id) {
        if (req.body.user_id !== String(cliente.userId)) {
          const usuarioAnterior = await User.findByPk(cliente.userId, {
            attributes: ['username', 'first_name', 'last_name']
          });
          const novoUsuario = await User.findByPk(req.body.user_id, {
            attributes: ['username', 'first_name', 'last_name']
          });
          
          fieldsToUpdate.userId = req.body.user_id;
          
          console.log(`🔄 AUDITORIA: Cliente ${cliente.nome} (CPF: ${cliente.cpf}) transferido:`);
          console.log(`  � DE: ${usuarioAnterior?.username} (${usuarioAnterior?.first_name} ${usuarioAnterior?.last_name})`);
          console.log(`  👤 PARA: ${novoUsuario?.username} (${novoUsuario?.first_name} ${novoUsuario?.last_name})`);
          console.log(`  🧑‍💼 POR: ${user.username} (${user.first_name} ${user.last_name})`);
          console.log(`  🕐 EM: ${new Date().toLocaleString('pt-BR')}`);
        }
      }

      console.log(`📝 Campos a serem atualizados:`, fieldsToUpdate);


      // Atualizar dados básicos
      await cliente.update(fieldsToUpdate, { transaction });

      // Emitir evento socket para atualização de cliente
      try {
        getSocketIO().emit('cliente-atualizado', {
          clienteId: cliente.id,
          alteradoPor: user.username,
          camposAlterados: Object.keys(fieldsToUpdate)
        });
      } catch (e) {
        console.warn('Socket.IO não inicializado:', e.message);
      }

      // Processar documentos
      const documentUpdates = await processDocumentUploads({
        files: req.files || {},
        user,
        cliente,
        cpf: cpfParaProcessar
      });

      // ✅ VALIDAR CAMINHOS DE DOCUMENTOS - garantir que pertencem ao cliente correto
      const cpfParaDiretorio = cpfParaProcessar.replace(/\D/g, ''); // CPF sem máscara para validação de diretório
      const validatedUpdates = {};
      Object.entries(documentUpdates).forEach(([field, path]) => {
        if (path && path.includes(cpfParaDiretorio)) {
          validatedUpdates[field] = path;
          console.log(`✅ Documento validado: ${field} = ${path}`);
        } else if (path) {
          console.warn(`⚠️ Documento rejeitado (não pertence ao cliente): ${field} = ${path}`);
        }
      });

      // Atualizar documentos apenas com caminhos validados
      if (Object.keys(validatedUpdates).length > 0) {
        await cliente.update(validatedUpdates, { transaction });
        console.log(`📁 Documentos atualizados: ${Object.keys(validatedUpdates).join(', ')}`);
      }

      // Processar novas notas
      if (req.files?.notas && req.files.notas.length > 0) {
        const notasPromises = req.files.notas.map(file =>
          Nota.create({
            clienteId: cliente.id,
            content: `Nota atualizada: ${file.originalname}`
          }, { transaction })
        );
        await Promise.all(notasPromises);
      }

      await transaction.commit();

      // Buscar cliente atualizado
      const clienteAtualizado = await Cliente.findByPk(cliente.id, {
        include: [{ model: Nota, as: 'notas' }]
      });

      console.log(`✅ Status final no banco:`, clienteAtualizado.status);

      // Notificação WhatsApp para mudança de status
      let whatsappNotification = null;
      if (fieldsToUpdate.status && fieldsToUpdate.status !== statusAnterior) {
        const usuarioResponsavel = await User.findByPk(cliente.userId, {
          attributes: ['id', 'first_name', 'last_name', 'telefone', 'username', 'email']
        });
        
        whatsappNotification = await sendWhatsAppNotification('/notificarStatusAlterado', {
          clienteId: cliente.id,
          clienteNome: fieldsToUpdate.nome || cliente.nome,
          statusAntigo: statusAnterior,
          statusNovo: fieldsToUpdate.status,
          usuarioAlterou: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
          telefoneUsuarioResponsavel: usuarioResponsavel?.telefone,
          valorRenda: fieldsToUpdate.valor_renda
        }, req.tenantId || req.user?.tenant_id);
      }

      // ✅ PREPARAR LISTA DE ALTERAÇÕES PARA NOTIFICAÇÃO
      const alteracoesRealizadas = [];
      
      // Verificar alterações nos dados básicos (ignorar campos irrelevantes)
      if (Object.keys(fieldsToUpdate).length > 0) {
        const camposRelevantes = Object.keys(fieldsToUpdate).filter(campo => 
          !['updated_at', 'created_at'].includes(campo) && 
          fieldsToUpdate[campo] !== cliente[campo]
        );
        
        if (camposRelevantes.length > 0) {
          // Traduzir nomes dos campos para português
          const camposTraducao = {
            'nome': 'Nome',
            'email': 'Email', 
            'telefone': 'Telefone',
            'status': 'Status',
            'valor_renda': 'Renda',
            'profissao': 'Profissão',
            'estado_civil': 'Estado Civil',
            'naturalidade': 'Naturalidade',
            'cpf': 'CPF',
            'data_nascimento': 'Data de Nascimento',
            'data_admissao': 'Data de Admissão',
            'numero_pis': 'PIS',
            'user_id': 'Responsável'
          };
          
          const camposTraducidos = camposRelevantes.map(campo => 
            camposTraducao[campo] || campo
          );
          
          alteracoesRealizadas.push(`Dados alterados: ${camposTraducidos.join(', ')}`);
        }
      }

      // Verificar novos documentos
      if (Object.keys(validatedUpdates).length > 0) {
        alteracoesRealizadas.push(`Documentos enviados: ${Object.keys(validatedUpdates).join(', ')}`);
      }

      // Verificar novas notas
      if (req.files?.notas && req.files.notas.length > 0) {
        alteracoesRealizadas.push(`Novas notas adicionadas (${req.files.notas.length})`);
      }

      // ✅ NOTIFICAR CORRESPONDENTES SOBRE ATUALIZAÇÕES
      let notificacaoCorrespondentes = null;
      if (alteracoesRealizadas.length > 0) {
        try {
          // Determinar tipo de notificação baseado no que foi alterado
          const tipoNotificacao = Object.keys(validatedUpdates).length > 0 ? 'documentos_enviados' : 'cliente_atualizado';
          
          // ✅ PREPARAR DADOS DOS DOCUMENTOS ENVIADOS PARA NOTIFICAÇÃO
          let dadosParaNotificacao = {
            id: clienteAtualizado.id,
            nome: clienteAtualizado.nome,
            cpf: clienteAtualizado.cpf,
            status: clienteAtualizado.status
          };

          let alteracoesTexto = alteracoesRealizadas.join('; ');

          // ✅ SE FOR ENVIO DE DOCUMENTOS, ESTRUTURAR DADOS DETALHADOS
          if (tipoNotificacao === 'documentos_enviados' && Object.keys(validatedUpdates).length > 0) {
            dadosParaNotificacao.documentosEnviados = {};
            
            // Mapear documentos enviados por tipo
            Object.entries(validatedUpdates).forEach(([campo, arquivo]) => {
              let tipoDocumento = campo;
              
              // Normalizar nomes dos campos para mapeamento
              switch(campo) {
                case 'documentos_pessoais':
                case 'extrato_bancario':
                case 'documentos_dependente':
                case 'documentos_conjuge':
                case 'tela_aprovacao':
                case 'formularios_caixa':
                case 'fiador_documentos':
                  tipoDocumento = campo;
                  break;
                default:
                  tipoDocumento = campo; // manter o original se não estiver mapeado
              }
              
              dadosParaNotificacao.documentosEnviados[tipoDocumento] = [{
                filename: path.basename(arquivo),
                originalname: path.basename(arquivo),
                tipo: tipoDocumento
              }];
            });

            // Preparar dados adicionais para documentos
            dadosParaNotificacao.usuarioEnvio = user.username;
            dadosParaNotificacao.nomeUsuarioEnvio = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
            dadosParaNotificacao.dataEnvio = new Date().toISOString();
            
            // Criar descrição dos documentos enviados
            const tiposEnviados = Object.keys(dadosParaNotificacao.documentosEnviados);
            const nomesTipos = {
              'documentos_pessoais': 'Documentos Pessoais',
              'extrato_bancario': 'Extrato Bancário',
              'documentos_dependente': 'Documentos do Dependente',
              'documentos_conjuge': 'Documentos do Cônjuge',
              'tela_aprovacao': 'Tela de Aprovação',
              'formularios_caixa': 'Formulários da Caixa',
              'fiador_documentos': 'Documentos do Fiador'
            };
            
            alteracoesTexto = tiposEnviados.map(tipo => nomesTipos[tipo] || tipo).join(', ');
          }
          
          notificacaoCorrespondentes = await notificarCorrespondentes(
            tipoNotificacao,
            dadosParaNotificacao,
            `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
            alteracoesTexto
          );
        } catch (notificacaoError) {
          console.error('❌ Erro nas notificações (não bloqueante):', notificacaoError);
          notificacaoCorrespondentes = { 
            success: false, 
            error: 'Erro ao enviar notificações', 
            details: notificacaoError.message 
          };
        }
      }

      res.status(200).json({
        message: 'Cliente atualizado com sucesso!',
        cliente: {
          ...clienteAtualizado.toJSON(),
          valor_renda_formatado: fieldsToUpdate.valor_renda || clienteAtualizado.valor_renda
        },
        whatsapp: whatsappNotification,
        notificacaoCorrespondentes: notificacaoCorrespondentes,
        alteracoesRealizadas: alteracoesRealizadas
      });

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Erro ao atualizar cliente:', error);
      
      res.status(400).json({ 
        error: error.message || 'Erro ao atualizar cliente'
      });
    } finally {
      await cleanupAllTempFiles(req);
    }
  }
);

// LISTAR CLIENTES
router.get('/clientes', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', corretor } = req.query;
    const parsed = parseInt(limit);
    const realLimit = parsed > 0 ? Math.min(parsed, 100) : 10; // cap at 100
    const offset = (page - 1) * limit;

    const userResult = await findUserByEmail(req.user?.email);
    if (!userResult) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }
    const { user, role } = userResult;

    const whereClause = {};
    // Filtro por corretor (admin/correspondente pode filtrar qualquer userId, corretor só vê seus clientes)
    if (corretor && corretor !== 'Todos') {
      whereClause.userId = corretor;
    } else if (role === 'Corretor') {
      whereClause.userId = user.id;
    }
    // Busca por texto
    if (search) {
      whereClause[Op.or] = [
        { nome: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { cpf: { [Op.iLike]: `%${search}%` } }
      ];
    }
    // Filtro por status
    if (status) {
      whereClause.status = status;
    }

    // INCLUIR O USUÁRIO VINCULADO AO CLIENTE E AS NOTAS (apenas para contar)
    const clientes = await Cliente.findAndCountAll({
      attributes: [
        'id', 'nome', 'email', 'telefone', 'cpf', 'valor_renda', 
        'estado_civil', 'naturalidade', 'profissao', 'data_admissao',
        'data_nascimento', 'renda_tipo', 'possui_carteira_mais_tres_anos',
        'numero_pis', 'possui_dependente', 'status', 'user_id',
        'documentos_pessoais', 'extrato_bancario', 'documentos_dependente', 
        'documentos_conjuge',
        // CAMPOS DO CÔNJUGE
        'conjuge_nome', 'conjuge_email', 'conjuge_telefone', 'conjuge_cpf', 'conjuge_profissao', 'conjuge_data_nascimento', 'conjuge_valor_renda', 'conjuge_renda_tipo', 'conjuge_data_admissao',
        'possui_fiador', 'fiador_nome', 'fiador_cpf', 
        'fiador_telefone', 'fiador_email', 'fiador_documentos',
        'possui_formularios_caixa', 'formularios_caixa', 'tela_aprovacao',
        'created_at', 'updated_at'
      ],
      where: whereClause,
      limit: realLimit,
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'username', 'email']
        },
        {
          model: Nota,
          as: 'notas',
          attributes: ['id'] // só precisa do id para contar
        }
      ]
    });

    // Adiciona notasCount para cada cliente
    const clientesComNotasCount = clientes.rows.map(cliente => {
      const json = cliente.toJSON();
      return {
        ...json,
        notasCount: Array.isArray(json.notas) ? json.notas.length : 0
      };
    });

    res.json({
      success: true,
      clientes: clientesComNotasCount,
      pagination: {
        total: clientes.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(clientes.count / limit)
      }
    });

  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

// BUSCAR CLIENTE POR ID
router.get('/clientes/:id', authenticateToken, async (req, res) => {
  try {
    const clienteId = req.params.id;
    
    const userResult = await findUserByEmail(req.user?.email);
    if (!userResult) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }
    const { user, role } = userResult;

    const cliente = await Cliente.findByPk(clienteId, {
      include: [{ model: Nota, as: 'notas' }]
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Verificar permissões
      if (role === 'Corretor' && cliente.userId !== user.id) {
        return res.status(403).json({ 
          error: 'Sem permissão para visualizar este cliente' 
        });
      }

    res.json({
      success: true,
      cliente: {
        ...cliente.toJSON(),
        valor_renda_formatado: cliente.valor_renda
      }
    });

  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
});

// PATCH /clientes/:id/status
router.patch('/clientes/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ 
        error: `Status inválido. Valores aceitos: ${STATUS_VALIDOS.join(', ')}` 
      });
    }

    const userResult = await findUserByEmail(req.user.email);
    if (!userResult) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }
    const { user, role } = userResult;

    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // ✅ VERIFICAR PERMISSÃO PARA ALTERAR STATUS
    if (role === 'Corretor' && cliente.userId !== user.id) {
      return res.status(403).json({ 
        error: 'Sem permissão para alterar status deste cliente' 
      });
    }

    // ✅ CORRESPONDENTES E ADMINISTRADORES PODEM ALTERAR QUALQUER STATUS
    // ✅ CORRETORES SÓ PODEM ALTERAR STATUS DOS PRÓPRIOS CLIENTES
    if (role === 'Corretor') {
      console.warn(`⚠️ Corretor ${user.username} tentou alterar status via PATCH - BLOQUEADO`);
      return res.status(403).json({ 
        error: 'Corretores não podem alterar status de clientes' 
      });
    }

    const statusAnterior = cliente.status;

    await cliente.update({ status });

    // Emitir evento socket para alteração de status
    try {
      getSocketIO().emit('cliente-status-alterado', {
        clienteId: cliente.id,
        statusAntigo: statusAnterior,
        statusNovo: status,
        alteradoPor: user.username
      });
    } catch (e) {
      console.warn('Socket.IO não inicializado:', e.message);
    }

    // Notificação WhatsApp
    const usuarioResponsavel = await User.findByPk(cliente.userId, {
      attributes: ['id', 'first_name', 'last_name', 'telefone', 'username', 'email']
    });
    
    const whatsappNotification = await sendWhatsAppNotification('/notificarStatusAlterado', {
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      statusAntigo: statusAnterior,
      statusNovo: status,
      usuarioAlterou: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
      telefoneUsuarioResponsavel: usuarioResponsavel?.telefone
    }, req.tenantId || req.user?.tenant_id);

    // ✅ NOTIFICAR CORRESPONDENTES SOBRE MUDANÇA DE STATUS
    let notificacaoCorrespondentes = null;
    try {
      notificacaoCorrespondentes = await notificarCorrespondentes(
        'cliente_atualizado',
        {
          nome: cliente.nome,
          cpf: cliente.cpf,
          status: status
        },
        `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
        `Status alterado de "${statusAnterior}" para "${status}"`
      );
    } catch (notificacaoError) {
      console.error('❌ Erro nas notificações (não bloqueante):', notificacaoError);
      notificacaoCorrespondentes = { 
        success: false, 
        error: 'Erro ao enviar notificações', 
        details: notificacaoError.message 
      };
    }

    res.status(200).json({
      message: 'Status atualizado com sucesso',
      cliente,
      whatsapp: whatsappNotification,
      notificacaoCorrespondentes: notificacaoCorrespondentes
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETAR CLIENTE
router.delete('/clientes/:id', authenticateToken, async (req, res) => {
  try {
    const clienteId = req.params.id;

    const userResult = await findUserByEmail(req.user.email);
    if (!userResult) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }
    const { user, role } = userResult;

    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    if (role === 'Corretor' && cliente.userId !== user.id) {
      return res.status(403).json({ 
        error: 'Sem permissão para deletar este cliente' 
      });
    }


    await cliente.destroy();

    // Emitir evento socket para deleção de cliente
    try {
      getSocketIO().emit('cliente-removido', {
        clienteId: cliente.id,
        removidoPor: user.username
      });
    } catch (e) {
      console.warn('Socket.IO não inicializado:', e.message);
    }

    res.status(200).json({ 
      message: 'Cliente removido com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao remover cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// LIMPAR DOCUMENTOS DE UM CLIENTE ESPECÍFICO
router.delete('/clientes/:id/documentos/:tipo', authenticateToken, async (req, res) => {
  try {
    const { id, tipo } = req.params;
    
    const userResult = await findUserByEmail(req.user.email);
    if (!userResult) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }
    const { user, role } = userResult;

    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Verificar permissões
    if (role === 'Corretor' && cliente.userId !== user.id) {
      return res.status(403).json({ 
        error: 'Sem permissão para alterar documentos deste cliente' 
      });
    }

    // Verificar se o tipo de documento é válido
    const campoDocumento = documentTypeMap[tipo];
    if (!campoDocumento) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    // Remover arquivo físico se existir
    const caminhoDocumento = cliente[campoDocumento];
    if (caminhoDocumento) {
      const caminhoCompleto = path.join(__dirname, '../../uploads', caminhoDocumento);
      if (fs.existsSync(caminhoCompleto)) {
        try {
          fs.unlinkSync(caminhoCompleto);
          console.log(`🗑️ Documento removido: ${caminhoCompleto}`);
        } catch (error) {
          console.warn(`⚠️ Erro ao remover arquivo: ${error.message}`);
        }
      }
      
      // Remover diretório se estiver vazio
      const diretorioDocumento = path.dirname(caminhoCompleto);
      try {
        const arquivos = fs.readdirSync(diretorioDocumento);
        if (arquivos.length === 0) {
          fs.rmdirSync(diretorioDocumento);
          console.log(`🗑️ Diretório vazio removido: ${diretorioDocumento}`);
        }
      } catch (error) {
        // Ignora erro se diretório não existir ou não estiver vazio
      }
    }

    // Atualizar banco de dados

    await cliente.update({ [campoDocumento]: null });

    // Emitir evento socket para remoção de documento
    try {
      getSocketIO().emit('cliente-documento-removido', {
        clienteId: cliente.id,
        tipoDocumento: tipo,
        removidoPor: user.username
      });
    } catch (e) {
      console.warn('Socket.IO não inicializado:', e.message);
    }

    res.json({
      message: `Documento ${tipo} removido com sucesso`,
      cliente: {
        id: cliente.id,
        [campoDocumento]: null
      }
    });

  } catch (error) {
    console.error('Erro ao remover documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// VERIFICAR SE DOCUMENTO PERTENCE AO CLIENTE
router.get('/clientes/:id/documentos/:tipo/verificar', authenticateToken, async (req, res) => {
  try {
    const { id, tipo } = req.params;
    
    const userResult = await findUserByEmail(req.user.email);
    if (!userResult) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }
    const { user, role } = userResult;

    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Verificar permissões
    if (role === 'Corretor' && cliente.userId !== user.id) {
      return res.status(403).json({ 
        error: 'Sem permissão para acessar documentos deste cliente' 
      });
    }

    // Verificar se o tipo de documento é válido
    const campoDocumento = documentTypeMap[tipo];
    if (!campoDocumento) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    const caminhoDocumento = cliente[campoDocumento];
    if (!caminhoDocumento) {
      return res.status(404).json({ 
        exists: false,
        message: 'Documento não encontrado para este cliente' 
      });
    }

    // ✅ VALIDAÇÃO DE SEGURANÇA RIGOROSA:
    // 1. Verificar se o caminho contém o CPF do cliente
    // 2. Verificar se o caminho aponta para o diretório do cliente específico
    if (!caminhoDocumento.includes(cliente.cpf)) {
      console.warn(`⚠️ TENTATIVA DE ACESSO INSEGURO: Caminho ${caminhoDocumento} não contém CPF ${cliente.cpf}`);
      return res.status(403).json({ 
        exists: false,
        message: 'Documento não pertence a este cliente' 
      });
    }

    // 3. Verificar se o caminho contém o tipo de documento correto (exceto para tela_aprovacao que pode ter estrutura diferente)
    if (campoDocumento !== 'tela_aprovacao' && !caminhoDocumento.includes(campoDocumento)) {
      console.warn(`⚠️ TENTATIVA DE ACESSO INSEGURO: Caminho ${caminhoDocumento} não contém tipo ${campoDocumento}`);
      return res.status(403).json({ 
        exists: false,
        message: 'Tipo de documento não corresponde ao solicitado' 
      });
    }
    
    // Para tela_aprovacao, verificar se está na pasta correta
    if (campoDocumento === 'tela_aprovacao' && !caminhoDocumento.includes('tela_aprovacao')) {
      console.warn(`⚠️ TENTATIVA DE ACESSO INSEGURO: Caminho de tela_aprovacao ${caminhoDocumento} não contém pasta tela_aprovacao`);
      return res.status(403).json({ 
        exists: false,
        message: 'Tipo de documento não corresponde ao solicitado' 
      });
    }

    // Verificar se o arquivo existe fisicamente
    const caminhoCompleto = path.join(__dirname, '../../uploads', caminhoDocumento);
    const exists = fs.existsSync(caminhoCompleto);

    // ✅ VALIDAÇÃO EXTRA: Verificar se o arquivo está realmente no diretório do cliente correto
    const diretorioEsperado = path.join(__dirname, '../../uploads/clientes', cliente.cpf);
    const diretorioArquivo = path.dirname(caminhoCompleto);
    
    // Verificar se o arquivo está dentro do diretório do cliente
    const isWithinClientDirectory = diretorioArquivo.startsWith(diretorioEsperado);
    
    if (exists && !isWithinClientDirectory) {
      console.warn(`⚠️ TENTATIVA DE ACESSO INSEGURO: Arquivo ${caminhoCompleto} não está no diretório do cliente ${diretorioEsperado}`);
      return res.status(403).json({ 
        exists: false,
        message: 'Localização do documento inválida' 
      });
    }

    res.json({
      exists,
      path: caminhoDocumento,
      url: exists
        ? `${process.env.BASE_URL ? process.env.BASE_URL.replace(/\/$/, '') : req.protocol + '://' + req.get('host')}/api/uploads/${caminhoDocumento}`
        : null,
      message: exists ? 'Documento encontrado' : 'Arquivo físico não encontrado'
    });

  } catch (error) {
    console.error('Erro ao verificar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// UPLOADS DE TELAS DE APROVAÇÃO
const upload = multer({ dest: 'uploads/tela_aprovacao/' });

// Rota para upload de tela de aprovação
router.post('/clientes/:id/tela_aprovacao', upload.array('tela_aprovacao'), async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Processar e salvar informações dos arquivos no banco de dados
    const fileData = files.map(file => ({
      clienteId: id,
      filePath: file.path,
      fileName: file.originalname,
    }));

    await TelaAprovacao.bulkCreate(fileData);

    res.status(200).json({ message: 'Arquivos enviados com sucesso', files: fileData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===========================
// ROTAS PARA VISUALIZAÇÃO DE DOCUMENTOS
// ===========================

// ✅ NOVO ENDPOINT: Obter informações do PDF (número de páginas, etc.)
router.get('/clientes/:id/documentos/:tipo/info', authenticateToken, async (req, res) => {
  try {
    const { id, tipo } = req.params;

    // Buscar cliente
    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Verificar permissões
    if (!canUserAccessClient(req.user, cliente)) {
      return res.status(403).json({ error: 'Sem permissão para acessar este documento' });
    }

    // Mapear tipo para campo do banco
    const dbField = documentTypeMap[tipo];
    if (!dbField) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    // Verificar se o documento existe
    const documentPath = cliente[dbField];
    if (!documentPath) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // ✅ USAR O CAMINHO REAL DO ARQUIVO ARMAZENADO NO BANCO
    const fullPath = path.join(__dirname, '../../uploads', documentPath);
    
    console.log(`📄 Tentando acessar arquivo para INFO: ${fullPath}`);
    console.log(`📄 Caminho no banco: ${documentPath}`);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ Arquivo não encontrado: ${fullPath}`);
      return res.status(404).json({ error: 'Arquivo físico não encontrado' });
    }

    try {
      // Ler PDF e obter informações
      const pdfBytes = fs.readFileSync(fullPath);
      const { PDFDocument } = require('pdf-lib');
      const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      
      const totalPages = pdf.getPageCount();
      const fileSize = fs.statSync(fullPath).size;
      const lastModified = fs.statSync(fullPath).mtime;

      console.log(`📊 Informações do PDF: ${totalPages} páginas, ${fileSize} bytes`);

      res.json({
        totalPages,
        fileSize,
        lastModified,
        fileName: 'documento.pdf',
        type: tipo,
        clienteCpf: cliente.cpf
      });

    } catch (pdfError) {
      console.error(`❌ Erro ao ler informações do PDF: ${pdfError.message}`);
      return res.status(500).json({ 
        error: 'Erro ao processar documento PDF',
        details: pdfError.message 
      });
    }

  } catch (error) {
    console.error('❌ Erro ao obter informações do documento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// ✅ NOVO ENDPOINT: Servir página específica do PDF
router.get('/clientes/:id/documentos/:tipo/pagina/:pageNumber', authenticateToken, async (req, res) => {
  try {
    const { id, tipo, pageNumber } = req.params;
    const page = parseInt(pageNumber);

    if (isNaN(page) || page < 1) {
      return res.status(400).json({ error: 'Número de página inválido' });
    }

    // Buscar cliente
    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Verificar permissões
    if (!canUserAccessClient(req.user, cliente)) {
      return res.status(403).json({ error: 'Sem permissão para acessar este documento' });
    }

    // Mapear tipo para campo do banco
    const dbField = documentTypeMap[tipo];
    if (!dbField) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    // Verificar se o documento existe
    const documentPath = cliente[dbField];
    if (!documentPath) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // ✅ USAR O CAMINHO REAL DO ARQUIVO ARMAZENADO NO BANCO
    const fullPath = path.join(__dirname, '../../uploads', documentPath);
    
    console.log(`📄 Tentando acessar arquivo para PÁGINA: ${fullPath}`);
    console.log(`📄 Caminho no banco: ${documentPath}`);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ Arquivo não encontrado: ${fullPath}`);
      return res.status(404).json({ error: 'Arquivo físico não encontrado' });
    }

    try {
      // Usar PDFService para extrair página específica
      const pageBuffer = await pdfService.extractPageAsBuffer(fullPath, page);
      
      if (!pageBuffer) {
        return res.status(404).json({ error: 'Página não encontrada' });
      }

      // Configurar headers para PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      console.log(`📄 Servindo página ${page} do documento ${tipo} para cliente ${id}`);
      
      // Enviar buffer da página
      res.send(pageBuffer);

    } catch (pdfError) {
      console.error(`❌ Erro ao extrair página ${page}: ${pdfError.message}`);
      return res.status(500).json({ 
        error: 'Erro ao processar página do documento',
        details: pdfError.message 
      });
    }

  } catch (error) {
    console.error('❌ Erro ao servir página do documento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// ===========================
// FUNÇÕES AUXILIARES
// ===========================

// Verificar se o usuário pode acessar os dados do cliente
const canUserAccessClient = (user, cliente) => {
  if (!user || !cliente) return false;
  
  console.log(`🔐 Verificando permissões:`, {
    userId: user.id,
    userEmail: user.email,
    isAdmin: user.is_administrador,
    isCorrespondente: user.is_correspondente,
    isCorretor: user.is_corretor,
    clienteUserId: cliente.userId
  });
  
  // Administradores podem acessar todos os clientes
  if (user.is_administrador) {
    console.log(`✅ Acesso liberado: usuário é administrador`);
    return true;
  }
  
  // Correspondentes podem acessar todos os clientes
  if (user.is_correspondente) {
    console.log(`✅ Acesso liberado: usuário é correspondente`);
    return true;
  }
  
  // Corretores só podem acessar seus próprios clientes
  if (user.is_corretor) {
    const canAccess = cliente.userId === user.id;
    console.log(`${canAccess ? '✅' : '❌'} Corretor ${canAccess ? 'pode' : 'não pode'} acessar cliente (cliente.userId: ${cliente.userId}, user.id: ${user.id})`);
    return canAccess;
  }
  
  console.log(`❌ Acesso negado: usuário sem permissões adequadas`);
  return false;
};



// ===========================
// FUNÇÕES DE NOTIFICAÇÃO
// ===========================

// Buscar todos os correspondentes para notificação
const buscarCorrespondentes = async () => {
  try {
    const correspondentes = await User.findAll({
      where: { 
        is_correspondente: true,
        telefone: { [Op.not]: null }
      },
      attributes: ['id', 'first_name', 'last_name', 'username', 'email', 'telefone']
    });
    return correspondentes;
  } catch (error) {
    console.error('❌ Erro ao buscar correspondentes:', error);
    return [];
  }
};

// Notificar correspondentes sobre alterações no cliente
const notificarCorrespondentes = async (tipoNotificacao, dadosCliente, usuarioResponsavel, alteracoes = null) => {
  try {
    const correspondentes = await buscarCorrespondentes();
    
    if (correspondentes.length === 0) {
      console.log('📱 Nenhum correspondente encontrado para notificação');
      return { success: true, message: 'Nenhum correspondente para notificar' };
    }

    const notificacoes = [];

    for (const correspondente of correspondentes) {
      try {
        let endpoint, dadosNotificacao;

        switch (tipoNotificacao) {
          case 'cliente_criado':
            endpoint = '/notificarClienteCadastrado';
            dadosNotificacao = {
              clienteId: dadosCliente.id,
              clienteNome: dadosCliente.nome,
              usuarioResponsavel: usuarioResponsavel,
              telefoneUsuarioResponsavel: correspondente.telefone,
              cpfCliente: dadosCliente.cpf,
              telefoneCliente: dadosCliente.telefone,
              emailCliente: dadosCliente.email,
              valorRenda: dadosCliente.valor_renda,
              estado_civil: dadosCliente.estado_civil,
              naturalidade: dadosCliente.naturalidade,
              profissao: dadosCliente.profissao,
              data_admissao: dadosCliente.data_admissao,
              data_nascimento: dadosCliente.data_nascimento,
              renda_tipo: dadosCliente.renda_tipo,
              possui_carteira_mais_tres_anos: dadosCliente.possui_carteira_mais_tres_anos,
              numero_pis: dadosCliente.numero_pis,
              possui_dependente: dadosCliente.possui_dependente,
              status: dadosCliente.status,
              possui_fiador: dadosCliente.possui_fiador,
              fiador_nome: dadosCliente.fiador_nome,
              fiador_cpf: dadosCliente.fiador_cpf,
              fiador_telefone: dadosCliente.fiador_telefone,
              fiador_email: dadosCliente.fiador_email,
              possui_formularios_caixa: dadosCliente.possui_formularios_caixa,
              created_at: dadosCliente.created_at,
              conjuge_nome: dadosCliente.conjuge_nome,
              conjuge_email: dadosCliente.conjuge_email,
              conjuge_telefone: dadosCliente.conjuge_telefone,
              conjuge_cpf: dadosCliente.conjuge_cpf,
              conjuge_profissao: dadosCliente.conjuge_profissao,
              conjuge_data_nascimento: dadosCliente.conjuge_data_nascimento,
              conjuge_valor_renda: dadosCliente.conjuge_valor_renda,
              conjuge_renda_tipo: dadosCliente.conjuge_renda_tipo,
              conjuge_data_admissao: dadosCliente.conjuge_data_admissao
            };
            break;

          case 'cliente_atualizado':
            endpoint = '/notificarCorrespondenteClienteAtualizado';
            dadosNotificacao = {
              correspondenteNome: `${correspondente.first_name || ''} ${correspondente.last_name || ''}`.trim() || correspondente.username,
              correspondenteTelefone: correspondente.telefone,
              clienteNome: dadosCliente.nome,
              clienteCpf: dadosCliente.cpf,
              clienteStatus: dadosCliente.status,
              usuarioResponsavel: usuarioResponsavel,
              alteracoes: alteracoes || 'Dados do cliente atualizados',
              dataAtualizacao: new Date().toLocaleString('pt-BR')
            };
            break;

          case 'documentos_enviados':
            endpoint = '/notificarCorrespondenteDocumentosEnviados';
            dadosNotificacao = {
              clienteId: dadosCliente.id,
              clienteNome: dadosCliente.nome,
              clienteCpf: dadosCliente.cpf,
              documentosEnviados: dadosCliente.documentosEnviados || {},
              usuarioEnvio: dadosCliente.usuarioEnvio || usuarioResponsavel,
              nomeUsuarioEnvio: dadosCliente.nomeUsuarioEnvio || usuarioResponsavel,
              dataEnvio: dadosCliente.dataEnvio || new Date().toISOString(),
              observacoes: alteracoes || 'Novos documentos enviados'
            };
            break;

          default:
            continue;
        }

        // ✅ Enviar notificação sem restrições de rate limiting
        const resultado = await sendWhatsAppNotification(endpoint, dadosNotificacao, req.tenantId || req.user?.tenant_id);
        notificacoes.push({
          correspondente: correspondente.username,
          telefone: correspondente.telefone,
          sucesso: resultado.success,
          erro: resultado.error || null
        });

      } catch (error) {
        console.error(`❌ Erro ao notificar correspondente ${correspondente.username}:`, error);
        notificacoes.push({
          correspondente: correspondente.username,
          telefone: correspondente.telefone,
          sucesso: false,
          erro: error.message
        });
      }
    }

    console.log(`📱 Notificações enviadas para ${correspondentes.length} correspondentes:`, notificacoes);
    
    return {
      success: true,
      correspondentesNotificados: correspondentes.length,
      resultados: notificacoes
    };

  } catch (error) {
    console.error('❌ Erro ao notificar correspondentes:', error);
    return { success: false, error: error.message };
  }
};

module.exports = router;