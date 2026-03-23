const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

// GET /api/notificacoes — listar notificações do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { Notificacao } = require('../models');
    const { lida, page = 1, limit = 30 } = req.query;
    const where = { user_id: req.user.id };
    if (lida !== undefined) where.lida = lida === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Notificacao.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({ success: true, data: rows, total: count, page: parseInt(page), pageSize: parseInt(limit) });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar notificações');
    res.status(500).json({ success: false, error: 'Erro ao listar notificações' });
  }
});

// GET /api/notificacoes/nao-lidas — contagem de não lidas
router.get('/nao-lidas', authenticateToken, async (req, res) => {
  try {
    const { Notificacao } = require('../models');
    const count = await Notificacao.count({ where: { user_id: req.user.id, lida: false } });
    res.json({ success: true, count });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao contar notificações');
    res.status(500).json({ success: false, error: 'Erro ao contar notificações' });
  }
});

// PUT /api/notificacoes/:id/ler — marcar como lida
router.put('/:id/ler', authenticateToken, async (req, res) => {
  try {
    const { Notificacao } = require('../models');
    const notif = await Notificacao.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!notif) return res.status(404).json({ success: false, error: 'Notificação não encontrada' });
    await notif.update({ lida: true });
    res.json({ success: true, data: notif });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao marcar notificação');
    res.status(500).json({ success: false, error: 'Erro ao marcar notificação' });
  }
});

// PUT /api/notificacoes/ler-todas — marcar todas como lidas
router.put('/ler-todas', authenticateToken, async (req, res) => {
  try {
    const { Notificacao } = require('../models');
    await Notificacao.update({ lida: true }, { where: { user_id: req.user.id, lida: false } });
    res.json({ success: true, message: 'Todas as notificações marcadas como lidas' });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao marcar todas notificações');
    res.status(500).json({ success: false, error: 'Erro ao marcar notificações' });
  }
});

// DELETE /api/notificacoes/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { Notificacao } = require('../models');
    const notif = await Notificacao.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!notif) return res.status(404).json({ success: false, error: 'Notificação não encontrada' });
    await notif.destroy();
    res.json({ success: true, message: 'Notificação removida' });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao remover notificação');
    res.status(500).json({ success: false, error: 'Erro ao remover notificação' });
  }
});

module.exports = router;
