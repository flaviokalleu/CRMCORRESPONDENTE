const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcrypt');
const { User } = require('../models');
const { Op } = require('sequelize');
const authenticateToken = require('../middleware/authMiddleware');
const formidable = require('formidable');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads/corretor');

// Garante que o diretório existe
fs.mkdir(uploadDir, { recursive: true });

const validateCorretorData = (data) => {
  const errors = [];
  const username = Array.isArray(data.username) ? data.username[0] : data.username;
  const email = Array.isArray(data.email) ? data.email[0] : data.email;
  const first_name = Array.isArray(data.first_name) ? data.first_name[0] : data.first_name;
  const last_name = Array.isArray(data.last_name) ? data.last_name[0] : data.last_name;
  const telefone = Array.isArray(data.telefone) ? data.telefone[0] : data.telefone;
  const password = Array.isArray(data.password) ? data.password[0] : data.password;

  if (!username || username.trim().length < 3) errors.push('Username deve ter pelo menos 3 caracteres');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email deve ser válido');
  if (!first_name || first_name.trim().length < 2) errors.push('Nome deve ter pelo menos 2 caracteres');
  if (!last_name || last_name.trim().length < 2) errors.push('Sobrenome deve ter pelo menos 2 caracteres');
  if (!telefone || telefone.trim().length < 10) errors.push('Telefone deve ter pelo menos 10 dígitos');
  if (!password || password.length < 6) errors.push('Senha deve ter pelo menos 6 caracteres');
  return errors;
};

// ==================== ROTAS ====================

// GET /corretor/me - Obter dados do corretor logado
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const corretor = await User.findOne({
      where: { 
        id: req.user.id, 
        is_corretor: true 
      },
      attributes: [
        'id', 'username', 'email', 'first_name', 'last_name',
        'creci', 'address', 'pix_account', 'telefone', 'photo',
        'created_at'
      ]
    });

    if (!corretor) {
      return res.status(404).json({
        success: false,
        message: 'Corretor não encontrado'
      });
    }

    res.json({
      success: true,
      data: corretor
    });

  } catch (error) {
    console.error('❌ Erro ao buscar corretor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /corretor - Criar novo corretor usando formidable (apenas upload, sem tratar imagem)
router.post('/', async (req, res) => {
  console.log('[BACKEND] Recebendo POST /corretor');
  const form = new formidable.IncomingForm({
    multiples: false,
    maxFileSize: 10 * 1024 * 1024,
    uploadDir,
    keepExtensions: true,
    filename: (name, ext, part, form) => {
      // Gera um nome único para o arquivo
      const timestamp = Date.now();
      const safeName = part.originalFilename.replace(/\s+/g, '_');
      return `${timestamp}_${safeName}`;
    }
  });

  form.on('fileBegin', (name, file) => {
    console.log(`[BACKEND] Iniciando upload do arquivo: ${file.originalFilename}`);
  });

  form.on('progress', (bytesReceived, bytesExpected) => {
    console.log(`[BACKEND] Progresso: ${bytesReceived}/${bytesExpected}`);
  });

  form.on('error', (err) => {
    console.error('[BACKEND] Erro no formidable:', err);
  });

  form.parse(req, async (err, fields, files) => {
    console.log('[BACKEND] Callback do formidable chamado');
    let uploadedFilePath = null;
    try {
      if (err) {
        console.error('[BACKEND] Erro no parse:', err);
        return res.status(400).json({ success: false, message: 'Erro ao processar upload', details: err.message });
      }

      console.log('[BACKEND] Fields recebidos:', fields);
      console.log('[BACKEND] Files recebidos:', files);

      if (!files.photo) {
        console.warn('[BACKEND] Nenhuma foto enviada');
        return res.status(400).json({ success: false, message: 'Foto é obrigatória' });
      }

      // CORREÇÃO: Acessar o primeiro elemento do array
      const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
      uploadedFilePath = photoFile.filepath;

      // Verificação: aceitar apenas imagens
      if (!photoFile.mimetype || !photoFile.mimetype.startsWith('image/')) {
        await fs.unlink(uploadedFilePath);
        return res.status(400).json({ success: false, message: 'Apenas arquivos de imagem são permitidos!' });
      }

      console.log('[BACKEND] Caminho do arquivo salvo:', uploadedFilePath);

      // EXTRAIR VALORES DOS ARRAYS LOGO NO INÍCIO
      const username = Array.isArray(fields.username) ? fields.username[0] : fields.username;
      const email = Array.isArray(fields.email) ? fields.email[0] : fields.email;
      const first_name = Array.isArray(fields.first_name) ? fields.first_name[0] : fields.first_name;
      const last_name = Array.isArray(fields.last_name) ? fields.last_name[0] : fields.last_name;
      const telefone = Array.isArray(fields.telefone) ? fields.telefone[0] : fields.telefone;
      const password = Array.isArray(fields.password) ? fields.password[0] : fields.password;
      const creci = Array.isArray(fields.creci) ? fields.creci[0] : fields.creci;
      const address = Array.isArray(fields.address) ? fields.address[0] : fields.address;
      const pix_account = Array.isArray(fields.pix_account) ? fields.pix_account[0] : fields.pix_account;

      // AGORA USE AS VARIÁVEIS EXTRAÍDAS
      const validationErrors = validateCorretorData({
        username,
        email,
        first_name,
        last_name,
        telefone,
        password
      });
      
      if (validationErrors.length > 0) {
        console.warn('[BACKEND] Erros de validação:', validationErrors);
        await fs.unlink(uploadedFilePath);
        return res.status(400).json({ success: false, message: 'Dados inválidos', errors: validationErrors });
      }

      console.log('[BACKEND] Verificando usuário existente...');
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: email.toLowerCase().trim() },
            { username: username.toLowerCase().trim() }
          ]
        }
      });
      
      if (existingUser) {
        console.warn('[BACKEND] Usuário já existe:', {
          existingId: existingUser.id,
          existingEmail: existingUser.email,
          existingUsername: existingUser.username,
          attemptedEmail: email.toLowerCase().trim(),
          attemptedUsername: username.toLowerCase().trim()
        });
        await fs.unlink(uploadedFilePath);
        
        // Identificar qual campo está duplicado
        const duplicatedField = existingUser.email === email.toLowerCase().trim() ? 'email' : 'username';
        return res.status(409).json({ 
          success: false, 
          message: `${duplicatedField === 'email' ? 'Email' : 'Username'} já está em uso`,
          duplicatedField,
          details: `O ${duplicatedField} '${duplicatedField === 'email' ? email : username}' já está sendo usado por outro usuário`
        });
      }

      console.log('[BACKEND] Gerando hash da senha...');
      const hashedPassword = await bcrypt.hash(password, 10);

      console.log('[BACKEND] Iniciando transação para criação do corretor...');
      const { sequelize } = require('../models');
      const transaction = await sequelize.transaction();

      try {
        console.log('[BACKEND] Salvando corretor no banco...');
        const newCorretor = await User.create({
          username: username.toLowerCase().trim(),
          email: email.toLowerCase().trim(),
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          password: hashedPassword,
          creci: creci ? creci.trim() : null,
          address: address ? address.trim() : null,
          pix_account: pix_account ? pix_account.trim() : null,
          telefone: telefone.trim(),
          photo: path.basename(photoFile.filepath),
          is_corretor: true
        }, { transaction });

        const { password: _, ...corretorData } = newCorretor.toJSON();

        console.log('[BACKEND] Corretor criado com sucesso:', corretorData.id);

        // Renomear foto com o ID do corretor
        const ext = path.extname(photoFile.originalFilename || photoFile.newFilename || uploadedFilePath);
        const newPhotoName = `corretor_${newCorretor.id}${ext}`;
        const newPhotoPath = path.join(uploadDir, newPhotoName);
        await fs.rename(uploadedFilePath, newPhotoPath);
        await newCorretor.update({ photo: newPhotoName }, { transaction });

        // Confirmar transação
        await transaction.commit();
        console.log('[BACKEND] Transação confirmada para corretor:', newCorretor.id);

        res.status(201).json({
          success: true,
          message: 'Corretor criado com sucesso',
          data: {
            ...corretorData,
            photo: newPhotoName
          }
        });

      } catch (transactionError) {
        // Reverter transação em caso de erro
        await transaction.rollback();
        console.error('[BACKEND] Erro na transação, rollback executado:', transactionError);
        
        // Limpar arquivo de foto se houve erro
        if (uploadedFilePath) {
          await fs.unlink(uploadedFilePath).catch(() => {});
        }
        
        throw transactionError; // Re-throw para ser capturado pelo catch externo
      }

    } catch (error) {
      console.error('[BACKEND] Erro inesperado:', error);
      if (uploadedFilePath) {
        await fs.unlink(uploadedFilePath).catch(() => {});
      }
      res.status(500).json({ success: false, message: 'Erro interno do servidor', details: error.message });
    }
  });
});

// GET /corretor - Listar corretores (com paginação e busca)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', all = false } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { is_corretor: true };

    // Adicionar busca se fornecida
    if (search.trim()) {
      whereClause[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Se all=true, buscar todos os corretores sem paginação
    if (all === 'true' || all === true) {
      const corretores = await User.findAll({
        where: whereClause,
        attributes: [
          'id', 'username', 'email', 'first_name', 'last_name',
          'creci', 'address', 'pix_account', 'telefone', 'photo',
          'created_at'
        ],
        order: [['first_name', 'ASC'], ['last_name', 'ASC']]
      });

      return res.json({
        success: true,
        data: corretores,
        total: corretores.length,
        all: true
      });
    }

    // Busca paginada (comportamento padrão)
    const { count, rows: corretores } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'username', 'email', 'first_name', 'last_name',
        'creci', 'address', 'pix_account', 'telefone', 'photo',
        'created_at'
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: corretores,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar corretores:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /corretor/:id - Obter corretor específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const corretor = await User.findOne({
      where: { 
        id: id, 
        is_corretor: true 
      },
      attributes: [
        'id', 'username', 'email', 'first_name', 'last_name',
        'creci', 'address', 'pix_account', 'telefone', 'photo',
        'created_at'
      ]
    });

    if (!corretor) {
      return res.status(404).json({
        success: false,
        message: 'Corretor não encontrado'
      });
    }

    res.json({
      success: true,
      data: corretor
    });

  } catch (error) {
    console.error('❌ Erro ao buscar corretor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PUT /corretor/:id - Atualizar corretor
router.put('/:id', authenticateToken, async (req, res) => {
  console.log(`[BACKEND] 🔄 Recebendo PUT /corretor/${req.params.id}`);
  
  const form = new formidable.IncomingForm({
    multiples: false,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    uploadDir,
    keepExtensions: true,
    filename: (name, ext, part, form) => {
      const timestamp = Date.now();
      const originalName = part.originalFilename || 'photo';
      const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      return `corretor_${timestamp}_${safeName}`;
    }
  });

  form.parse(req, async (err, fields, files) => {
    let uploadedFilePath = null;
    let oldPhotoName = null;

    try {
      if (err) {
        console.error('[BACKEND] ❌ Erro no parse do formidable:', err);
        return res.status(400).json({ 
          success: false, 
          message: 'Erro ao processar dados', 
          details: err.message 
        });
      }

      const { id } = req.params;
      console.log(`[BACKEND] 🔍 Buscando corretor ID: ${id}`);
      console.log('[BACKEND] 📝 Fields recebidos:', Object.keys(fields));
      console.log('[BACKEND] 📁 Files recebidos:', Object.keys(files));

      // Buscar corretor existente
      const existingCorretor = await User.findOne({
        where: { 
          id: id,
          is_corretor: true 
        }
      });

      if (!existingCorretor) {
        // Limpar arquivo se foi enviado
        if (files.photo) {
          const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
          await fs.unlink(photoFile.filepath).catch(() => {});
        }
        return res.status(404).json({ 
          success: false,
          message: 'Corretor não encontrado'
        });
      }

      console.log('[BACKEND] ✅ Corretor encontrado:', existingCorretor.username);
      oldPhotoName = existingCorretor.photo;

      // Extrair dados dos campos
      const extractField = (field) => Array.isArray(field) ? field[0] : field;
      
      const username = extractField(fields.username);
      const email = extractField(fields.email);
      const first_name = extractField(fields.first_name);
      const last_name = extractField(fields.last_name);
      const telefone = extractField(fields.telefone);
      const password = extractField(fields.password);
      const creci = extractField(fields.creci);
      const address = extractField(fields.address);
      const pix_account = extractField(fields.pix_account);

      console.log('[BACKEND] 📋 Dados extraídos:', { 
        first_name, last_name, email, telefone, creci: creci ? 'sim' : 'não'
      });

      // Validação básica (opcional para edição)
      const validationErrors = [];

      if (first_name && first_name.trim().length < 2) {
        validationErrors.push('Nome deve ter pelo menos 2 caracteres');
      }

      if (last_name && last_name.trim().length < 2) {
        validationErrors.push('Sobrenome deve ter pelo menos 2 caracteres');
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        validationErrors.push('Email deve ser válido');
      }

      if (telefone && telefone.trim().length < 10) {
        validationErrors.push('Telefone deve ter pelo menos 10 caracteres');
      }

      if (validationErrors.length > 0) {
        if (files.photo) {
          const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
          await fs.unlink(photoFile.filepath).catch(() => {});
        }
        return res.status(400).json({ 
          success: false,
          message: 'Dados inválidos',
          errors: validationErrors
        });
      }

      // Verificar duplicatas (exceto o próprio registro)
      if (username || email) {
        const whereConditions = [];
        
        if (username) {
          whereConditions.push({ username: username.toLowerCase().trim() });
        }
        
        if (email) {
          whereConditions.push({ email: email.toLowerCase().trim() });
        }

        if (whereConditions.length > 0) {
          const duplicateUser = await User.findOne({
            where: {
              [Op.and]: [
                { id: { [Op.ne]: id } },
                { [Op.or]: whereConditions }
              ]
            }
          });

          if (duplicateUser) {
            if (files.photo) {
              const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
              await fs.unlink(photoFile.filepath).catch(() => {});
            }
            return res.status(409).json({ 
              success: false,
              message: 'Email ou username já cadastrado por outro usuário' 
            });
          }
        }
      }

      // Preparar dados para atualização
      const updateData = {};
      
      if (first_name) updateData.first_name = first_name.trim();
      if (last_name) updateData.last_name = last_name.trim();
      if (email) updateData.email = email.toLowerCase().trim();
      if (telefone) updateData.telefone = telefone.trim();
      
      // Campos opcionais (podem ser vazios)
      if (address !== undefined) updateData.address = address ? address.trim() : null;
      if (pix_account !== undefined) updateData.pix_account = pix_account ? pix_account.trim() : null;
      if (creci !== undefined) updateData.creci = creci ? creci.trim() : null;

      // Processar nova foto se enviada
      if (files.photo) {
        const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
        uploadedFilePath = photoFile.filepath;
        const ext = path.extname(photoFile.originalFilename || photoFile.newFilename || uploadedFilePath);
        const newPhotoName = `corretor_${id}${ext}`;
        const newPhotoPath = path.join(uploadDir, newPhotoName);
        await fs.rename(uploadedFilePath, newPhotoPath);
        updateData.photo = newPhotoName;
      }

      // Hash da nova senha se fornecida
      if (password && password.trim()) {
        updateData.password = await bcrypt.hash(password, 10);
        console.log('[BACKEND] 🔐 Nova senha processada');
      }

      console.log('[BACKEND] 💾 Dados finais para atualização:', {
        ...updateData,
        photo: updateData.photo ? '✅ Nova foto' : '❌ Sem foto'
      });

      // Atualizar corretor
      const [updatedRowsCount] = await User.update(updateData, {
        where: { id: id }
      });

      console.log(`[BACKEND] ✏️ Linhas atualizadas: ${updatedRowsCount}`);

      if (updatedRowsCount === 0) {
        // Limpar arquivo se nada foi atualizado
        if (uploadedFilePath) {
          await fs.unlink(uploadedFilePath).catch(() => {});
        }
        return res.status(404).json({
          success: false,
          message: 'Nenhuma alteração foi feita'
        });
      }

      // Buscar dados atualizados
      const updatedCorretor = await User.findOne({
        where: { id: id },
        attributes: [
          'id', 'username', 'email', 'first_name', 'last_name',
          'creci', 'address', 'pix_account', 'telefone', 'photo',
          'created_at', 'updated_at'
        ]
      });

      // Deletar foto antiga se uma nova foi enviada e salva com sucesso
      if (files.photo && oldPhotoName && updateData.photo) {
        const oldPhotoPath = path.join(uploadDir, oldPhotoName);
        await fs.unlink(oldPhotoPath).catch((error) => {
          console.log(`[BACKEND] ℹ️ Foto antiga não encontrada ou já deletada: ${oldPhotoName}`);
        });
        console.log('[BACKEND] 🗑️ Foto antiga deletada:', oldPhotoName);
      }

      console.log('[BACKEND] ✅ Corretor atualizado com sucesso! ID:', updatedCorretor.id);
      console.log('[BACKEND] 📷 Foto atual:', updatedCorretor.photo || 'nenhuma');

      res.json({
        success: true,
        message: 'Corretor atualizado com sucesso',
        data: updatedCorretor
      });

    } catch (error) {
      console.error('[BACKEND] ❌ Erro ao atualizar corretor:', error);

      // Limpar arquivo em caso de erro
      if (uploadedFilePath) {
        await fs.unlink(uploadedFilePath).catch(() => {});
        console.log('[BACKEND] 🧹 Arquivo temporário limpo devido ao erro');
      }

      // Tratar erros específicos
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ 
          success: false,
          message: 'Email ou username já cadastrado' 
        });
      }

      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
          success: false,
          message: 'Dados de validação inválidos',
          errors: error.errors.map(err => err.message)
        });
      }

      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
});

// DELETE /corretor/:id - Deletar corretor
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[BACKEND] Tentando deletar corretor ID: ${id}`);

    // Buscar corretor
    const corretor = await User.findOne({
      where: { 
        id: id,
        is_corretor: true 
      }
    });

    if (!corretor) {
      return res.status(404).json({ 
        success: false,
        message: 'Corretor não encontrado' 
      });
    }

    const photoName = corretor.photo;

    // Deletar corretor do banco
    await User.destroy({
      where: { id: id }
    });

    // Deletar foto se existir
    if (photoName) {
      const photoPath = path.join(uploadDir, photoName);
      await fs.unlink(photoPath).catch((error) => {
        console.log(`[BACKEND] Foto não encontrada ou já deletada: ${photoName}`);
      });
      console.log('[BACKEND] Foto deletada:', photoName);
    }

    console.log('[BACKEND] Corretor deletado com sucesso:', id);

    res.json({
      success: true,
      message: 'Corretor deletado com sucesso'
    });

  } catch (error) {
    console.error('[BACKEND] Erro ao deletar corretor:', error);
    
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
