const moment = require('moment-timezone');

// Etapas da régua de cobrança
const ETAPAS = [
  { etapa: 'D-5', dias: -5, mensagem: (nome, valor, venc) => `Ola ${nome}! Lembrete amigavel: seu aluguel de R$ ${valor} vence em 5 dias (${venc}). Fique atento!` },
  { etapa: 'D-1', dias: -1, mensagem: (nome, valor, venc) => `Ola ${nome}! Seu aluguel de R$ ${valor} vence amanha (${venc}). Nao esqueca de efetuar o pagamento.` },
  { etapa: 'D+1', dias: 1, mensagem: (nome, valor, venc, link) => `Ola ${nome}, seu aluguel de R$ ${valor} venceu ontem (${venc}). Por favor, regularize o pagamento o quanto antes.${link ? ' Pague aqui: ' + link : ''}` },
  { etapa: 'D+7', dias: 7, mensagem: (nome, valor, venc, link) => `Atencao ${nome}! Seu aluguel de R$ ${valor} esta vencido ha 7 dias (desde ${venc}). Multa e juros ja estao sendo aplicados.${link ? ' Regularize aqui: ' + link : ''}` },
  { etapa: 'D+15', dias: 15, mensagem: (nome, valor, venc, link) => `AVISO IMPORTANTE - ${nome}: Seu aluguel de R$ ${valor} esta vencido ha 15 dias (desde ${venc}). Entre em contato urgente para evitar medidas administrativas.${link ? ' Pague aqui: ' + link : ''}` },
];

// Processa a régua para todos os inquilinos
const processarReguaCobranca = async (ClienteAluguel, CobrancaAluguel, ReguaCobranca, whatsappClient, isAuthenticated) => {
  const hoje = moment().tz('America/Sao_Paulo');
  const clientes = await ClienteAluguel.findAll();
  let enviados = 0;

  for (const cliente of clientes) {
    const diaVencimento = parseInt(cliente.dia_vencimento);
    const mesAtual = hoje.format('YYYY-MM');

    // Calcular data de vencimento do mês atual
    const dataVencimento = moment().tz('America/Sao_Paulo').date(diaVencimento).startOf('day');
    const diffDias = hoje.diff(dataVencimento, 'days');

    for (const etapa of ETAPAS) {
      if (diffDias === etapa.dias * -1) continue; // skip se não é o dia certo
      // Verificar se estamos no dia correto para esta etapa
      // Para D-5: diffDias deve ser -5 (faltam 5 dias)
      // Para D+7: diffDias deve ser 7 (passou 7 dias)
      if (diffDias !== (etapa.dias * -1) && diffDias !== etapa.dias) continue;

      // Ajustar: D-5 = hoje está 5 dias ANTES do vencimento
      const diaCorreto = (etapa.dias < 0 && diffDias === etapa.dias) ||
                          (etapa.dias > 0 && diffDias === etapa.dias);
      if (!diaCorreto) continue;

      // Verificar se já foi enviada esta etapa neste mês
      const jaEnviada = await ReguaCobranca.findOne({
        where: {
          cliente_aluguel_id: cliente.id,
          etapa: etapa.etapa,
          mes_referencia: mesAtual,
          mensagem_enviada: true,
        },
      });

      if (jaEnviada) continue;

      // Buscar link de pagamento se houver
      let invoiceUrl = '';
      const cobrancaPendente = await CobrancaAluguel.findOne({
        where: { cliente_aluguel_id: cliente.id, status: ['PENDING', 'OVERDUE'] },
        order: [['data_vencimento', 'DESC']],
      });
      if (cobrancaPendente && cobrancaPendente.invoice_url) {
        invoiceUrl = cobrancaPendente.invoice_url;
      }

      const valor = parseFloat(cliente.valor_aluguel).toFixed(2);
      const venc = dataVencimento.format('DD/MM/YYYY');
      const mensagem = etapa.mensagem(cliente.nome, valor, venc, invoiceUrl);

      // Enviar WhatsApp
      if (whatsappClient && isAuthenticated) {
        try {
          const numero = cliente.telefone.replace(/\D/g, '');
          const dest = numero.startsWith('55') ? numero : `55${numero}`;
          await whatsappClient.sendMessage(`${dest}@c.us`, mensagem);
          enviados++;
        } catch (err) {
          console.error(`Regua: erro ao enviar para ${cliente.nome}:`, err.message);
        }
      }

      // Registrar envio
      await ReguaCobranca.create({
        cliente_aluguel_id: cliente.id,
        cobranca_aluguel_id: cobrancaPendente ? cobrancaPendente.id : null,
        etapa: etapa.etapa,
        dias_referencia: etapa.dias,
        mensagem_enviada: true,
        data_envio: new Date(),
        data_referencia: dataVencimento.format('YYYY-MM-DD'),
        mes_referencia: mesAtual,
      });

      console.log(`Regua ${etapa.etapa} enviada para ${cliente.nome}`);
    }
  }

  return enviados;
};

// Calcula multa e juros para cobrança vencida
const calcularMultaJuros = (valorOriginal, percentualMulta, percentualJurosMora, diasAtraso) => {
  const multa = valorOriginal * (percentualMulta / 100);
  const jurosDiario = (percentualJurosMora / 100) / 30; // juros mensal convertido para diário
  const juros = valorOriginal * jurosDiario * diasAtraso;
  const valorTotal = valorOriginal + multa + juros;

  return {
    valor_original: Math.round(valorOriginal * 100) / 100,
    multa: Math.round(multa * 100) / 100,
    juros: Math.round(juros * 100) / 100,
    dias_atraso: diasAtraso,
    valor_total: Math.round(valorTotal * 100) / 100,
    percentual_multa: percentualMulta,
    percentual_juros_mora: percentualJurosMora,
  };
};

module.exports = { processarReguaCobranca, calcularMultaJuros, ETAPAS };
