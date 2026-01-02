const cron = require('node-cron');
const moment = require('moment-timezone');
const { Lembrete, ClienteAluguel } = require('../models');
const { client, isAuthenticated } = require('./whatsappRoutes');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { backupDatabase } = require('../utils/backup');

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
          const message = `Olá tudo bem? ${cliente.nome} seu aluguel vence em 3 dias. Por favor não esqueça de enviar seu pagamento`;

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

  console.log('Cron jobs scheduled');
};

module.exports = startCronJobs;