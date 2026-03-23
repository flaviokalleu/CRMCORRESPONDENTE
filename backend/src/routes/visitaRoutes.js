const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

// GET /api/visitas — listar visitas (com filtros)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { Visita, Cliente, Imovel, User } = require('../models');
    const { status, corretor_id, data_inicio, data_fim, page = 1, limit = 20 } = req.query;
    const where = {};

    if (status) where.status = status;
    if (corretor_id) where.corretor_id = corretor_id;
    if (data_inicio || data_fim) {
      const { Op } = require('sequelize');
      where.data_visita = {};
      if (data_inicio) where.data_visita[Op.gte] = new Date(data_inicio);
      if (data_fim) where.data_visita[Op.lte] = new Date(data_fim);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Visita.findAndCountAll({
      where,
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'nome', 'telefone', 'email'] },
        { model: Imovel, as: 'imovel', attributes: ['id', 'nome_imovel', 'endereco'] },
        { model: User, as: 'corretor', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['data_visita', 'ASC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({ success: true, data: rows, total: count, page: parseInt(page), pageSize: parseInt(limit) });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar visitas');
    res.status(500).json({ success: false, error: 'Erro ao listar visitas' });
  }
});

// GET /api/visitas/cliente/:clienteId
router.get('/cliente/:clienteId', authenticateToken, async (req, res) => {
  try {
    const { Visita, Imovel, User } = require('../models');
    const visitas = await Visita.findAll({
      where: { cliente_id: req.params.clienteId },
      include: [
        { model: Imovel, as: 'imovel', attributes: ['id', 'nome_imovel', 'endereco'] },
        { model: User, as: 'corretor', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['data_visita', 'DESC']],
    });
    res.json({ success: true, data: visitas });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar visitas do cliente');
    res.status(500).json({ success: false, error: 'Erro ao listar visitas do cliente' });
  }
});

// POST /api/visitas
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { Visita } = require('../models');
    const { cliente_id, imovel_id, corretor_id, data_visita, observacoes } = req.body;

    if (!cliente_id || !imovel_id || !data_visita) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: cliente_id, imovel_id, data_visita' });
    }

    const visita = await Visita.create({
      cliente_id,
      imovel_id,
      corretor_id: corretor_id || req.user.id,
      criado_por_id: req.user.id,
      tenant_id: req.tenantId || req.user.tenant_id || null,
      data_visita: new Date(data_visita),
      observacoes,
    });

    // Criar notificação para o corretor
    try {
      const { Notificacao, Cliente, Imovel } = require('../models');
      const cliente = await Cliente.findByPk(cliente_id, { attributes: ['nome'] });
      const imovel = await Imovel.findByPk(imovel_id, { attributes: ['nome_imovel'] });
      const targetUserId = corretor_id || req.user.id;

      await Notificacao.create({
        user_id: targetUserId,
        tenant_id: req.tenantId || req.user.tenant_id || null,
        tipo: 'visita',
        titulo: 'Nova visita agendada',
        mensagem: `Visita agendada: ${cliente?.nome || 'Cliente'} → ${imovel?.nome_imovel || 'Imóvel'} em ${new Date(data_visita).toLocaleDateString('pt-BR')}`,
        link: '/visitas',
        dados: { visita_id: visita.id },
      });

      // Emitir via Socket.io
      const { getSocketIO } = require('../socket');
      const io = getSocketIO();
      if (io) io.emit(`notification:${targetUserId}`, { tipo: 'visita', titulo: 'Nova visita agendada' });
    } catch (notifErr) {
      logger.warn({ err: notifErr }, 'Erro ao criar notificação de visita');
    }

    res.status(201).json({ success: true, data: visita });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao criar visita');
    res.status(500).json({ success: false, error: 'Erro ao criar visita' });
  }
});

// PUT /api/visitas/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { Visita } = require('../models');
    const visita = await Visita.findByPk(req.params.id);
    if (!visita) return res.status(404).json({ success: false, error: 'Visita não encontrada' });

    const { data_visita, status, observacoes, feedback_cliente, nota_avaliacao } = req.body;
    await visita.update({
      ...(data_visita && { data_visita: new Date(data_visita) }),
      ...(status && { status }),
      ...(observacoes !== undefined && { observacoes }),
      ...(feedback_cliente !== undefined && { feedback_cliente }),
      ...(nota_avaliacao !== undefined && { nota_avaliacao }),
    });

    res.json({ success: true, data: visita });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao atualizar visita');
    res.status(500).json({ success: false, error: 'Erro ao atualizar visita' });
  }
});

// DELETE /api/visitas/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { Visita } = require('../models');
    const visita = await Visita.findByPk(req.params.id);
    if (!visita) return res.status(404).json({ success: false, error: 'Visita não encontrada' });
    await visita.destroy();
    res.json({ success: true, message: 'Visita removida' });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao remover visita');
    res.status(500).json({ success: false, error: 'Erro ao remover visita' });
  }
});

module.exports = router;
