const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let model = null;

if (GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  console.log('Score Inquilino: Gemini AI configurado');
} else {
  console.warn('Score Inquilino: GEMINI_API_KEY nao configurado, usando score local');
}

// Calcula metricas locais do inquilino
const calcularMetricas = (clienteAluguel, cobrancas) => {
  const historico = Array.isArray(clienteAluguel.historico_pagamentos)
    ? clienteAluguel.historico_pagamentos
    : [];

  // Combinar pagamentos manuais + cobrancas Asaas
  let totalPagamentos = historico.length;
  let pagamentosPontuais = 0;
  let pagamentosAtrasados = 0;
  let diasAtrasoTotal = 0;

  // Analise do historico manual
  for (const pag of historico) {
    if (pag.status === 'Pago') {
      pagamentosPontuais++;
    }
  }

  // Analise das cobrancas Asaas
  if (cobrancas && cobrancas.length > 0) {
    for (const cob of cobrancas) {
      totalPagamentos++;
      if (cob.status === 'CONFIRMED' || cob.status === 'RECEIVED') {
        if (cob.data_pagamento && cob.data_vencimento) {
          const dtPagamento = new Date(cob.data_pagamento);
          const dtVencimento = new Date(cob.data_vencimento);
          const diffDias = Math.floor((dtPagamento - dtVencimento) / (1000 * 60 * 60 * 24));
          if (diffDias <= 0) {
            pagamentosPontuais++;
          } else {
            pagamentosAtrasados++;
            diasAtrasoTotal += diffDias;
          }
        } else {
          pagamentosPontuais++;
        }
      } else if (cob.status === 'OVERDUE') {
        pagamentosAtrasados++;
        const dtVencimento = new Date(cob.data_vencimento);
        const hoje = new Date();
        diasAtrasoTotal += Math.floor((hoje - dtVencimento) / (1000 * 60 * 60 * 24));
      }
    }
  }

  // Tempo de contrato
  let mesesContrato = 0;
  if (clienteAluguel.data_inicio_contrato) {
    const inicio = new Date(clienteAluguel.data_inicio_contrato);
    const hoje = new Date();
    mesesContrato = Math.max(1, Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24 * 30)));
  } else {
    mesesContrato = Math.max(1, totalPagamentos);
  }

  const taxaPontualidade = totalPagamentos > 0 ? (pagamentosPontuais / totalPagamentos) * 100 : 0;
  const mediaDiasAtraso = pagamentosAtrasados > 0 ? diasAtrasoTotal / pagamentosAtrasados : 0;

  return {
    total_pagamentos: totalPagamentos,
    pagamentos_pontuais: pagamentosPontuais,
    pagamentos_atrasados: pagamentosAtrasados,
    taxa_pontualidade: Math.round(taxaPontualidade * 100) / 100,
    media_dias_atraso: Math.round(mediaDiasAtraso * 100) / 100,
    meses_contrato: mesesContrato,
    valor_aluguel: parseFloat(clienteAluguel.valor_aluguel) || 0,
  };
};

// Score local (fallback sem IA)
const calcularScoreLocal = (metricas) => {
  let score = 50; // Base

  // Pontualidade (peso 40)
  score += (metricas.taxa_pontualidade / 100) * 40;

  // Penalidade por atraso (peso -20)
  if (metricas.media_dias_atraso > 0) {
    score -= Math.min(20, metricas.media_dias_atraso * 2);
  }

  // Bonus por tempo de contrato (peso 10)
  score += Math.min(10, metricas.meses_contrato * 0.5);

  // Bonus por volume de pagamentos (peso 5)
  if (metricas.total_pagamentos >= 6) score += 5;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let classificacao = 'Risco';
  if (score >= 80) classificacao = 'Excelente';
  else if (score >= 60) classificacao = 'Bom';
  else if (score >= 40) classificacao = 'Regular';

  return {
    score,
    classificacao,
    observacoes: [
      `Taxa de pontualidade: ${metricas.taxa_pontualidade}%`,
      `Media de atraso: ${metricas.media_dias_atraso} dias`,
      `Tempo como inquilino: ${metricas.meses_contrato} meses`,
    ],
    recomendacao: score >= 60
      ? 'Inquilino confiavel, manter acompanhamento padrao.'
      : 'Atenção redobrada. Considerar contato preventivo antes do vencimento.',
    fonte: 'calculo_local',
  };
};

// Score com Gemini AI
const calcularScoreComIA = async (clienteAluguel, metricas) => {
  if (!model) {
    return calcularScoreLocal(metricas);
  }

  try {
    const prompt = `Voce e um analista de risco imobiliario. Analise o perfil de pagamento deste inquilino e retorne APENAS um JSON valido (sem markdown, sem texto extra).

Dados do inquilino:
- Nome: ${clienteAluguel.nome}
- Valor do aluguel: R$ ${metricas.valor_aluguel}
- Total de pagamentos registrados: ${metricas.total_pagamentos}
- Pagamentos pontuais: ${metricas.pagamentos_pontuais}
- Pagamentos atrasados: ${metricas.pagamentos_atrasados}
- Taxa de pontualidade: ${metricas.taxa_pontualidade}%
- Media de dias de atraso: ${metricas.media_dias_atraso} dias
- Tempo como inquilino: ${metricas.meses_contrato} meses

Retorne EXATAMENTE este formato JSON:
{
  "score": <numero de 0 a 100>,
  "classificacao": "<Excelente|Bom|Regular|Risco>",
  "observacoes": ["<observacao 1>", "<observacao 2>", "<observacao 3>"],
  "recomendacao": "<recomendacao de acao para o proprietario>"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extrair JSON da resposta
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Score IA: resposta nao contem JSON valido');
      return calcularScoreLocal(metricas);
    }

    const scoreData = JSON.parse(jsonMatch[0]);

    return {
      score: Math.max(0, Math.min(100, parseInt(scoreData.score) || 50)),
      classificacao: scoreData.classificacao || 'Regular',
      observacoes: Array.isArray(scoreData.observacoes) ? scoreData.observacoes : [],
      recomendacao: scoreData.recomendacao || '',
      fonte: 'gemini_ai',
    };
  } catch (error) {
    console.error('Score IA: erro no Gemini, usando score local:', error.message);
    return calcularScoreLocal(metricas);
  }
};

// Funcao principal: calcula score de um inquilino
const calcularScoreInquilino = async (clienteAluguel, cobrancas) => {
  const metricas = calcularMetricas(clienteAluguel, cobrancas);
  const resultado = await calcularScoreComIA(clienteAluguel, metricas);

  return {
    ...resultado,
    metricas,
    atualizado_em: new Date().toISOString(),
  };
};

// Calcula scores de todos os inquilinos (para cron job)
const calcularScoreTodosInquilinos = async (ClienteAluguel, CobrancaAluguel) => {
  try {
    const clientes = await ClienteAluguel.findAll();
    let atualizados = 0;

    for (const cliente of clientes) {
      try {
        const cobrancas = await CobrancaAluguel.findAll({
          where: { cliente_aluguel_id: cliente.id },
        });

        const resultado = await calcularScoreInquilino(cliente, cobrancas);

        await cliente.update({
          score_inquilino: resultado.score,
          score_detalhes: resultado,
          score_atualizado_em: new Date(),
        });

        atualizados++;
      } catch (err) {
        console.error(`Score: erro ao calcular score do cliente ${cliente.id}:`, err.message);
      }
    }

    console.log(`Score: ${atualizados}/${clientes.length} inquilinos atualizados`);
    return atualizados;
  } catch (error) {
    console.error('Score: erro geral:', error);
    return 0;
  }
};

module.exports = {
  calcularScoreInquilino,
  calcularScoreTodosInquilinos,
  calcularMetricas,
  calcularScoreLocal,
};
