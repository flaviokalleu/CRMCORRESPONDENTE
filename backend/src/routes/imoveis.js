'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const imovelController = require('../controllers/imovelController');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.resolve(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

const uploadFields = upload.fields([
  { name: 'documentacao', maxCount: 1 },
  { name: 'imagens', maxCount: 50 },
  { name: 'imagem_capa', maxCount: 1 }
]);

// Rotas (autenticação aplicada no mount em index.js)
router.get('/', imovelController.listarImoveis);
router.get('/imoveis', imovelController.listarImoveis);
router.get('/busca', imovelController.buscarImoveis);
router.post('/', uploadFields, imovelController.criarImovel);
router.put('/:id', uploadFields, imovelController.atualizarImovel);
router.delete('/:id', imovelController.deletarImovel);
router.get('/:id/download-imagens', imovelController.downloadImagens);
router.get('/:id/semelhantes', imovelController.obterSemelhantes);
router.get('/:id', imovelController.obterImovel);

module.exports = router;
