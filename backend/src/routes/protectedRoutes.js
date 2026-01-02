const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../routes/authRoutes'); // Ajuste o caminho conforme necessário

// Rota protegida
router.get('/protected', authenticateToken, (req, res) => {
  // Se ambas as validações passarem, esta mensagem será enviada
  res.json({ 
    message: 'Você está autenticado!', 
    keyExpiration: req.keyExpiration // Inclui a informação sobre o tempo restante da chave, se necessário
  });
});

module.exports = router;
