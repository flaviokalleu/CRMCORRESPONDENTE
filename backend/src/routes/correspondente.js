// backend/src/routes/correspondente.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcrypt');
const { User } = require('../models');
const { Op } = require('sequelize'); // Adicionar esta importação
const authenticateToken = require('../middleware/authMiddleware');

// Configuração de caminhos
const uploadPath = path.join(__dirname, '../../uploads/imagem_correspondente');
const deletePath = path.join(uploadPath, 'deletar');

// Criar diretórios se não existirem
const initializeDirectories = async () => {
  try {
    await fs.mkdir(uploadPath, { recursive: true });
    await fs.mkdir(deletePath, { recursive: true });
    console.log('Diretórios de correspondente criados com sucesso');
  } catch (error) {
    console.error('Erro ao criar diretórios:', error);
  }
};

initializeDirectories();

// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1E9)}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

// Filtro para aceitar qualquer imagem
const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
  }
};

// Configuração do upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 5MB
    files: 1
  }
});

// Função para processar imagem
const processImage = async (inputPath, outputFileName) => {
  try {
    const outputPath = path.join(uploadPath, outputFileName);
    
    await sharp(inputPath)
      .resize({ 
        width: 800, 
        height: 800, 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .webp({ 
        quality: 85,
        effort: 4
      })
      .toFile(outputPath);

    console.log(`Imagem processada: ${outputFileName}`);
    return outputFileName;
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    throw new Error('Falha ao processar a imagem');
  }
};

// Função para deletar arquivo (versão melhorada)
const deleteFile = async (fileName) => {
  if (!fileName) return;
  
  const filePath = path.join(uploadPath, fileName);
  
  try {
    // Verificar se o arquivo existe antes de tentar deletar
    await fs.access(filePath);
    await fs.unlink(filePath);
    console.log(`Arquivo deletado: ${fileName}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`Arquivo não encontrado (já foi deletado): ${fileName}`);
      return; // Arquivo não existe, não é erro
    }
    
    console.error(`Erro ao deletar arquivo ${fileName}:`, error);
    
    try {
      const destinationPath = path.join(deletePath, fileName);
      await fs.rename(filePath, destinationPath);
      console.log(`Arquivo movido para pasta de deletar: ${fileName}`);
    } catch (moveError) {
      if (moveError.code !== 'ENOENT') {
        console.error(`Erro ao mover arquivo para deletar: ${moveError}`);
      }
    }
  }
};

// Função para validar dados do correspondente
const validateCorrespondenteData = (data) => {
  const { username, email, first_name, last_name, phone, password } = data;
  const errors = [];

  if (!username || username.trim().length < 3) {
    errors.push('Username deve ter pelo menos 3 caracteres');
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Email inválido');
  }

  if (!first_name || first_name.trim().length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres');
  }

  if (!last_name || last_name.trim().length < 2) {
    errors.push('Sobrenome deve ter pelo menos 2 caracteres');
  }

  if (!phone || phone.trim().length < 10) {
    errors.push('Telefone deve ter pelo menos 10 caracteres');
  }

  if (!password || password.length < 6) {
    errors.push('Senha deve ter pelo menos 6 caracteres');
  }

  return errors;
};

// Função para validar dados do correspondente (versão mais flexível para edição)
const validateCorrespondenteDataForUpdate = (data) => {
  const { username, email, first_name, last_name, phone } = data;
  const errors = [];

  if (username && username.trim().length < 3) {
    errors.push('Username deve ter pelo menos 3 caracteres');
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Email inválido');
  }

  if (first_name && first_name.trim().length < 2) {
    errors.push('Nome deve ter pelo menos 2 caracteres');
  }

  if (last_name && last_name.trim().length < 2) {
    errors.push('Sobrenome deve ter pelo menos 2 caracteres');
  }

  if (phone && phone.trim().length < 10) {
    errors.push('Telefone deve ter pelo menos 10 caracteres');
  }

  return errors;
};

// ROTAS

// Obter dados do correspondente logado
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { 
        id: req.user.id, 
        is_correspondente: true 
      },
      attributes: [
        'id', 'username', 'email', 'first_name', 'last_name', 
        'address', 'pix_account', 'telefone', 'photo', 
        'is_correspondente', 
        ['created_at', 'createdAt'] // Mapear created_at para createdAt
      ]
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'Correspondente não encontrado ou não autorizado' 
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Erro ao obter dados do correspondente:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Criar novo correspondente
router.post('/', upload.single('photo'), async (req, res) => {
  let uploadedFileName = null;

  try {
    // Validar se arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Por favor, envie uma imagem do correspondente' 
      });
    }

    uploadedFileName = req.file.filename;
    const { username, email, first_name, last_name, address, pix_account, phone, password } = req.body;

    // Validar dados
    const validationErrors = validateCorrespondenteData(req.body);
    if (validationErrors.length > 0) {
      await deleteFile(uploadedFileName);
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: validationErrors
      });
    }

    // Verificar se email ou username já existem
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [ // Corrigir de $or para Op.or
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      await deleteFile(uploadedFileName);
      return res.status(409).json({ 
        error: 'Email ou username já cadastrado' 
      });
    }

    // Processar imagem
    const processedImageName = `${Date.now()}_correspondente.webp`;
    await processImage(
      path.join(uploadPath, uploadedFileName),
      processedImageName
    );

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Criar correspondente
    const newCorrespondente = await User.create({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      password: hashedPassword,
      address: address ? address.trim() : null,
      pix_account: pix_account ? pix_account.trim() : null,
      telefone: phone.trim(),
      photo: processedImageName,
      is_correspondente: true
    });

    // Deletar arquivo original
    await deleteFile(uploadedFileName);

    // Renomear a foto para o padrão correspondente_ID.ext
    const ext = path.extname(uploadedFileName);
    const newPhotoName = `correspondente_${newCorrespondente.id}${ext}`;
    const oldProcessedPath = path.join(uploadPath, processedImageName);
    const newProcessedPath = path.join(uploadPath, newPhotoName);
    await fs.rename(oldProcessedPath, newProcessedPath);
    await newCorrespondente.update({ photo: newPhotoName });

    // Resposta de sucesso (sem senha)
    res.status(201).json({
      success: true,
      message: 'Correspondente criado com sucesso',
      data: {
        id: newCorrespondente.id,
        username: newCorrespondente.username,
        email: newCorrespondente.email,
        first_name: newCorrespondente.first_name,
        last_name: newCorrespondente.last_name,
        address: newCorrespondente.address,
        pix_account: newCorrespondente.pix_account,
        telefone: newCorrespondente.telefone,
        photo: newCorrespondente.photo,
        is_correspondente: newCorrespondente.is_correspondente,
        createdAt: newCorrespondente.createdAt
      }
    });

  } catch (error) {
    console.error('Erro ao criar correspondente:', error);

    // Limpar arquivo em caso de erro
    if (uploadedFileName) {
      await deleteFile(uploadedFileName);
    }

    // Tratar erros específicos do Sequelize
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ 
        error: 'Email ou username já cadastrado' 
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Dados de validação inválidos',
        details: error.errors.map(err => err.message)
      });
    }

    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Listar todos os correspondentes (admin)
router.get('/lista', async (req, res) => {
  try {
    const correspondentes = await User.findAll({ where: { is_correspondente: true } });
    res.json(correspondentes);
  } catch (error) {
    console.error('Erro ao listar correspondentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter correspondente específico por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const correspondente = await User.findOne({
      where: { 
        id: id,
        is_correspondente: true 
      },
      attributes: [
        'id', 'username', 'email', 'first_name', 'last_name', 
        'address', 'pix_account', 'telefone', 'photo', 
        'is_correspondente', 
        ['created_at', 'createdAt'] // Mapear created_at para createdAt
      ]
    });

    if (!correspondente) {
      return res.status(404).json({ 
        error: 'Correspondente não encontrado' 
      });
    }

    res.json({
      success: true,
      data: correspondente
    });

  } catch (error) {
    console.error('Erro ao obter correspondente:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Atualizar correspondente
router.put('/:id', upload.single('photo'), async (req, res) => {
  let uploadedFileName = null;
  let oldPhotoName = null;

  try {
    const { id } = req.params;
    const { username, email, first_name, last_name, address, pix_account, phone, password } = req.body;

    console.log(`Tentando atualizar correspondente ID: ${id}`);
    console.log('Dados recebidos:', { username, email, first_name, last_name, phone });

    // Buscar correspondente existente
    const existingCorrespondente = await User.findOne({
      where: { 
        id: id,
        is_correspondente: true 
      }
    });

    console.log('Correspondente encontrado:', existingCorrespondente ? 'Sim' : 'Não');

    if (!existingCorrespondente) {
      if (req.file) {
        await deleteFile(req.file.filename);
      }
      return res.status(404).json({ 
        error: 'Correspondente não encontrado',
        details: `Correspondente com ID ${id} não existe ou não é um correspondente válido`
      });
    }

    oldPhotoName = existingCorrespondente.photo;

    // Usar validação mais flexível para edição
    const validationErrors = validateCorrespondenteDataForUpdate(req.body);
    if (validationErrors.length > 0) {
      if (req.file) {
        await deleteFile(req.file.filename);
      }
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: validationErrors
      });
    }

    // Verificar se email ou username já existem (exceto o próprio)
    if (username || email) {
      const whereConditions = [];
      
      if (username) {
        whereConditions.push({ username: username.toLowerCase() });
      }
      
      if (email) {
        whereConditions.push({ email: email.toLowerCase() });
      }

      const duplicateUser = await User.findOne({
        where: {
          [Op.and]: [
            { id: { [Op.ne]: id } },
            { [Op.or]: whereConditions }
          ]
        }
      });

      if (duplicateUser) {
        if (req.file) {
          await deleteFile(req.file.filename);
        }
        return res.status(409).json({ 
          error: 'Email ou username já cadastrado por outro usuário' 
        });
      }
    }

    // Preparar dados para atualização (apenas campos fornecidos)
    const updateData = {};
    
    if (username) updateData.username = username.toLowerCase().trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (first_name) updateData.first_name = first_name.trim();
    if (last_name) updateData.last_name = last_name.trim();
    if (address !== undefined) updateData.address = address ? address.trim() : null;
    if (pix_account !== undefined) updateData.pix_account = pix_account ? pix_account.trim() : null;
    if (phone) updateData.telefone = phone.trim();

    // Processar nova foto se enviada
    if (req.file) {
      uploadedFileName = req.file.filename;
      const processedImageName = `${Date.now()}_correspondente_updated.webp`;
      
      await processImage(
        path.join(uploadPath, uploadedFileName),
        processedImageName
      );

      updateData.photo = processedImageName;
      
      // Deletar arquivo temporário
      await deleteFile(uploadedFileName);
      uploadedFileName = null; // Reset para não tentar deletar novamente
    }

    // Hash da nova senha se fornecida
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    console.log('Dados para atualização:', updateData);

    // Atualizar correspondente
    const [updatedRowsCount] = await User.update(updateData, {
      where: { id: id }
    });

    console.log(`Linhas atualizadas: ${updatedRowsCount}`);

    if (updatedRowsCount === 0) {
      return res.status(404).json({
        error: 'Nenhuma alteração foi feita',
        details: 'Correspondente não foi atualizado'
      });
    }

    // Buscar dados atualizados (corrigindo os nomes das colunas)
    const updatedCorrespondente = await User.findOne({
      where: { id: id },
      attributes: [
        'id', 'username', 'email', 'first_name', 'last_name', 
        'address', 'pix_account', 'telefone', 'photo', 
        'is_correspondente', 
        ['created_at', 'createdAt'],
        ['updated_at', 'updatedAt']
      ]
    });

    // Deletar foto antiga se uma nova foi enviada
    if (req.file && oldPhotoName) {
      await deleteFile(oldPhotoName);
    }

    res.json({
      success: true,
      message: 'Correspondente atualizado com sucesso',
      data: updatedCorrespondente
    });

  } catch (error) {
    console.error('Erro ao atualizar correspondente:', error);

    // Limpar arquivo em caso de erro
    if (uploadedFileName) {
      await deleteFile(uploadedFileName);
    }

    // Tratar erros específicos do Sequelize
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ 
        error: 'Email ou username já cadastrado' 
      });
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Dados de validação inválidos',
        details: error.errors.map(err => err.message)
      });
    }

    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Deletar correspondente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar correspondente
    const correspondente = await User.findOne({
      where: { 
        id: id,
        is_correspondente: true 
      }
    });

    if (!correspondente) {
      return res.status(404).json({ 
        error: 'Correspondente não encontrado' 
      });
    }

    const photoName = correspondente.photo;

    // Deletar correspondente do banco
    await User.destroy({
      where: { id: id }
    });

    // Deletar foto se existir
    if (photoName) {
      await deleteFile(photoName);
    }

    res.json({
      success: true,
      message: 'Correspondente deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar correspondente:', error);
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Middleware de tratamento de erros para multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'Arquivo muito grande. Máximo permitido: 5MB' 
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Muitos arquivos. Envie apenas uma imagem' 
      });
    }
  }
  
  if (error.message.includes('Apenas arquivos de imagem')) {
    return res.status(400).json({ 
      error: error.message 
    });
  }

  res.status(500).json({ 
    error: 'Erro no upload do arquivo' 
  });
});

// Adicionar rota para listar todos os usuários (para debug)
router.get('/debug/all', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'is_correspondente', 'first_name', 'last_name']
    });
    
    res.json({
      success: true,
      data: users,
      correspondentes: users.filter(u => u.is_correspondente),
      total: users.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
