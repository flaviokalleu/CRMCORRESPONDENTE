const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { User, Token } = require('../models');
const { Op } = require('sequelize');
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const { validateLogin } = require('../middleware/validators');
const SECRET_KEY = process.env.JWT_SECRET_KEY || 'your_jwt_secret_key';
const REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET_KEY || 'your_jwt_refresh_secret_key';
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

// ===== MIDDLEWARE DE PARSING PARA ESTA ROTA =====
// Adicionar middleware específico para parsing JSON antes das rotas
router.use((req, res, next) => {
  // Se não é multipart/form-data, aplicar JSON parser
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    express.json({ limit: '50mb' })(req, res, (err) => {
      if (err) return next(err);
      express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
    });
  } else {
    next();
  }
});

// ===== CONFIGURAÇÃO DO MULTER =====
const getUploadPath = (user) => {
  let folder = 'imagem_user';
  
  if (user?.is_administrador) {
    folder = 'imagem_administrador';
  } else if (user?.is_correspondente) {
    folder = 'imagem_correspondente';
  } else if (user?.is_corretor) {
    folder = 'corretor';
  }
  
  return folder;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determinar pasta baseado no usuário atual ou tipo
    let uploadPath;
    
    if (req.user) {
      uploadPath = getUploadPath(req.user);
    } else {
      // Fallback para uploads genéricos
      uploadPath = 'imagem_user';
    }
    
    const fullPath = path.join(UPLOAD_DIR, uploadPath);
    
    // Criar diretório se não existir
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    console.log(`📁 Upload destino: ${fullPath}`);
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const extension = path.extname(file.originalname);
    const filename = `${timestamp}_${originalName}${extension}`;
    
    console.log(`📄 Arquivo gerado: ${filename}`);
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  // Verificar se é uma imagem
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limite
  }
});

// ===== FUNÇÕES HELPER =====
const getUserRole = (user) => {
  if (user.is_administrador) return 'Administrador';
  if (user.is_corretor) return 'Corretor';
  if (user.is_correspondente) return 'Correspondente';
  return 'User';
};

const getExpirationDate = (minutes) => {
  return new Date(Date.now() + minutes * 60000);
};

const generateTokens = (user, role) => {
  const payload = {
    id: user.id,
    email: user.email,
    role,
    is_corretor: user.is_corretor,
    is_correspondente: user.is_correspondente,
    is_administrador: user.is_administrador,
    tenant_id: user.tenant_id || null,
    is_super_admin: user.is_super_admin || false
  };

  return {
    token: jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' }),
    refreshToken: jwt.sign(payload, REFRESH_SECRET_KEY, { expiresIn: '7d' })
  };
};

// ===== MIDDLEWARE DE AUTENTICAÇÃO =====
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  try {
    const tokenRecord = await Token.findOne({ where: { token } });
    if (!tokenRecord || new Date() > tokenRecord.expires_at) {
      return res.status(401).json({ message: 'Token inválido ou expirado' });
    }

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Falha na autenticação do token' });
      }
      
      // Buscar usuário completo no banco
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      req.user = {
        ...decoded,
        ...user.toJSON()
      };
      next();
    });
  } catch (error) {
    console.error('Erro ao verificar o token:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// ===== ROTAS DE AUTENTICAÇÃO =====

// Rota de login - CORRIGIDA
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
  console.log('🔐 Tentativa de login recebida');
  console.log('📋 Headers:', req.headers);
  console.log('📦 Body:', req.body);
  
  if (!req.body) {
    console.error('❌ req.body é undefined');
    return res.status(400).json({ 
      error: 'Dados não recebidos', 
      message: 'Verifique se o Content-Type está correto' 
    });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    console.error('❌ Email ou senha não fornecidos');
    return res.status(400).json({ 
      error: 'Email e senha são obrigatórios.',
      received: { email: !!email, password: !!password }
    });
  }

  try {
    console.log(`🔍 Buscando usuário: ${email}`);
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.error('❌ Usuário não encontrado');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    console.log('🔒 Verificando senha...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.error('❌ Senha inválida');
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const role = getUserRole(user);
    const { token, refreshToken } = generateTokens(user, role);

    console.log('💾 Salvando token no banco...');
    
    try {
      // Primeiro, remover tokens antigos do usuário
      await Token.destroy({
        where: { 
          user_id: user.id 
        }
      });

      // Depois, criar novo token
      await Token.create({
        token,
        refresh_token: refreshToken,
        user_id: user.id,
        user_type: role,
        expires_at: getExpirationDate(60), // 1 hora
        email: user.email,
        created_at: new Date(),
        updated_at: new Date()
      });

      console.log('✅ Token salvo com sucesso');
    } catch (tokenError) {
      console.error('💥 Erro ao salvar token:', tokenError);
      
      // Se falhar ao salvar token, tentar novamente sem refresh_token duplicado
      try {
        await Token.destroy({
          where: { 
            [Op.or]: [
              { user_id: user.id },
              { token },
              { refresh_token: refreshToken }
            ]
          }
        });

        await Token.create({
          token,
          refresh_token: refreshToken,
          user_id: user.id,
          user_type: role,
          expires_at: getExpirationDate(60),
          email: user.email,
          created_at: new Date(),
          updated_at: new Date()
        });

        console.log('✅ Token salvo na segunda tentativa');
      } catch (secondError) {
        console.error('💥 Erro crítico ao salvar token:', secondError);
        return res.status(500).json({ 
          error: 'Erro interno do servidor ao processar login' 
        });
      }
    }

    console.log('✅ Login realizado com sucesso');
    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role,
        first_name: user.first_name,
        last_name: user.last_name,
        is_corretor: user.is_corretor,
        is_correspondente: user.is_correspondente,
        is_administrador: user.is_administrador,
        tenant_id: user.tenant_id,
        is_super_admin: user.is_super_admin || false
      }
    });
  } catch (error) {
    console.error('💥 Erro ao autenticar:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rota para refresh de token
router.post('/refresh-token', async (req, res) => {
  console.log('🔄 Refresh token solicitado');
  
  if (!req.body) {
    return res.status(400).json({ message: 'Dados não recebidos' });
  }

  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token não fornecido' });
  }

  try {
    const tokenRecord = await Token.findOne({ where: { refresh_token: refreshToken } });
    if (!tokenRecord || new Date() > tokenRecord.expires_at) {
      return res.status(403).json({ message: 'Refresh token inválido ou expirado' });
    }

    jwt.verify(refreshToken, REFRESH_SECRET_KEY, async (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Falha na autenticação do refresh token' });
      }

      const { token: newToken } = generateTokens(user, user.role);
      
      await Token.update(
        { 
          token: newToken,
          expires_at: getExpirationDate(60),
          updated_at: new Date()
        },
        { where: { refresh_token: refreshToken } }
      );

      return res.json({ token: newToken });
    });
  } catch (error) {
    console.error('Erro ao verificar o refresh token:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para validar o token
router.post('/validate-token', authenticateToken, (req, res) => {
  res.json({ 
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Get user profile - melhorada
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const role = getUserRole(user);
    const userData = user.toJSON();
    res.json({
      user: userData,
      type: role,
      role: role.toLowerCase(),
      tenant_id: userData.tenant_id,
      is_super_admin: userData.is_super_admin || false
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Nova rota para verificar autenticação automaticamente - CORRIGIDA
router.get('/check-auth', async (req, res) => {
  console.log('🔍 Verificando autenticação...');
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('📝 Token recebido:', token ? `${token.substring(0, 20)}...` : 'Nenhum');

  if (!token) {
    console.log('❌ Nenhum token fornecido');
    return res.status(401).json({ 
      authenticated: false, 
      message: 'Token não fornecido' 
    });
  }

  try {
    // 1. Verificar se o token existe no banco de dados
    console.log('🔍 Buscando token no banco...');
    const tokenRecord = await Token.findOne({ 
      where: { token },
      include: [{
        model: User,
        as: 'user',
        attributes: { exclude: ['password'] }
      }]
    });

    if (!tokenRecord) {
      console.log('❌ Token não encontrado no banco');
      return res.status(401).json({ 
        authenticated: false, 
        message: 'Token não encontrado' 
      });
    }

    // 2. Verificar se o token não expirou
    const now = new Date();
    if (now > tokenRecord.expires_at) {
      console.log('❌ Token expirado:', {
        now: now.toISOString(),
        expires: tokenRecord.expires_at.toISOString()
      });
      
      // Remover token expirado
      await Token.destroy({ where: { token } });
      
      return res.status(401).json({ 
        authenticated: false, 
        message: 'Token expirado' 
      });
    }

    // 3. Verificar se o token JWT é válido
    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      if (err) {
        console.log('❌ Token JWT inválido:', err.message);
        
        // Remover token inválido
        await Token.destroy({ where: { token } });
        
        return res.status(401).json({ 
          authenticated: false, 
          message: 'Token inválido' 
        });
      }
      
      // 4. Buscar usuário atual
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      
      if (!user) {
        console.log('❌ Usuário não encontrado:', decoded.id);
        
        // Remover token de usuário inexistente
        await Token.destroy({ where: { token } });
        
        return res.status(404).json({ 
          authenticated: false, 
          message: 'Usuário não encontrado' 
        });
      }

      // 5. Atualizar último acesso
      await Token.update(
        { 
          updated_at: new Date(),
          // Opcional: estender tempo de vida do token
          expires_at: getExpirationDate(60) // +1 hora
        },
        { where: { token } }
      );

      const role = getUserRole(user);
      
      console.log('✅ Token válido para usuário:', user.email);
      
      const userData = user.toJSON();
      res.json({
        authenticated: true,
        user: userData,
        type: role,
        role: role.toLowerCase(),
        token,
        expiresAt: tokenRecord.expires_at,
        tenant_id: userData.tenant_id,
        is_super_admin: userData.is_super_admin || false
      });
    });
  } catch (error) {
    console.error('💥 Erro ao verificar autenticação:', error);
    res.status(500).json({ 
      authenticated: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Get user by email
router.get('/users/:email', authenticateToken, async (req, res) => {
  try {
    const { email } = req.params;
    
    if (req.user.email !== email && !req.user.is_administrador) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const user = await User.findOne({ 
      where: { email },
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário por email:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Update user profile
router.put('/users/:email', authenticateToken, upload.single('photo'), async (req, res) => {
  console.log('📝 Atualizando perfil do usuário');
  console.log('📦 Body:', req.body);
  console.log('📄 File:', req.file);
  
  const { email } = req.params;
  
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar permissões
    if (req.user.email !== email && !req.user.is_administrador) {
      return res.status(403).json({ message: 'Sem permissão para atualizar este usuário' });
    }

    const updateData = { ...req.body };

    // Hash da senha se fornecida
    if (updateData.password) {
      console.log('🔒 Atualizando senha...');
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    // Processar upload de foto
    if (req.file) {
      console.log('📸 Processando upload de foto...');
      const uploadPath = getUploadPath(user);
      updateData.photo = req.file.filename;
      
      console.log(`✅ Foto salva: ${uploadPath}/${req.file.filename}`);
    }

    await user.update(updateData);
    
    console.log('✅ Perfil atualizado com sucesso');
    res.json({ 
      message: 'Perfil atualizado com sucesso',
      photo: updateData.photo ? {
        filename: updateData.photo,
        url: `${req.protocol}://${req.get('host')}/api/uploads/${getUploadPath(user)}/${updateData.photo}`
      } : undefined
    });
  } catch (error) {
    console.error('💥 Erro ao atualizar perfil:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Logout route
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    await Token.destroy({ where: { token } });
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota de teste para debug
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth routes funcionando',
    timestamp: new Date().toISOString(),
    uploadDir: UPLOAD_DIR
  });
});

module.exports = { router, authenticateToken };