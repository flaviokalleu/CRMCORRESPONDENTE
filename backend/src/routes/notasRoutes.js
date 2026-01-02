// src/routes/notas.js
const express = require('express');
const router = express.Router();
const { getNotasByClienteId } = require('../controllers/notasController');

// Define a rota para buscar as notas
router.get('/clientes/:clienteId/notas', getNotasByClienteId);

module.exports = router;
