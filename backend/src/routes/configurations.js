// routes/configurations.js
const express = require('express');
const router = express.Router();

// Middleware de autenticação (se necessário)
const authMiddleware = require('../middleware/authMiddleware'); // Certifique-se de que authMiddleware é uma função

// Obtém as configurações
router.get('/configurations', authMiddleware, async (req, res) => {
  try {
    // Aqui você pode acessar as configurações do seu banco de dados ou de um arquivo
    const configurations = {
      theme: 'dark',
      language: 'pt-BR',
      // Adicione outras configurações necessárias
    };

    res.json(configurations);
  } catch (error) {
    console.error("Erro ao obter configurações:", error);
    res.status(500).json({ message: "Erro ao obter configurações." });
  }
});

module.exports = router;
