const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { ClienteAluguel, CobrancaAluguel, Aluguel } = require('../models');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'portal-inquilino-secret';

// Middleware de autenticacao do portal (JWT separado)
const authenticateInquilino = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.tipo !== 'inquilino') {
      return res.status(403).json({ error: 'Acesso nao autorizado' });
    }
    req.inquilino = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }
};

// POST /api/portal/login — Login por CPF
router.post('/portal/login', async (req, res) => {
  try {
    const { cpf } = req.body;

    if (!cpf) {
      return res.status(400).json({ error: 'CPF obrigatorio' });
    }

    const cpfLimpo = cpf.replace(/\D/g, '');

    const cliente = await ClienteAluguel.findOne({
      where: { cpf: cpfLimpo },
    });

    // Tenta tambem com CPF formatado
    const clienteFormatado = cliente || await ClienteAluguel.findOne({
      where: {
        cpf: cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
      },
    });

    const clienteFinal = cliente || clienteFormatado;

    if (!clienteFinal) {
      return res.status(404).json({ error: 'CPF nao encontrado. Verifique o numero informado.' });
    }

    // Gerar token do portal (24h)
    const token = jwt.sign(
      {
        tipo: 'inquilino',
        cliente_aluguel_id: clienteFinal.id,
        nome: clienteFinal.nome,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      token,
      nome: clienteFinal.nome,
      email: clienteFinal.email,
    });
  } catch (error) {
    console.error('Erro no login do portal:', error);
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
});

// GET /api/portal/meus-dados — Dados do inquilino
router.get('/portal/meus-dados', authenticateInquilino, async (req, res) => {
  try {
    const cliente = await ClienteAluguel.findByPk(req.inquilino.cliente_aluguel_id, {
      attributes: ['id', 'nome', 'cpf', 'email', 'telefone', 'valor_aluguel', 'dia_vencimento', 'pago', 'score_inquilino', 'data_inicio_contrato', 'data_fim_contrato', 'aluguel_id'],
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Dados nao encontrados' });
    }

    let imovel = null;
    if (cliente.aluguel_id) {
      imovel = await Aluguel.findByPk(cliente.aluguel_id, {
        attributes: ['id', 'nome_imovel', 'descricao', 'quartos', 'banheiro'],
      });
    }

    // Verificar atraso
    const hoje = new Date();
    const emAtraso = hoje.getDate() > parseInt(cliente.dia_vencimento) && !cliente.pago;

    res.status(200).json({
      ...cliente.toJSON(),
      imovel,
      em_atraso: emAtraso,
    });
  } catch (error) {
    console.error('Erro ao buscar dados do inquilino:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// GET /api/portal/cobrancas — Cobrancas do inquilino
router.get('/portal/cobrancas', authenticateInquilino, async (req, res) => {
  try {
    const cobrancas = await CobrancaAluguel.findAll({
      where: { cliente_aluguel_id: req.inquilino.cliente_aluguel_id },
      order: [['data_vencimento', 'DESC']],
    });

    res.status(200).json(cobrancas);
  } catch (error) {
    console.error('Erro ao listar cobrancas do portal:', error);
    res.status(500).json({ error: 'Erro ao listar cobrancas' });
  }
});

// GET /api/portal/recibos — Recibos (pagamentos confirmados)
router.get('/portal/recibos', authenticateInquilino, async (req, res) => {
  try {
    const recibos = await CobrancaAluguel.findAll({
      where: {
        cliente_aluguel_id: req.inquilino.cliente_aluguel_id,
        status: { [require('sequelize').Op.in]: ['CONFIRMED', 'RECEIVED'] },
      },
      order: [['data_pagamento', 'DESC']],
    });

    res.status(200).json(recibos);
  } catch (error) {
    console.error('Erro ao listar recibos:', error);
    res.status(500).json({ error: 'Erro ao listar recibos' });
  }
});

// GET /api/portal/recibo/:id/pdf — Baixa recibo PDF
router.get('/portal/recibo/:id/pdf', authenticateInquilino, async (req, res) => {
  try {
    const cobranca = await CobrancaAluguel.findOne({
      where: {
        id: req.params.id,
        cliente_aluguel_id: req.inquilino.cliente_aluguel_id,
      },
    });

    if (!cobranca || !cobranca.recibo_url) {
      return res.status(404).json({ error: 'Recibo nao encontrado' });
    }

    const caminhoArquivo = path.resolve(__dirname, '../..', cobranca.recibo_url.replace(/^\//, ''));

    if (!fs.existsSync(caminhoArquivo)) {
      return res.status(404).json({ error: 'Arquivo do recibo nao encontrado' });
    }

    res.download(caminhoArquivo);
  } catch (error) {
    console.error('Erro ao baixar recibo:', error);
    res.status(500).json({ error: 'Erro ao baixar recibo' });
  }
});

// GET /api/portal/contrato — Baixa contrato vigente
router.get('/portal/contrato', authenticateInquilino, async (req, res) => {
  try {
    const clienteDir = path.resolve(__dirname, `../../uploads/contratos/${req.inquilino.cliente_aluguel_id}`);

    if (!fs.existsSync(clienteDir)) {
      return res.status(404).json({ error: 'Nenhum contrato encontrado' });
    }

    const arquivos = fs.readdirSync(clienteDir).filter(f => f.endsWith('.pdf')).sort().reverse();

    if (arquivos.length === 0) {
      return res.status(404).json({ error: 'Nenhum contrato encontrado' });
    }

    res.download(path.join(clienteDir, arquivos[0]), arquivos[0]);
  } catch (error) {
    console.error('Erro ao baixar contrato do portal:', error);
    res.status(500).json({ error: 'Erro ao baixar contrato' });
  }
});

module.exports = router;
