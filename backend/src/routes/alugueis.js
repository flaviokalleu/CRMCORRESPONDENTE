'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const aluguelController = require('../controllers/aluguelController');
const aluguelService = require('../services/aluguelService');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, aluguelService.TEMP_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    cb(null, extname && mimetype);
  }
});

const uploadFields = upload.fields([
  { name: 'foto_capa', maxCount: 1 },
  { name: 'fotos_adicionais', maxCount: 10 }
]);

// Rotas (autenticação aplicada no mount em index.js)
router.get('/', aluguelController.listarAlugueis);
router.post('/', uploadFields, aluguelController.criarAluguel);
router.put('/:id', uploadFields, aluguelController.atualizarAluguel);
router.put('/:id/alugado', aluguelController.toggleAlugado);
router.delete('/:id', aluguelController.deletarAluguel);
router.get('/:id/download', aluguelController.downloadFotos);
router.post('/cleanup-temp', aluguelController.cleanupTemp);

module.exports = router;
