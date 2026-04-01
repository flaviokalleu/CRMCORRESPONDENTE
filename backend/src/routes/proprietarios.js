const express = require('express');
const { proprietario } = require('../models');
const authenticateToken = require('../middleware/authenticateToken');
const { resolveTenant } = require('../middleware/tenantMiddleware');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authenticateToken, resolveTenant);

router.get('/proprietarios', async (req, res) => {
  try {
    const proprietarios = await proprietario.findAll({
      where: {
        [Op.or]: [
          { tenant_id: req.tenantId },
          { tenant_id: null },
        ],
      },
      order: [['name', 'ASC']],
    });

    res.json(proprietarios);
  } catch (error) {
    console.error('Erro ao listar proprietários:', error);
    res.status(500).json({ error: 'Erro ao listar proprietários' });
  }
});

router.post('/proprietarios', async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Nome do proprietário é obrigatório' });
    }

    const novoProprietario = await proprietario.create({
      name: String(name).trim(),
      phone: phone ? String(phone).trim() : null,
      address: address ? String(address).trim() : null,
      tenant_id: req.tenantId || null,
    });

    res.status(201).json(novoProprietario);
  } catch (error) {
    console.error('Erro ao cadastrar proprietário:', error);
    res.status(500).json({ error: 'Erro ao cadastrar proprietário' });
  }
});

router.delete('/proprietarios/:id', async (req, res) => {
  try {
    const item = await proprietario.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Proprietário não encontrado' });
    }

    if (item.tenant_id && item.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await item.destroy();
    res.json({ message: 'Proprietário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir proprietário:', error);
    res.status(500).json({ error: 'Erro ao excluir proprietário' });
  }
});

module.exports = router;
