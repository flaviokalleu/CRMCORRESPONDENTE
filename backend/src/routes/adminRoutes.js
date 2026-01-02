// backend/src/routes/adminRoutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const router = express.Router();
const { User } = require('../models'); // Atualizado para User
const { authenticateToken } = require('./authRoutes');

// Configuração do multer para o upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/imagem_Administrador'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nome do arquivo com timestamp
  },
});

const upload = multer({ storage });

// Rota para obter informações do administrador autenticado
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const admin = await User.findOne({ where: { id: req.user.id, is_administrador: true } });
    if (!admin) return res.status(404).json({ error: 'Administrador não encontrado' });
    res.json(admin);
  } catch (error) {
    console.error('Erro ao obter informações do administrador:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para atualizar informações do administrador
router.put('/me', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const { first_name, email, password } = req.body;
    const admin = await User.findOne({ where: { id: req.user.id, is_administrador: true } });

    if (!admin) {
      return res.status(404).json({ error: 'Administrador não encontrado' });
    }

    admin.first_name = first_name || admin.first_name;
    admin.email = email || admin.email;

    if (password) {
      admin.password = await bcrypt.hash(password, 10);
    }

    if (req.file) {
      admin.avatar = req.file.filename; // Salva o nome do arquivo da imagem
    }

    await admin.save();
    res.json(admin);
  } catch (error) {
    console.error('Erro ao atualizar administrador:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
