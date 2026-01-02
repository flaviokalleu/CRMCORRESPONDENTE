const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração de diretórios organizados
const uploadDirectories = {
  clientes: path.join(__dirname, '../../uploads/clientes'),
  fiador: path.join(__dirname, '../../uploads/fiador_documentos'),
  formularios: path.join(__dirname, '../../uploads/formularios_caixa'),
  temp: path.join(__dirname, '../../uploads/temp')
};

// Criar todos os diretórios necessários
const ensureDirectories = () => {
  Object.values(uploadDirectories).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Diretório criado: ${path.basename(dir)}`);
    }
  });
};

ensureDirectories();

// Função para determinar o diretório baseado no tipo de arquivo
const getDestination = (fieldname) => {
  const destinationMap = {
    'fiadorDocumentos': uploadDirectories.fiador,
    'formulariosCaixa': uploadDirectories.formularios,
    'documentosPessoais': uploadDirectories.clientes,
    'extratoBancario': uploadDirectories.clientes,
    'documentosDependente': uploadDirectories.clientes,
    'documentosConjuge': uploadDirectories.clientes,
    'tela_aprovacao': uploadDirectories.clientes, // Adicionar mapeamento para tela de aprovação
    'notas': uploadDirectories.clientes
  };
  
  return destinationMap[fieldname] || uploadDirectories.temp;
};

// Configuração avançada de armazenamento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const destination = getDestination(file.fieldname);
    cb(null, destination);
  },
  filename: function (req, file, cb) {
    // Nome mais descritivo e único
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension).replace(/[^a-zA-Z0-9]/g, '_');
    
    const filename = `${file.fieldname}_${baseName}_${timestamp}_${randomId}${extension}`;
    cb(null, filename);
  }
});

// Filtro de arquivos mais robusto
const fileFilter = (req, file, cb) => {
  console.log(`🔍 Verificando arquivo: ${file.originalname} (${file.mimetype})`);
  
  // Tipos de arquivo permitidos
  const allowedMimeTypes = [
    // Imagens
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    
    // PDFs
    'application/pdf',
    
    // Documentos
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    
    // Texto
    'text/plain',
    'text/csv'
  ];
  
  // Extensões permitidas (backup para quando mimetype não está disponível)
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'
  ];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    console.log(`✅ Arquivo aceito: ${file.originalname}`);
    cb(null, true);
  } else {
    console.log(`❌ Arquivo rejeitado: ${file.originalname} (${file.mimetype})`);
    cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}. Tipos aceitos: ${allowedMimeTypes.join(', ')}`), false);
  }
};

// Configuração robusta do upload SEM LIMITES
const uploadFields = multer({ 
  storage: storage,
  fileFilter: fileFilter
  // ✅ REMOVIDO: limits - Sem limites de tamanho ou quantidade
}).fields([
  // Campos existentes
  { name: 'documentosPessoais' }, // Sem maxCount = ilimitado
  { name: 'extratoBancario' },
  { name: 'documentosDependente' },
  { name: 'documentosConjuge' },
  { name: 'notas' },
  
  // ✅ NOVOS CAMPOS
  { name: 'fiadorDocumentos' },
  { name: 'formulariosCaixa' },
  { name: 'tela_aprovacao' } // <-- Permitir uploads de tela de aprovação
]);

// Middleware para log detalhado de arquivos
const logUploadedFiles = (req, res, next) => {
  if (req.files && Object.keys(req.files).length > 0) {
    console.log('\n📁 === ARQUIVOS RECEBIDOS ===');
    console.log(`📊 Total de campos: ${Object.keys(req.files).length}`);
    
    let totalFiles = 0;
    let totalSize = 0;
    
    Object.entries(req.files).forEach(([fieldName, files]) => {
      console.log(`\n🔸 Campo: ${fieldName}`);
      console.log(`   Quantidade: ${files.length} arquivo(s)`);
      
      files.forEach((file, index) => {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        console.log(`   [${index + 1}] ${file.originalname} (${sizeInMB} MB)`);
        totalSize += file.size;
        totalFiles++;
      });
    });
    
    const totalSizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`\n📊 RESUMO: ${totalFiles} arquivos, ${totalSizeInMB} MB total`);
    console.log('🎯 === FIM DO LOG ===\n');
  } else {
    console.log('📁 Nenhum arquivo enviado');
  }
  
  next();
};

// Middleware robusto para tratamento de erros
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('❌ Erro do Multer:', {
      code: error.code,
      field: error.field,
      message: error.message
    });
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({ 
          success: false,
          error: 'Arquivo muito grande',
          details: `O arquivo ${error.field} excede o limite de tamanho permitido`,
          code: 'FILE_TOO_LARGE'
        });
        
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ 
          success: false,
          error: 'Muitos arquivos',
          details: `Limite de arquivos excedido para o campo ${error.field}`,
          code: 'TOO_MANY_FILES'
        });
        
      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({ 
          success: false,
          error: 'Muitos campos',
          details: 'Limite de campos de upload excedido',
          code: 'TOO_MANY_FIELDS'
        });
        
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ 
          success: false,
          error: 'Campo não esperado',
          details: `O campo '${error.field}' não é aceito para upload`,
          code: 'UNEXPECTED_FIELD',
          allowedFields: [
            'documentosPessoais', 'extratoBancario', 'documentosDependente', 
            'documentosConjuge', 'notas', 'fiadorDocumentos', 'formulariosCaixa'
          ]
        });
        
      default:
        return res.status(400).json({ 
          success: false,
          error: 'Erro de upload',
          details: error.message,
          code: error.code || 'UPLOAD_ERROR'
        });
    }
  }
  
  // Erros de filtro de arquivo
  if (error && error.message.includes('Tipo de arquivo não permitido')) {
    return res.status(415).json({ 
      success: false,
      error: 'Tipo de arquivo não suportado',
      details: error.message,
      code: 'UNSUPPORTED_FILE_TYPE'
    });
  }
  
  // Outros erros
  if (error) {
    console.error('❌ Erro de upload geral:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno no upload',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor',
      code: 'INTERNAL_UPLOAD_ERROR'
    });
  }
  
  next();
};

// Mapeamento robusto de tipos de documento
const documentTypeMap = {
  'documentosPessoais': 'documentos_pessoais',
  'extratoBancario': 'extrato_bancario',
  'documentosDependente': 'documentos_dependente',
  'documentosConjuge': 'documentos_conjuge',
  'fiadorDocumentos': 'fiador_documentos',
  'formulariosCaixa': 'formularios_caixa',
  'tela_aprovacao': 'tela_aprovacao' // <-- Adicionado para validação
};

// Função auxiliar para validar campos de upload
const validateUploadFields = (files) => {
  const allowedFields = Object.keys(documentTypeMap);
  const receivedFields = Object.keys(files || {});
  const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
  
  if (invalidFields.length > 0) {
    throw new Error(`Campos inválidos detectados: ${invalidFields.join(', ')}`);
  }
  
  return true;
};

// Função para limpar arquivos temporários em caso de erro
const cleanupTempFiles = (files) => {
  if (!files) return;
  
  Object.values(files).flat().forEach(file => {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlink(file.path, (err) => {
        if (err) console.error(`Erro ao limpar arquivo temporário: ${file.path}`, err);
        else console.log(`🗑️ Arquivo temporário removido: ${file.originalname}`);
      });
    }
  });
};

// Middleware para limpeza automática em caso de erro
const autoCleanup = (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400 && req.files) {
      console.log('🧹 Limpando arquivos devido a erro na requisição...');
      cleanupTempFiles(req.files);
    }
  });
  next();
};

module.exports = {
  uploadFields,
  logUploadedFiles,
  handleMulterError,
  autoCleanup,
  uploadDirectories, // <-- exporte isso!
  documentTypeMap,
  validateUploadFields,
  cleanupTempFiles,
  getDestination
};