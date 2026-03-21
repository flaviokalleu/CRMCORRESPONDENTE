const cron = require('node-cron');
const moment = require('moment-timezone');
const { Lembrete, ClienteAluguel, CobrancaAluguel, ReguaCobranca } = require('../models');
const { client, isAuthenticated } = require('./whatsappRoutes');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { backupDatabase } = require('../utils/backup');
const asaasService = require('../services/asaasService');
const { calcularScoreTodosInquilinos } = require('../services/scoreInquilinoService');
const { verificarContratosReajuste, calcularReajuste } = require('../services/contratoService');
const { processarReguaCobranca } = require('../services/reguaCobrancaService');

const defaultPhoneNumber = process.env.DEFAULT_PHONE_NUMBER;

const isHorarioComercial = () => {
  const now = moment().tz('America/Sao_Paulo');
  const diaSemana = now.isoWeekday(); // 1 = segunda-feira, 7 = domingo
  const hora = now.hour();

  if (diaSemana >= 1 && diaSemana <= 5) {
    return hora >= 9 && hora < 18;
  } else if (diaSemana === 6) {
    return hora >= 9 && hora < 13;
  } else {
    return false;
  }
};

const verificarLembretesParaNotificacao = async () => {
  console.log('Verificando lembretes para notificação...');
  try {
    const lembretes = await Lembrete.findAll();
    const now = moment().tz('America/Sao_Paulo');

    if (!isHorarioComercial()) {
      console.log('Fora do horário comercial. Notificações não enviadas.');
      return;
    }

    for (const lembrete of lembretes) {
      if (lembrete.status === 'concluido') continue;

      const lembreteData = moment(lembrete.data).tz('America/Sao_Paulo');
      const diffMinutes = lembreteData.diff(now, 'minutes');

      if (diffMinutes === 15) {
        if (client && isAuthenticated) {
          const destinatario = lembrete.destinatario || defaultPhoneNumber;
          const message = `Lembrete: ${lembrete.titulo} - ${lembrete.descricao} está agendado para daqui a 15 minutos.`;

          await client.sendMessage(`55${destinatario}@c.us`, message);
          console.log(`Notificação enviada para ${destinatario}`);
        } else {
          console.error('Cliente WhatsApp não está pronto.');
        }
      }
    }
  } catch (error) {
    console.error('Erro ao verificar lembretes:', error);
  }
};

const verificarVencimentosParaNotificacao = async () => {
  console.log('Verificando vencimentos para notificação...');
  try {
    const clientes = await ClienteAluguel.findAll();
    const now = moment().tz('America/Sao_Paulo');

    for (const cliente of clientes) {
      const diaVencimento = moment().tz('America/Sao_Paulo').date(cliente.dia_vencimento).hour(0).minute(0).second(0);
      const diffDays = diaVencimento.diff(now, 'days');

      if (diffDays === 3) {
        if (client && isAuthenticated) {
          const destinatario = cliente.telefone || defaultPhoneNumber;

          // Buscar link de pagamento Asaas se disponível
          let linkPagamento = '';
          if (cliente.asaas_subscription_id) {
            try {
              const cobrancaPendente = await CobrancaAluguel.findOne({
                where: {
                  cliente_aluguel_id: cliente.id,
                  status: 'PENDING',
                },
                order: [['data_vencimento', 'ASC']],
              });
              if (cobrancaPendente && cobrancaPendente.invoice_url) {
                linkPagamento = `\nPague aqui: ${cobrancaPendente.invoice_url}`;
              }
            } catch (e) {
              console.error('Erro ao buscar cobranca pendente:', e.message);
            }
          }

          const message = `Olá tudo bem? ${cliente.nome} seu aluguel vence em 3 dias. Por favor não esqueça de enviar seu pagamento.${linkPagamento}`;

          await client.sendMessage(`55${destinatario}@c.us`, message);
          console.log(`Notificação de vencimento enviada para ${destinatario}`);
        } else {
          console.error('Cliente WhatsApp não está pronto.');
        }
      }
    }
  } catch (error) {
    console.error('Erro ao verificar vencimentos:', error);
  }
};

const sincronizarCobrancasAsaas = async () => {
  if (!asaasService.ASAAS_API_KEY) return;

  console.log('Sincronizando cobrancas com Asaas...');
  try {
    const clientes = await ClienteAluguel.findAll({
      where: {
        asaas_subscription_id: { [require('sequelize').Op.ne]: null },
      },
    });

    for (const cliente of clientes) {
      try {
        const pagamentosAsaas = await asaasService.listarCobrancasPorAssinatura(cliente.asaas_subscription_id);

        if (!pagamentosAsaas.data) continue;

        for (const pagamento of pagamentosAsaas.data) {
          const existente = await CobrancaAluguel.findOne({
            where: { asaas_payment_id: pagamento.id },
          });

          const statusLocal = mapAsaasStatusCron(pagamento.status);

          if (existente) {
            // Atualizar status se mudou
            if (existente.status !== statusLocal) {
              await existente.update({
                status: statusLocal,
                data_pagamento: pagamento.paymentDate || existente.data_pagamento,
                invoice_url: pagamento.invoiceUrl || existente.invoice_url,
                bank_slip_url: pagamento.bankSlipUrl || existente.bank_slip_url,
                billing_type: pagamento.billingType || existente.billing_type,
              });
            }
          } else {
            // Criar cobrança local
            await CobrancaAluguel.create({
              cliente_aluguel_id: cliente.id,
              asaas_payment_id: pagamento.id,
              valor: pagamento.value,
              data_vencimento: pagamento.dueDate,
              data_pagamento: pagamento.paymentDate || null,
              status: statusLocal,
              billing_type: pagamento.billingType || 'UNDEFINED',
              invoice_url: pagamento.invoiceUrl || null,
              bank_slip_url: pagamento.bankSlipUrl || null,
              tipo: 'recorrente',
              descricao: pagamento.description || 'Aluguel mensal',
            });
          }
        }
      } catch (clienteError) {
        console.error(`Erro ao sincronizar cobrancas do cliente ${cliente.id}:`, clienteError.message);
      }
    }

    console.log('Sincronizacao de cobrancas Asaas concluida');
  } catch (error) {
    console.error('Erro na sincronizacao de cobrancas Asaas:', error);
  }
};

function mapAsaasStatusCron(asaasStatus) {
  const statusMap = {
    'PENDING': 'PENDING',
    'RECEIVED': 'CONFIRMED',
    'CONFIRMED': 'CONFIRMED',
    'OVERDUE': 'OVERDUE',
    'REFUNDED': 'REFUNDED',
    'RECEIVED_IN_CASH': 'CONFIRMED',
  };
  return statusMap[asaasStatus] || 'PENDING';
}

const enviarRelatorioMensalProprietario = async () => {
  try {
    const now = moment().tz('America/Sao_Paulo');
    const mesAnterior = moment(now).subtract(1, 'month');
    const nomeMes = mesAnterior.format('MMMM/YYYY');

    const inicio = mesAnterior.startOf('month').format('YYYY-MM-DD');
    const fim = mesAnterior.endOf('month').format('YYYY-MM-DD');

    const clientes = await ClienteAluguel.findAll();

    const cobrancasMes = await CobrancaAluguel.findAll({
      where: {
        data_vencimento: {
          [require('sequelize').Op.between]: [inicio, fim],
        },
      },
      include: [{ model: ClienteAluguel, as: 'clienteAluguel' }],
    });

    const pagos = cobrancasMes.filter(c => c.status === 'CONFIRMED' || c.status === 'RECEIVED');
    const pendentes = cobrancasMes.filter(c => c.status === 'OVERDUE' || c.status === 'PENDING');

    const totalRecebido = pagos.reduce((s, c) => s + parseFloat(c.valor || 0), 0);
    const totalPendente = pendentes.reduce((s, c) => s + parseFloat(c.valor || 0), 0);
    const taxaAdimplencia = cobrancasMes.length > 0
      ? Math.round((pagos.length / cobrancasMes.length) * 100)
      : 0;

    let inadimplentesMsg = '';
    for (const cob of pendentes) {
      if (cob.clienteAluguel) {
        const dias = Math.floor((new Date() - new Date(cob.data_vencimento)) / (1000 * 60 * 60 * 24));
        inadimplentesMsg += `\n- ${cob.clienteAluguel.nome}: R$ ${parseFloat(cob.valor).toFixed(2)} (${dias} dias)`;
      }
    }

    const previsao = clientes.reduce((s, c) => s + parseFloat(c.valor_aluguel || 0), 0);

    const mensagem = `Relatorio de Alugueis - ${nomeMes}\n\nRecebido: R$ ${totalRecebido.toFixed(2)} (${pagos.length} inquilinos)\nPendente: R$ ${totalPendente.toFixed(2)} (${pendentes.length} inquilinos)\nTaxa de adimplencia: ${taxaAdimplencia}%${inadimplentesMsg ? '\n\nInadimplentes:' + inadimplentesMsg : ''}\n\nPrevisao proximo mes: R$ ${previsao.toFixed(2)}`;

    if (client && isAuthenticated && defaultPhoneNumber) {
      await client.sendMessage(`55${defaultPhoneNumber}@c.us`, mensagem);
      console.log('Relatorio mensal enviado para:', defaultPhoneNumber);
    } else {
      console.log('Relatorio mensal (WhatsApp indisponivel):', mensagem);
    }
  } catch (error) {
    console.error('Erro ao gerar relatorio mensal:', error);
  }
};

const startCronJobs = async () => {
  // Executa backup imediatamente ao iniciar
  try {
    await backupDatabase();
    console.log('Initial backup completed');
  } catch (error) {
    console.error('Initial backup failed:', error);
  }

  // Cron job para executar a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    console.log('Executando cron job a cada 5 minutos...');
    await verificarLembretesParaNotificacao();
    await verificarVencimentosParaNotificacao();
  });

  // Cron job para regua de cobranca automatica - roda a cada hora
  cron.schedule('0 * * * *', async () => {
    if (!isHorarioComercial()) return;
    console.log('Executando regua de cobranca automatica...');
    try {
      const enviados = await processarReguaCobranca(ClienteAluguel, CobrancaAluguel, ReguaCobranca, client, isAuthenticated);
      console.log(`Regua de cobranca: ${enviados} mensagens enviadas`);
    } catch (error) {
      console.error('Erro na regua de cobranca:', error);
    }
  });

  // Cron job para sincronizar cobrancas Asaas a cada 30 minutos
  cron.schedule('*/30 * * * *', async () => {
    console.log('Executando sincronizacao de cobrancas Asaas...');
    await sincronizarCobrancasAsaas();
  });

  // Cron job para realizar backup a cada 6 horas
  cron.schedule('0 */6 * * *', async () => {
    console.log('Executando backup a cada 6 horas...');
    try {
      await backupDatabase();
      console.log('Scheduled backup completed');
    } catch (error) {
      console.error('Scheduled backup failed:', error);
    }
  });

  // Cron job para recalcular scores de inquilinos diariamente as 6h
  cron.schedule('0 6 * * *', async () => {
    console.log('Executando recalculo de scores de inquilinos...');
    try {
      await calcularScoreTodosInquilinos(ClienteAluguel, CobrancaAluguel);
    } catch (error) {
      console.error('Erro ao recalcular scores:', error);
    }
  });

  // Cron job para verificar reajustes de contratos diariamente as 7h
  cron.schedule('0 7 * * *', async () => {
    console.log('Verificando reajustes de contratos...');
    try {
      const alertas = await verificarContratosReajuste(ClienteAluguel);
      for (const alerta of alertas) {
        if (client && isAuthenticated) {
          const destinatario = alerta.cliente.telefone || defaultPhoneNumber;
          const msg = `Ola ${alerta.cliente.nome}! Informamos que seu contrato de aluguel tera reajuste em 30 dias. Valor atual: R$ ${alerta.reajuste.valor_atual.toFixed(2)}. Valor estimado apos reajuste (${alerta.reajuste.indice_nome}): R$ ${alerta.reajuste.valor_reajustado.toFixed(2)}.`;
          await client.sendMessage(`55${destinatario.replace(/\D/g, '')}@c.us`, msg);
          console.log('Alerta de reajuste enviado para:', destinatario);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar reajustes:', error);
    }
  });

  // Cron job para relatorio mensal pro proprietario - dia 1 de cada mes as 9h
  cron.schedule('0 9 1 * *', async () => {
    console.log('Gerando relatorio mensal de alugueis...');
    try {
      await enviarRelatorioMensalProprietario();
    } catch (error) {
      console.error('Erro ao enviar relatorio mensal:', error);
    }
  });

  console.log('Cron jobs scheduled');
};

module.exports = startCronJobs;