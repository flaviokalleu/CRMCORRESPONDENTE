const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

// GET /api/propostas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { Proposta, Cliente, Imovel, User } = require('../models');
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Proposta.findAndCountAll({
      where,
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'nome', 'cpf', 'telefone'] },
        { model: Imovel, as: 'imovel', attributes: ['id', 'nome_imovel', 'endereco', 'valor_venda'] },
        { model: User, as: 'corretor', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({ success: true, data: rows, total: count, page: parseInt(page), pageSize: parseInt(limit) });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar propostas');
    res.status(500).json({ success: false, error: 'Erro ao listar propostas' });
  }
});

// GET /api/propostas/cliente/:clienteId
router.get('/cliente/:clienteId', authenticateToken, async (req, res) => {
  try {
    const { Proposta, Imovel, User } = require('../models');
    const propostas = await Proposta.findAll({
      where: { cliente_id: req.params.clienteId },
      include: [
        { model: Imovel, as: 'imovel', attributes: ['id', 'nome_imovel', 'endereco', 'valor_venda'] },
        { model: User, as: 'corretor', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: propostas });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar propostas do cliente');
    res.status(500).json({ success: false, error: 'Erro ao listar propostas do cliente' });
  }
});

// POST /api/propostas
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { Proposta } = require('../models');
    const { cliente_id, imovel_id, valor_ofertado, forma_pagamento, data_validade, condicoes, observacoes } = req.body;

    if (!cliente_id || !imovel_id || !valor_ofertado) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: cliente_id, imovel_id, valor_ofertado' });
    }

    const proposta = await Proposta.create({
      cliente_id,
      imovel_id,
      corretor_id: req.user.id,
      tenant_id: req.tenantId || req.user.tenant_id || null,
      valor_ofertado,
      forma_pagamento: forma_pagamento || 'financiamento',
      data_validade: data_validade ? new Date(data_validade) : null,
      condicoes,
      observacoes,
    });

    // Notificação
    try {
      const { Notificacao, Cliente, Imovel } = require('../models');
      const cliente = await Cliente.findByPk(cliente_id, { attributes: ['nome'] });
      const imovel = await Imovel.findByPk(imovel_id, { attributes: ['nome_imovel'] });

      await Notificacao.create({
        user_id: req.user.id,
        tenant_id: req.tenantId || req.user.tenant_id || null,
        tipo: 'proposta',
        titulo: 'Nova proposta criada',
        mensagem: `Proposta de ${cliente?.nome || 'Cliente'} para ${imovel?.nome_imovel || 'Imóvel'}: R$ ${parseFloat(valor_ofertado).toLocaleString('pt-BR')}`,
        link: '/propostas',
        dados: { proposta_id: proposta.id },
      });
    } catch (notifErr) {
      logger.warn({ err: notifErr }, 'Erro ao criar notificação de proposta');
    }

    res.status(201).json({ success: true, data: proposta });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao criar proposta');
    res.status(500).json({ success: false, error: 'Erro ao criar proposta' });
  }
});

// PUT /api/propostas/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { Proposta } = require('../models');
    const proposta = await Proposta.findByPk(req.params.id);
    if (!proposta) return res.status(404).json({ success: false, error: 'Proposta não encontrada' });

    const { status, valor_contra_proposta, valor_aceito, motivo_recusa, observacoes, condicoes } = req.body;
    await proposta.update({
      ...(status && { status }),
      ...(valor_contra_proposta !== undefined && { valor_contra_proposta }),
      ...(valor_aceito !== undefined && { valor_aceito }),
      ...(motivo_recusa !== undefined && { motivo_recusa }),
      ...(observacoes !== undefined && { observacoes }),
      ...(condicoes !== undefined && { condicoes }),
    });

    res.json({ success: true, data: proposta });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao atualizar proposta');
    res.status(500).json({ success: false, error: 'Erro ao atualizar proposta' });
  }
});

// DELETE /api/propostas/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { Proposta } = require('../models');
    const proposta = await Proposta.findByPk(req.params.id);
    if (!proposta) return res.status(404).json({ success: false, error: 'Proposta não encontrada' });
    await proposta.destroy();
    res.json({ success: true, message: 'Proposta removida' });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao remover proposta');
    res.status(500).json({ success: false, error: 'Erro ao remover proposta' });
  }
});

module.exports = router;
