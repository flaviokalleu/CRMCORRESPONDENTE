const express = require('express');
const router = express.Router();
const { Estado, Municipio } = require('../models');

// Endpoint para obter estados
router.get('/estados', async (req, res) => {
  try {
    const estados = await Estado.findAll();
    res.json(estados);
  } catch (error) {
    console.error('Erro ao obter estados:', error);
    res.status(500).json({ error: 'Erro ao obter estados.' });
  }
});

// Endpoint para obter municípios por estado
router.get('/municipios/:estadoId', async (req, res) => {
  try {
    const { estadoId } = req.params;
    console.log(`Estado ID recebido: ${estadoId}`);
    
    const municipios = await Municipio.findAll({ where: { estadoId } });
    
    if (municipios.length === 0) {
      console.warn(`Nenhum município encontrado para o estadoId: ${estadoId}`);
    }
    
    res.json(municipios);
  } catch (error) {
    console.error('Erro ao obter municípios:', error);
    res.status(500).json({ error: 'Erro ao obter municípios.' });
  }
});



module.exports = router;
