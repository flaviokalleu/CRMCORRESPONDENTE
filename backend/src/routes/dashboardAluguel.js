const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { ClienteAluguel, CobrancaAluguel, Aluguel } = require('../models');

const router = express.Router();

// GET /api/dashboard/alugueis — Dashboard financeiro de alugueis
router.get('/dashboard/alugueis', async (req, res) => {
  try {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const primeiroDiaMes = new Date(anoAtual, mesAtual, 1).toISOString().split('T')[0];
    const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0).toISOString().split('T')[0];

    // Buscar dados basicos
    const [clientes, imoveis, cobrancasMes] = await Promise.all([
      ClienteAluguel.findAll(),
      Aluguel.findAll(),
      CobrancaAluguel.findAll({
        where: {
          data_vencimento: { [Op.between]: [primeiroDiaMes, ultimoDiaMes] },
        },
      }),
    ]);

    // Resumo
    const totalImoveis = imoveis.length;
    const imoveisAlugados = imoveis.filter(i => i.alugado).length;
    const totalInquilinos = clientes.length;

    const receitaPrevistaMes = clientes.reduce((sum, c) => sum + parseFloat(c.valor_aluguel || 0), 0);
    const receitaRecebidaMes = cobrancasMes
      .filter(c => c.status === 'CONFIRMED' || c.status === 'RECEIVED')
      .reduce((sum, c) => sum + parseFloat(c.valor || 0), 0);
    const inadimplenciaMes = receitaPrevistaMes - receitaRecebidaMes;

    const inquilinosEmDia = clientes.filter(c => {
      const diaVenc = parseInt(c.dia_vencimento);
      return hoje.getDate() <= diaVenc || c.pago;
    }).length;

    // Receita mensal (ultimos 12 meses)
    const receitaMensal = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1);
      const inicio = d.toISOString().split('T')[0];
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

      const cobrancasPeriodo = await CobrancaAluguel.findAll({
        where: { data_vencimento: { [Op.between]: [inicio, fim] } },
      });

      const recebido = cobrancasPeriodo
        .filter(c => c.status === 'CONFIRMED' || c.status === 'RECEIVED')
        .reduce((sum, c) => sum + parseFloat(c.valor || 0), 0);

      receitaMensal.push({
        mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        mes_label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        recebido: Math.round(recebido * 100) / 100,
        previsto: Math.round(receitaPrevistaMes * 100) / 100,
      });
    }

    // Ranking inadimplentes
    const inadimplentes = [];
    for (const cliente of clientes) {
      const cobrancasVencidas = await CobrancaAluguel.findAll({
        where: {
          cliente_aluguel_id: cliente.id,
          status: 'OVERDUE',
        },
      });

      if (cobrancasVencidas.length > 0) {
        const valorDevido = cobrancasVencidas.reduce((sum, c) => sum + parseFloat(c.valor || 0), 0);
        const maisAntiga = cobrancasVencidas.reduce((oldest, c) =>
          new Date(c.data_vencimento) < new Date(oldest.data_vencimento) ? c : oldest
        );
        const diasAtraso = Math.floor((hoje - new Date(maisAntiga.data_vencimento)) / (1000 * 60 * 60 * 24));

        inadimplentes.push({
          id: cliente.id,
          nome: cliente.nome,
          valor_devido: Math.round(valorDevido * 100) / 100,
          dias_atraso: diasAtraso,
          score_inquilino: cliente.score_inquilino,
          cobrancas_vencidas: cobrancasVencidas.length,
        });
      }
    }

    inadimplentes.sort((a, b) => b.valor_devido - a.valor_devido);

    // Distribuicao por forma de pagamento
    const todasCobrancas = await CobrancaAluguel.findAll({
      where: { status: { [Op.in]: ['CONFIRMED', 'RECEIVED'] } },
    });

    const distribuicao = { PIX: 0, BOLETO: 0, CREDIT_CARD: 0, UNDEFINED: 0 };
    for (const c of todasCobrancas) {
      const tipo = c.billing_type || 'UNDEFINED';
      distribuicao[tipo] = (distribuicao[tipo] || 0) + 1;
    }

    res.status(200).json({
      resumo: {
        receita_total_mes: Math.round(receitaRecebidaMes * 100) / 100,
        receita_prevista_mes: Math.round(receitaPrevistaMes * 100) / 100,
        inadimplencia_mes: Math.round(Math.max(0, inadimplenciaMes) * 100) / 100,
        taxa_inadimplencia: receitaPrevistaMes > 0
          ? Math.round((Math.max(0, inadimplenciaMes) / receitaPrevistaMes) * 10000) / 100
          : 0,
        taxa_ocupacao: totalImoveis > 0
          ? Math.round((imoveisAlugados / totalImoveis) * 10000) / 100
          : 0,
        total_imoveis: totalImoveis,
        imoveis_alugados: imoveisAlugados,
        imoveis_disponiveis: totalImoveis - imoveisAlugados,
        total_inquilinos: totalInquilinos,
        inquilinos_em_dia: inquilinosEmDia,
        inquilinos_inadimplentes: totalInquilinos - inquilinosEmDia,
      },
      receita_mensal: receitaMensal,
      ranking_inadimplentes: inadimplentes.slice(0, 10),
      distribuicao_pagamentos: distribuicao,
      previsao_proximo_mes: Math.round(receitaPrevistaMes * 100) / 100,
    });
  } catch (error) {
    console.error('Erro no dashboard de alugueis:', error);
    res.status(500).json({ error: 'Erro ao carregar dashboard de alugueis' });
  }
});

module.exports = router;
