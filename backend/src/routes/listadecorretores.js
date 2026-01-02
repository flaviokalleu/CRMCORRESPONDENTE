const express = require('express');
const router = express.Router();
const { User } = require('../models');

// Rota para listar todos os usuários que são corretores
router.get('/', async (req, res) => {
    try {
        const corretores = await User.findAll({
            where: { is_corretor: true }
        });
        res.json(corretores);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar corretores", error });
    }
});

module.exports = router;
