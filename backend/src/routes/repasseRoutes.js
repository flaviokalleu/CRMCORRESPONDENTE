const express = require('express');
const { ClienteAluguel, CobrancaAluguel, RepasseProprietario } = require('../models');
const { Op } = require('sequelize');
const { reenviarRepasse, processarRepasse } = require('../services/repasseService');

const router = express.Router();

// GET /api/repasses — Lista todos os repasses
router.get('/repasses', async (req, res) => {
  try {
    const { mes, status, transfer_status } = req.query;
    const where = {};
    if (mes) where.mes_referencia = mes;
    if (status) where.status = status;
    if (transfer_status) where.transfer_status = transfer_status;

    const repasses = await RepasseProprietario.findAll({
      where,
      include: [{ model: ClienteAluguel, as: 'clienteAluguel', attributes: ['id', 'nome', 'proprietario_nome', 'proprietario_pix', 'corretor_nome', 'corretor_percentual'] }],
      order: [['created_at', 'DESC']],
    });
    res.status(200).json(repasses);
  } catch (error) {
    console.error('Erro ao listar repasses:', error);
    res.status(500).json({ error: 'Erro ao listar repasses' });
  }
});

// POST /api/repasses/gerar — Gera repasses do mês para todos os pagamentos confirmados
router.post('/repasses/gerar', async (req, res) => {
  try {
    const { mes, enviar_pix } = req.body; // formato "2026-03", enviar_pix: boolean
    if (!mes) return res.status(400).json({ error: 'Mes obrigatorio (formato: YYYY-MM)' });

    const inicio = `${mes}-01`;
    const fim = new Date(parseInt(mes.split('-')[0]), parseInt(mes.split('-')[1]), 0).toISOString().split('T')[0];

    const cobrancasPagas = await CobrancaAluguel.findAll({
      where: {
        status: { [Op.in]: ['CONFIRMED', 'RECEIVED'] },
        data_vencimento: { [Op.between]: [inicio, fim] },
      },
      include: [{ model: ClienteAluguel, as: 'clienteAluguel' }],
    });

    let criados = 0;
    let transferencias = 0;
    const erros = [];

    for (const cob of cobrancasPagas) {
      const cliente = cob.clienteAluguel;
      if (!cliente) continue;

      const existente = await RepasseProprietario.findOne({ where: { cobranca_aluguel_id: cob.id } });
      if (existente) continue;

      try {
        const repasse = await processarRepasse(cob, cliente, null, req.tenant?.asaas_api_key || null);
        criados++;
        if (repasse.transfer_status === 'REALIZADO') transferencias++;
        if (repasse.transfer_status === 'FALHOU') erros.push({ cliente: cliente.nome, erro: repasse.transfer_error });
      } catch (err) {
        erros.push({ cliente: cliente.nome, erro: err.message });
      }
    }

    res.status(200).json({
      message: `${criados} repasses gerados para ${mes}`,
      transferencias_pix: transferencias,
      erros: erros.length ? erros : undefined,
    });
  } catch (error) {
    console.error('Erro ao gerar repasses:', error);
    res.status(500).json({ error: 'Erro ao gerar repasses' });
  }
});

// POST /api/repasses/:id/transferir — Retenta PIX para um repasse FALHOU ou SEM_PIX
router.post('/repasses/:id/transferir', async (req, res) => {
  try {
    const repasse = await reenviarRepasse(parseInt(req.params.id), null, req.tenant?.asaas_api_key || null);
    res.status(200).json({ message: 'Transferência PIX realizada com sucesso', repasse });
  } catch (error) {
    console.error('Erro ao reenviar repasse:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/repasses/:id/confirmar — Marca repasse como realizado (manualmente, sem PIX)
router.put('/repasses/:id/confirmar', async (req, res) => {
  try {
    const repasse = await RepasseProprietario.findByPk(req.params.id);
    if (!repasse) return res.status(404).json({ error: 'Repasse nao encontrado' });

    await repasse.update({
      status: 'REALIZADO',
      data_repasse: new Date().toISOString().split('T')[0],
      observacao: req.body.observacao || null,
    });

    res.status(200).json(repasse);
  } catch (error) {
    console.error('Erro ao confirmar repasse:', error);
    res.status(500).json({ error: 'Erro ao confirmar repasse' });
  }
});

// GET /api/repasses/resumo — Resumo de repasses por mês
router.get('/repasses/resumo', async (req, res) => {
  try {
    const { mes } = req.query;
    if (!mes) return res.status(400).json({ error: 'Mes obrigatorio' });

    const repasses = await RepasseProprietario.findAll({
      where: { mes_referencia: mes },
      include: [{ model: ClienteAluguel, as: 'clienteAluguel', attributes: ['id', 'nome', 'proprietario_nome'] }],
    });

    const totalAluguel   = repasses.reduce((s, r) => s + parseFloat(r.valor_aluguel), 0);
    const totalTaxa      = repasses.reduce((s, r) => s + parseFloat(r.valor_taxa), 0);
    const totalRepasse   = repasses.reduce((s, r) => s + parseFloat(r.valor_repasse), 0);
    const totalComissao  = repasses.reduce((s, r) => s + parseFloat(r.comissao_corretor || 0), 0);
    const pendentes      = repasses.filter(r => r.status === 'PENDENTE').length;
    const realizados     = repasses.filter(r => r.status === 'REALIZADO').length;
    const falhos         = repasses.filter(r => r.transfer_status === 'FALHOU').length;
    const semPix         = repasses.filter(r => r.transfer_status === 'SEM_PIX').length;

    res.status(200).json({
      mes, total_repasses: repasses.length,
      total_aluguel:   Math.round(totalAluguel  * 100) / 100,
      total_taxa:      Math.round(totalTaxa     * 100) / 100,
      total_repasse:   Math.round(totalRepasse  * 100) / 100,
      total_comissao_corretor: Math.round(totalComissao * 100) / 100,
      pendentes, realizados, falhos, sem_pix: semPix,
      repasses,
    });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
});

// GET /api/clientealuguel/:id/multa-juros — Calcula multa e juros de cobrança vencida
router.get('/clientealuguel/:id/multa-juros', async (req, res) => {
  try {
    const cliente = await ClienteAluguel.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente nao encontrado' });

    const cobrancasVencidas = await CobrancaAluguel.findAll({
      where: { cliente_aluguel_id: cliente.id, status: 'OVERDUE' },
    });

    const { calcularMultaJuros } = require('../services/reguaCobrancaService');
    const resultados = cobrancasVencidas.map(cob => {
      const diasAtraso = Math.max(0, Math.floor((new Date() - new Date(cob.data_vencimento)) / (1000 * 60 * 60 * 24)));
      return {
        cobranca_id: cob.id,
        data_vencimento: cob.data_vencimento,
        ...calcularMultaJuros(
          parseFloat(cob.valor),
          parseFloat(cliente.percentual_multa || 2),
          parseFloat(cliente.percentual_juros_mora || 1),
          diasAtraso
        ),
      };
    });

    res.status(200).json(resultados);
  } catch (error) {
    console.error('Erro ao calcular multa/juros:', error);
    res.status(500).json({ error: 'Erro ao calcular multa/juros' });
  }
});

module.exports = router;
