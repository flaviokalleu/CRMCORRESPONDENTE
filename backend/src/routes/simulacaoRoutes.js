const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const logger = require('../config/logger');

// ===== FUNÇÕES DE CÁLCULO =====

/**
 * Calcula tabela de amortização SAC (Sistema de Amortização Constante)
 */
function calcularSAC(valorFinanciado, taxaAnual, prazoMeses) {
  const taxaMensal = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
  const amortizacao = valorFinanciado / prazoMeses;
  let saldoDevedor = valorFinanciado;
  let totalPago = 0;
  let totalJuros = 0;
  const parcelas = [];

  for (let i = 1; i <= prazoMeses; i++) {
    const juros = saldoDevedor * taxaMensal;
    const parcela = amortizacao + juros;
    totalPago += parcela;
    totalJuros += juros;
    saldoDevedor -= amortizacao;

    parcelas.push({
      numero: i,
      parcela: Math.round(parcela * 100) / 100,
      amortizacao: Math.round(amortizacao * 100) / 100,
      juros: Math.round(juros * 100) / 100,
      saldo_devedor: Math.round(Math.max(saldoDevedor, 0) * 100) / 100,
    });
  }

  return {
    parcelas,
    primeira_parcela: parcelas[0].parcela,
    ultima_parcela: parcelas[parcelas.length - 1].parcela,
    total_pago: Math.round(totalPago * 100) / 100,
    total_juros: Math.round(totalJuros * 100) / 100,
    taxa_mensal: Math.round(taxaMensal * 10000) / 10000,
  };
}

/**
 * Calcula tabela de amortização PRICE (parcela fixa)
 */
function calcularPRICE(valorFinanciado, taxaAnual, prazoMeses) {
  const taxaMensal = Math.pow(1 + taxaAnual / 100, 1 / 12) - 1;
  const parcela = valorFinanciado * (taxaMensal * Math.pow(1 + taxaMensal, prazoMeses)) /
    (Math.pow(1 + taxaMensal, prazoMeses) - 1);
  let saldoDevedor = valorFinanciado;
  let totalPago = 0;
  let totalJuros = 0;
  const parcelas = [];

  for (let i = 1; i <= prazoMeses; i++) {
    const juros = saldoDevedor * taxaMensal;
    const amortizacao = parcela - juros;
    totalPago += parcela;
    totalJuros += juros;
    saldoDevedor -= amortizacao;

    parcelas.push({
      numero: i,
      parcela: Math.round(parcela * 100) / 100,
      amortizacao: Math.round(amortizacao * 100) / 100,
      juros: Math.round(juros * 100) / 100,
      saldo_devedor: Math.round(Math.max(saldoDevedor, 0) * 100) / 100,
    });
  }

  return {
    parcelas,
    primeira_parcela: parcelas[0].parcela,
    ultima_parcela: parcelas[parcelas.length - 1].parcela,
    total_pago: Math.round(totalPago * 100) / 100,
    total_juros: Math.round(totalJuros * 100) / 100,
    taxa_mensal: Math.round(taxaMensal * 10000) / 10000,
  };
}

// ===== ROTAS =====

/**
 * POST /api/simulacoes/calcular
 * Calcula simulação sem salvar (prévia)
 */
router.post('/calcular', authenticateToken, (req, res) => {
  try {
    const { valor_imovel, valor_entrada, prazo_meses, taxa_juros_anual, sistema } = req.body;

    if (!valor_imovel || !valor_entrada || !prazo_meses || !taxa_juros_anual) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios: valor_imovel, valor_entrada, prazo_meses, taxa_juros_anual' });
    }

    const valorFinanciado = parseFloat(valor_imovel) - parseFloat(valor_entrada);
    if (valorFinanciado <= 0) {
      return res.status(400).json({ success: false, error: 'Valor de entrada deve ser menor que o valor do imóvel' });
    }

    const resultado = (sistema || 'SAC') === 'PRICE'
      ? calcularPRICE(valorFinanciado, parseFloat(taxa_juros_anual), parseInt(prazo_meses))
      : calcularSAC(valorFinanciado, parseFloat(taxa_juros_anual), parseInt(prazo_meses));

    // Renda mínima estimada (30% da primeira parcela)
    const rendaMinima = Math.round((resultado.primeira_parcela / 0.3) * 100) / 100;

    res.json({
      success: true,
      data: {
        valor_imovel: parseFloat(valor_imovel),
        valor_entrada: parseFloat(valor_entrada),
        valor_financiado: Math.round(valorFinanciado * 100) / 100,
        prazo_meses: parseInt(prazo_meses),
        taxa_juros_anual: parseFloat(taxa_juros_anual),
        taxa_mensal: resultado.taxa_mensal,
        sistema: sistema || 'SAC',
        primeira_parcela: resultado.primeira_parcela,
        ultima_parcela: resultado.ultima_parcela,
        total_pago: resultado.total_pago,
        total_juros: resultado.total_juros,
        renda_minima: rendaMinima,
        parcelas: resultado.parcelas,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao calcular simulação');
    res.status(500).json({ success: false, error: 'Erro ao calcular simulação' });
  }
});

/**
 * POST /api/simulacoes
 * Salva simulação vinculada a um cliente
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { Simulacao } = require('../models');
    const {
      cliente_id, valor_imovel, valor_entrada, prazo_meses,
      taxa_juros_anual, sistema, observacoes,
    } = req.body;

    const valorFinanciado = parseFloat(valor_imovel) - parseFloat(valor_entrada);
    const resultado = (sistema || 'SAC') === 'PRICE'
      ? calcularPRICE(valorFinanciado, parseFloat(taxa_juros_anual), parseInt(prazo_meses))
      : calcularSAC(valorFinanciado, parseFloat(taxa_juros_anual), parseInt(prazo_meses));

    const rendaMinima = Math.round((resultado.primeira_parcela / 0.3) * 100) / 100;

    const simulacao = await Simulacao.create({
      cliente_id: cliente_id || null,
      user_id: req.user.id,
      tenant_id: req.tenantId || req.user.tenant_id || null,
      valor_imovel: parseFloat(valor_imovel),
      valor_entrada: parseFloat(valor_entrada),
      valor_financiado: Math.round(valorFinanciado * 100) / 100,
      prazo_meses: parseInt(prazo_meses),
      taxa_juros_anual: parseFloat(taxa_juros_anual),
      sistema: sistema || 'SAC',
      primeira_parcela: resultado.primeira_parcela,
      ultima_parcela: resultado.ultima_parcela,
      total_pago: resultado.total_pago,
      total_juros: resultado.total_juros,
      renda_minima: rendaMinima,
      observacoes: observacoes || null,
    });

    res.status(201).json({ success: true, data: simulacao });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao salvar simulação');
    res.status(500).json({ success: false, error: 'Erro ao salvar simulação' });
  }
});

/**
 * GET /api/simulacoes/cliente/:clienteId
 * Lista simulações de um cliente
 */
router.get('/cliente/:clienteId', authenticateToken, async (req, res) => {
  try {
    const { Simulacao, User } = require('../models');
    const simulacoes = await Simulacao.findAll({
      where: { cliente_id: req.params.clienteId },
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] }],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: simulacoes });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar simulações');
    res.status(500).json({ success: false, error: 'Erro ao listar simulações' });
  }
});

/**
 * GET /api/simulacoes
 * Lista todas as simulações do usuário
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { Simulacao, Cliente, User } = require('../models');
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Simulacao.findAndCountAll({
      where: { user_id: req.user.id },
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'nome', 'cpf'] },
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({ success: true, data: rows, total: count, page: parseInt(page), pageSize: parseInt(limit) });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar simulações');
    res.status(500).json({ success: false, error: 'Erro ao listar simulações' });
  }
});

/**
 * DELETE /api/simulacoes/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { Simulacao } = require('../models');
    const simulacao = await Simulacao.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!simulacao) {
      return res.status(404).json({ success: false, error: 'Simulação não encontrada' });
    }

    await simulacao.destroy();
    res.json({ success: true, message: 'Simulação removida' });
  } catch (error) {
    logger.error({ err: error }, 'Erro ao remover simulação');
    res.status(500).json({ success: false, error: 'Erro ao remover simulação' });
  }
});

module.exports = router;
