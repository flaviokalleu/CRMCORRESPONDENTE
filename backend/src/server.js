const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const requestIp = require('request-ip');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

// ===== IMPORTAÇÕES DE ROTAS (centralizadas em routes/index.js) =====
const { mountRoutes } = require('./routes');
const authenticateToken = require('./middleware/authenticateToken');
const { resolveTenant, checkSubscription } = require('./middleware/tenantMiddleware');
const { checkFeature, getPlanUsage } = require('./middleware/featureGating');
const { tenantContextMiddleware, setupTenantScopes } = require('./middleware/tenantScope');

// ===== IMPORTAÇÃO DO SEQUELIZE =====
let sequelize;
try {
  sequelize = require('./models').sequelize;
  // Configurar scopes automáticos de tenant nos models
  setupTenantScopes();
  console.log('✅ Tenant scopes configurados');
} catch (error) {
  console.warn('Aviso: Nao foi possivel carregar sequelize:', error.message);
}

// ===== IMPORTAÇÕES DE JOBS E SERVIÇOS =====
const { iniciarJobParcelas } = require('./jobs/enviarParcelas');
const PDFService = require('./services/pdfService');
const { uploadDirectories } = require('./middleware/upload'); // já está correto

// ===== DEBUG DE CAMINHOS =====
console.log('🔍 Debug de caminhos:');
console.log('   __dirname:', __dirname);
console.log('   process.cwd():', process.cwd());
console.log('   Upload esperado:', path.resolve(__dirname, '../uploads'));
console.log('   Temp esperado:', path.resolve(__dirname, '../uploads/temp'));

console.log('✅ Upload directory carregado:', uploadDirectories.clientes);
console.log('   Temp esperado:', uploadDirectories.temp);

// Verificar se os diretórios existem
console.log('📁 Verificação de diretórios:');
console.log('   Upload Dir existe:', fs.existsSync(uploadDirectories.clientes));
console.log('   Temp Dir existe:', fs.existsSync(uploadDirectories.temp));

// Inicializar serviço de PDF com configurações otimizadas
const pdfService = new PDFService(uploadDirectories.clientes, {
  enableImageConversion: true, // Ativar conversão por imagem para PDFs problemáticos
  imageConversionTypes: ['ctps', 'carteira', 'rg', 'cpf'], // Tipos que usarão conversão por imagem
  dpi: 150, // Boa qualidade sem exagerar no tamanho
  quality: 85, // Qualidade balanceada
  maxWidth: 1200, // Resolução adequada
  enableDetailedLogs: process.env.NODE_ENV !== 'production' // Logs detalhados apenas em desenvolvimento
});

// ===== CONFIGURAÇÃO DO EXPRESS E SOCKET.IO =====
const http = require('http');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const mercadoPagoOrigins = [
  'https://www.mercadopago.com.br',
  'https://api.mercadopago.com',
  'https://sandbox.mercadopago.com.br'
];
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim()).concat(mercadoPagoOrigins)
  : [
      'http://localhost:3000',
      'http://localhost:3003',
      ...mercadoPagoOrigins
    ];
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Torna o io global para todo o backend
const { setSocketIO } = require('./socket');
setSocketIO(io);

// Exemplo de evento socket
io.on('connection', (socket) => {
  console.log('🟢 Novo cliente conectado via socket:', socket.id);
  socket.emit('welcome', 'Bem-vindo ao servidor Socket.IO!');

  // Inscrição em eventos WhatsApp por tenant
  socket.on('subscribe:whatsapp', ({ tenantId } = {}) => {
    if (tenantId) {
      socket.join(`whatsapp:${tenantId}`);
      console.log(`📱 Socket ${socket.id} inscrito em whatsapp:${tenantId}`);
    }
  });

  socket.on('unsubscribe:whatsapp', ({ tenantId } = {}) => {
    if (tenantId) {
      socket.leave(`whatsapp:${tenantId}`);
    }
  });

  socket.on('frontend-message', (msg) => {
    console.log('Mensagem recebida do frontend:', msg);
    // Responder para o mesmo cliente
    socket.emit('backend-response', `Recebido: ${msg}`);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado:', socket.id);
  });
});

// ===== MIDDLEWARE BÁSICO =====
app.use(requestIp.mw());

// ✅ CORS CONFIGURADO PARA ACEITAR WEBHOOKS DO MERCADO PAGO
// CORS liberado para qualquer origem em desenvolvimento
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? allowedOrigins : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ✅ MIDDLEWARES PARA RECEBER WEBHOOKS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ MIDDLEWARE PARA LOG DE REQUESTS
app.use((req, res, next) => {
  if (req.path.includes('/webhook')) {
    console.log('📥 Webhook Request:', {
      method: req.method,
      path: req.path,
      headers: req.headers,
      body: req.body
    });
  }
  next();
});

// REMOVIDO: bodyParser duplicado — express.json/urlencoded acima já faz o parsing

// ===== FUNÇÃO PARA ORGANIZAR UPLOADS NA INICIALIZAÇÃO =====
const organizeUploads = () => {
  const uploadsPath = path.join(__dirname, '../uploads');
  
  console.log('\n🔧 Organizando estrutura de uploads...');
  
  try {
    // Criar diretórios se não existirem
    const directories = [
      'imagem_correspondente',
      'imagem_administrador', 
      'corretor',
      'clientes',
      'imoveis',
      'laudos',
      'usuario',
      'fiador_documentos',
      'formularios_caixa'
    ];

    directories.forEach(dir => {
      const dirPath = path.join(uploadsPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Diretório criado: ${dir}`);
      }
    });

    // 1. Mover arquivos de diretórios aninhados para os corretos
    const problematicPaths = [
      { from: 'corretor/imagem_correspondente', to: 'imagem_correspondente' },
      { from: 'imagem_user/imagem_correspondente', to: 'imagem_correspondente' },
      { from: 'imagem_user/imagem_administrador', to: 'imagem_administrador' },
      { from: 'corretor/imagem_administrador', to: 'imagem_administrador' },
    ];
    
    problematicPaths.forEach(({ from, to }) => {
      const fromPath = path.join(uploadsPath, from);
      const toPath = path.join(uploadsPath, to);
      
      if (fs.existsSync(fromPath)) {
        // Criar diretório destino se não existir
        if (!fs.existsSync(toPath)) {
          fs.mkdirSync(toPath, { recursive: true });
        }
        
        // Mover todos os arquivos
        const files = fs.readdirSync(fromPath);
        files.forEach(file => {
          const oldFile = path.join(fromPath, file);
          const newFile = path.join(toPath, file);
          
          if (!fs.existsSync(newFile)) {
            fs.copyFileSync(oldFile, newFile);
            console.log(`✅ Movido: ${file} de ${from} para ${to}`);
          }
        });
        
        // Remover diretório vazio após mover arquivos
        try {
          fs.rmSync(fromPath, { recursive: true, force: true });
          console.log(`🗑️ Removido diretório aninhado: ${from}`);
        } catch (error) {
          console.log(`⚠️ Não foi possível remover ${from}: ${error.message}`);
        }
      }
    });
    
    // 2. Remover diretórios temporários vazios (NÃO remover diretórios base como 'corretor')
    ['imagem_user'].forEach(parentDir => {
      const parentPath = path.join(uploadsPath, parentDir);
      if (fs.existsSync(parentPath)) {
        try {
          const contents = fs.readdirSync(parentPath);
          if (contents.length === 0) {
            fs.rmdirSync(parentPath);
            console.log(`🗑️ Removido diretório vazio: ${parentDir}`);
          }
        } catch (error) {
          // Ignorar erros se o diretório não estiver vazio
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao organizar uploads:', error);
  }
};

// ===== MIDDLEWARE PERSONALIZADO PARA BUSCAR ARQUIVOS (SEGURO) =====
const findFileMiddleware = (req, res, next) => {
  const requestedPath = req.path;
  const uploadsPath = path.join(__dirname, '../uploads');
  
  console.log(`🔍 Buscando arquivo: ${requestedPath}`);
  
  // ⚠️ VALIDAÇÃO DE SEGURANÇA: Nunca buscar documentos de clientes genericamente
  // Se o caminho contém 'clientes/', deve ser o caminho exato especificado
  if (requestedPath.includes('/clientes/') && !requestedPath.includes('/temp/')) {
    // Para documentos de clientes, APENAS aceitar o caminho exato fornecido
    const exactPath = path.join(uploadsPath, requestedPath);
    console.log(`🔒 Verificação restrita para documento de cliente: ${exactPath}`);
    
    if (fs.existsSync(exactPath)) {
      console.log(`✅ Documento de cliente encontrado: ${exactPath}`);
      
      // ✅ CONFIGURAR HEADERS ESPECÍFICOS PARA PDFS DE CLIENTES
      if (exactPath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        
        // Headers para forçar atualização
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Usar timestamp do arquivo como ETag para detectar mudanças
        const stats = fs.statSync(exactPath);
        const etag = `"${stats.mtime.getTime()}-${stats.size}"`;
        res.setHeader('ETag', etag);
        res.setHeader('Last-Modified', stats.mtime.toUTCString());
        
        console.log(`📄 PDF de cliente servido com headers atualizados: ${path.basename(exactPath)}`);
      }
      
      return res.sendFile(exactPath);
    } else {
      console.log(`❌ Documento de cliente não encontrado: ${exactPath}`);
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
  }
  
  // Lista de possíveis localizações APENAS para arquivos que NÃO são documentos de clientes
  const possiblePaths = [
    // Caminho direto solicitado
    path.join(uploadsPath, requestedPath),
    
    // Mapeamentos específicos APENAS para tipos não-cliente
    path.join(uploadsPath, 'imagem_correspondente', path.basename(requestedPath)),
    path.join(uploadsPath, 'imagem_administrador', path.basename(requestedPath)),
    path.join(uploadsPath, 'corretor', path.basename(requestedPath)),
    path.join(uploadsPath, 'imoveis', path.basename(requestedPath)),
    path.join(uploadsPath, 'laudos', path.basename(requestedPath)),
    path.join(uploadsPath, 'usuario', path.basename(requestedPath)),
    
    // Casos específicos do log (excluindo clientes)
    requestedPath.includes('imagem_correspondente') ? 
      path.join(uploadsPath, 'imagem_correspondente', path.basename(requestedPath)) : null,
    
    requestedPath.includes('corretor') ? 
      path.join(uploadsPath, 'corretor', path.basename(requestedPath)) : null,

    requestedPath.includes('laudos') ? 
      path.join(uploadsPath, 'laudos', path.basename(requestedPath)) : null,

    requestedPath.includes('imagem_user') ? 
      path.join(uploadsPath, 'usuario', path.basename(requestedPath)) : null,
    
    requestedPath.includes('usuario') ? 
      path.join(uploadsPath, 'usuario', path.basename(requestedPath)) : null
  ].filter(Boolean);
  
  // Tentar encontrar o arquivo em cada localização possível
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      console.log(`✅ Arquivo encontrado em: ${filePath}`);
      return res.sendFile(filePath);
    }
  }

  // Busca recursiva em uploads/clientes se não encontrou
  const clientesDir = path.join(uploadsPath, 'clientes');
  let foundInClientes = null;
  if (fs.existsSync(clientesDir)) {
    const findFileRecursive = (dir, maxDepth = 5, currentDepth = 0) => {
      if (currentDepth >= maxDepth) return null;
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          const found = findFileRecursive(fullPath, maxDepth, currentDepth + 1);
          if (found) return found;
        } else if (file.name === path.basename(requestedPath)) {
          return fullPath;
        }
      }
      return null;
    };
    foundInClientes = findFileRecursive(clientesDir);
    if (foundInClientes) {
      console.log(`✅ Arquivo encontrado recursivamente em clientes: ${foundInClientes}`);
      return res.sendFile(foundInClientes);
    }
  }
  
  console.log(`❌ Arquivo não encontrado: ${requestedPath}`);
  console.log(`📍 Caminhos testados:`, possiblePaths.slice(0, 7)); // Limitar log
  next();
};

// ===== MIDDLEWARE DE LOG DETALHADO PARA UPLOADS =====
app.use('/api/uploads', (req, res, next) => {
  console.log('📁 Requisição de upload recebida:');
  console.log('   URL solicitada:', req.url);
  console.log('   Método:', req.method);
  console.log('   Path completo:', req.path);
  
  const fullPath = path.join(__dirname, '../uploads', req.url);
  console.log('   Caminho no sistema:', fullPath);
  console.log('   Arquivo existe:', fs.existsSync(fullPath));
  
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    console.log('   Tamanho do arquivo:', stats.size, 'bytes');
    console.log('   Modificado em:', stats.mtime);
  }
  
  next();
});

// ===== ROTAS DE ARQUIVOS ESTÁTICOS COM MIDDLEWARE PERSONALIZADO =====
// Usar o middleware personalizado antes do express.static
app.use('/api/uploads', findFileMiddleware);

// Manter as rotas estáticas como fallback
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, '../Uploads'))); // Compatibilidade

// Rotas específicas organizadas
app.use('/api/uploads/imagem_correspondente', express.static(path.join(__dirname, '../uploads/imagem_correspondente')));
app.use('/api/uploads/imagem_administrador', express.static(path.join(__dirname, '../uploads/imagem_administrador')));
app.use('/api/uploads/corretor', express.static(path.join(__dirname, '../uploads/corretor')));
app.use('/api/uploads/correspondente', express.static(path.join(__dirname, '../uploads/imagem_correspondente')));
app.use('/api/uploads/imagem_user', express.static(path.join(__dirname, '../uploads/usuario')));
app.use('/api/uploads/usuario', express.static(path.join(__dirname, '../uploads/usuario')));
app.use('/api/uploads/imoveis', express.static(path.join(__dirname, '../uploads/imoveis')));
app.use('/api/uploads/clientes', express.static(path.join(__dirname, '../uploads/clientes')));
app.use('/api/uploads/laudos', express.static(path.join(__dirname, '../uploads/laudos')));
app.use('/api/uploads/fiador_documentos', express.static(path.join(__dirname, '../uploads/fiador_documentos')));
app.use('/api/uploads/formularios_caixa', express.static(path.join(__dirname, '../uploads/formularios_caixa')));

// Rota adicional para documentos com headers corretos
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    // Definir headers corretos para PDFs
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      
      // ✅ HEADERS PARA EVITAR CACHE E FORÇAR ATUALIZAÇÃO
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Adicionar timestamp para forçar atualização
      res.setHeader('Last-Modified', new Date().toUTCString());
      
      // ETag baseado no timestamp para forçar reload
      res.setHeader('ETag', `"${Date.now()}"`);
      
      console.log(`📄 Servindo PDF com headers anti-cache: ${filePath}`);
    }
  },
  // ✅ DESABILITAR CACHE COMPLETAMENTE PARA UPLOADS
  etag: false,
  lastModified: false,
  maxAge: 0
}));

// ===== HEALTH CHECK =====
app.get('/api/health', async (req, res) => {
  try {
    if (sequelize) {
      await sequelize.authenticate();
    }
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// ===== MIDDLEWARE DE TENANT (contexto automático para rotas autenticadas) =====
app.use('/api', (req, res, next) => {
  const publicPaths = ['/auth', '/tenant', '/health', '/uploads', '/webhook'];
  if (publicPaths.some(p => req.path.startsWith(p))) return next();

  if (req.user && req.user.tenant_id) {
    req.tenantId = req.user.tenant_id;
    req.isSuperAdmin = req.user.is_super_admin || false;

    if (req.isSuperAdmin && req.headers['x-tenant-id']) {
      req.tenantId = parseInt(req.headers['x-tenant-id'], 10);
    }
  }
  next();
});

// Contexto assíncrono do tenant (ativa os hooks automáticos do Sequelize)
app.use(tenantContextMiddleware);

// ===== MONTAGEM CENTRALIZADA DE ROTAS =====
mountRoutes(app, { authenticateToken, resolveTenant, checkSubscription, getPlanUsage });

// ===== ROTAS UTILITÁRIAS =====

// Rota de teste para verificar se os arquivos existem
app.get('/api/test-file/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const uploadsPath = path.join(__dirname, '../uploads');
  
  // Locais possíveis para o arquivo
  const possiblePaths = [
    path.join(uploadsPath, type, filename),
    path.join(uploadsPath, 'imagem_correspondente', filename),
    path.join(uploadsPath, 'imagem_administrador', filename),
    path.join(uploadsPath, 'corretor', filename),
    path.join(uploadsPath, 'laudos', filename),
    path.join(uploadsPath, 'fiador_documentos', filename),
    path.join(uploadsPath, 'formularios_caixa', filename),
  ];
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return res.json({ 
        exists: true, 
        path: filePath,
        url: `${req.protocol}://${req.get('host')}/api/uploads/${type}/${filename}`,
        actualLocation: filePath
      });
    }
  }
  
  res.status(404).json({ 
    exists: false, 
    searchedPaths: possiblePaths,
    message: 'Arquivo não encontrado em nenhuma localização'
  });
});

// Rota para listar arquivos em um diretório de upload
app.get('/api/list-uploads/:type?', (req, res) => {
  const { type } = req.params;
  
  try {
    const uploadsPath = type 
      ? path.join(__dirname, '../uploads', type)
      : path.join(__dirname, '../uploads');
    
    if (!fs.existsSync(uploadsPath)) {
      return res.status(404).json({ 
        error: 'Diretório não encontrado',
        path: uploadsPath
      });
    }

    const files = fs.readdirSync(uploadsPath, { withFileTypes: true });
    const result = files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      size: file.isFile() ? fs.statSync(path.join(uploadsPath, file.name)).size : null,
      url: file.isDirectory() 
        ? null 
        : `${req.protocol}://${req.get('host')}/api/uploads/${type ? type + '/' : ''}${file.name}`
    }));

    res.json({
      path: uploadsPath,
      files: result,
      total: result.length
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao listar arquivos',
      message: error.message
    });
  }
});

// Rota para reorganizar uploads manualmente
app.post('/api/reorganize-uploads', (req, res) => {
  try {
    organizeUploads();
    res.json({
      success: true,
      message: 'Uploads reorganizados com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro ao reorganizar uploads',
      message: error.message
    });
  }
});

// Rota para mapear arquivo específico
app.get('/api/find-file/:filename', (req, res) => {
  const { filename } = req.params;
  const uploadsPath = path.join(__dirname, '../uploads');
  
  // Buscar arquivo recursivamente (com limite de profundidade)
  const findFileRecursive = (dir, maxDepth = 5, currentDepth = 0) => {
    if (currentDepth >= maxDepth) return null;
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        const found = findFileRecursive(fullPath, maxDepth, currentDepth + 1);
        if (found) return found;
      } else if (file.name === filename) {
        return fullPath;
      }
    }
    return null;
  };
  
  const foundPath = findFileRecursive(uploadsPath);
  
  if (foundPath) {
    const relativePath = path.relative(uploadsPath, foundPath);
    res.json({
      found: true,
      path: foundPath,
      relativePath: relativePath,
      url: `${req.protocol}://${req.get('host')}/api/uploads/${relativePath.replace(/\\/g, '/')}`
    });
  } else {
    res.status(404).json({
      found: false,
      filename,
      message: 'Arquivo não encontrado'
    });
  }
});

// Rota específica para debug de documentos
app.get('/api/cliente/:id/documento/:tipo', async (req, res) => {
  try {
    const { id, tipo } = req.params;
    
    // Importar Cliente só quando necessário
    let Cliente;
    try {
      Cliente = require('./models').Cliente;
    } catch (error) {
      return res.status(500).json({ error: 'Modelo Cliente não encontrado' });
    }
    
    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    
    const documentPath = cliente[tipo];
    if (!documentPath) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    
    const fullPath = path.join(__dirname, '../uploads', documentPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no sistema' });
    }
    
    res.json({
      cliente_id: id,
      tipo_documento: tipo,
      caminho_relativo: documentPath,
      caminho_completo: fullPath,
      arquivo_existe: true,
      url_acesso: `${req.protocol}://${req.get('host')}/api/uploads/${documentPath}`
    });
    
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== MANIPULAÇÃO DE ERROS (middleware global) =====
app.use(errorHandler);

// ===== EXECUTAR LIMPEZA DA PASTA TEMP =====
// Executar limpeza da pasta temp a cada 1 hora
setInterval(() => {
  console.log('🔄 Executando limpeza automática da pasta temp...');
  PDFService.cleanupTempDirectory();
}, 60 * 60 * 1000); // 1 hora

// Limpeza inicial após 5 minutos do servidor iniciar
setTimeout(() => {
  console.log('🔄 Executando limpeza inicial da pasta temp...');
  PDFService.cleanupTempDirectory();
}, 60 * 60 * 1000); // 5 minutos

// ===== INICIALIZAÇÃO DO SERVIDOR =====
const PORT = process.env.PORT || 8000;

// Organizar uploads na inicialização
organizeUploads();

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Servidor rodando');
  logger.info({ url: process.env.FRONTEND_URL || 'http://localhost:3000' }, 'Frontend URL');
  logger.info({ url: `http://localhost:${PORT}` }, 'Backend URL');

  // Iniciar job de parcelas
  try {
    iniciarJobParcelas();
    logger.info('Job de parcelas iniciado');
  } catch (error) {
    logger.error({ err: error }, 'Erro ao iniciar job de parcelas');
  }
});

// ===== GRACEFUL SHUTDOWN =====
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    if (sequelize) {
      try {
        await sequelize.close();
        console.log('Database connection closed.');
      } catch (err) {
        console.error('Error closing database:', err);
      }
    }
    process.exit(0);
  });
  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason }, 'Unhandled Rejection');
});

// Export both the app and sequelize instance
module.exports = {
  app,
  sequelize
};