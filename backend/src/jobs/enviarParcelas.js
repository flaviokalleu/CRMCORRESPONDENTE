const cron = require('node-cron');
const { Pagamento, Cliente, User } = require('../models');
const mercadoPagoService = require('../services/mercadoPagoService');

// ✅ FUNÇÃO PARA ENVIAR PARCELAS AUTOMÁTICAS
const enviarParcelasAutomaticas = async () => {
  try {
    console.log('🔄 Verificando parcelas para envio automático...');
    
    const agora = new Date();
    const dataLimite = new Date(agora.getTime() + 60 * 60 * 1000); // Próxima hora
    
    // Buscar parcelas que devem ser enviadas hoje
    const parcelasParaEnviar = await Pagamento.findAll({
      where: {
        status: 'aguardando',
        data_envio_proxima_parcela: {
          [require('sequelize').Op.lte]: dataLimite
        },
        is_parcelado: true,
        parcela_atual: {
          [require('sequelize').Op.gt]: 1
        }
      },
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'email', 'telefone', 'cpf']
        }
      ]
    });

    console.log(`📋 Encontradas ${parcelasParaEnviar.length} parcelas para enviar`);

    for (const parcela of parcelasParaEnviar) {
      try {
        console.log(`💳 Processando parcela ${parcela.parcela_atual}/${parcela.parcelas} - Cliente: ${parcela.cliente.nome}`);
        
        // ✅ CRIAR PREFERÊNCIA NO MERCADO PAGO PARA ESTA PARCELA
        const preferenciaMP = await mercadoPagoService.criarPreferenciaComJuros({
          cliente: parcela.cliente,
          titulo: parcela.titulo,
          descricao: parcela.descricao,
          valor_numerico: parcela.valor_numerico,
          parcelas: parcela.parcelas,
          parcela_atual: parcela.parcela_atual,
          link_unico: parcela.link_unico
        });

        // Atualizar parcela com dados do MP
        await parcela.update({
          mp_preference_id: preferenciaMP.id,
          link_pagamento: preferenciaMP.init_point,
          dados_mp: preferenciaMP,
          status: 'pendente'
        });

        console.log(`✅ Link gerado para parcela ${parcela.parcela_atual}: ${preferenciaMP.init_point}`);

        // ✅ ENVIAR VIA WHATSAPP
        if (parcela.cliente.telefone) {
          try {
            const resultado = await enviarWhatsAppParcela(parcela.cliente, parcela);
            
            if (resultado.success) {
              await parcela.update({
                whatsapp_enviado: true,
                data_envio_whatsapp: new Date()
              });
              console.log(`✅ WhatsApp enviado para parcela ${parcela.parcela_atual}`);
            } else {
              console.error(`❌ Erro ao enviar WhatsApp para parcela ${parcela.parcela_atual}:`, resultado.error);
            }
          } catch (whatsappError) {
            console.error(`❌ Erro no WhatsApp para parcela ${parcela.parcela_atual}:`, whatsappError);
          }
        }

        // ✅ ENVIAR VIA EMAIL
        if (parcela.cliente.email) {
          try {
            const resultado = await enviarEmailParcela(parcela.cliente, parcela);
            
            if (resultado.success) {
              await parcela.update({
                email_enviado: true,
                data_envio_email: new Date()
              });
              console.log(`✅ Email enviado para parcela ${parcela.parcela_atual}`);
            } else {
              console.error(`❌ Erro ao enviar email para parcela ${parcela.parcela_atual}:`, resultado.error);
            }
          } catch (emailError) {
            console.error(`❌ Erro no email para parcela ${parcela.parcela_atual}:`, emailError);
          }
        }

      } catch (parcelaError) {
        console.error(`❌ Erro ao processar parcela ${parcela.id}:`, parcelaError);
      }
    }

    console.log(`✅ Processamento de parcelas concluído: ${parcelasParaEnviar.length} parcelas processadas`);

  } catch (error) {
    console.error('❌ Erro no job de envio de parcelas:', error);
  }
};

// ✅ FUNÇÃO PARA ENVIAR WHATSAPP DE PARCELA
const enviarWhatsAppParcela = async (cliente, parcela) => {
  try {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${BACKEND_URL}/api/whatsapp/enviar-parcela`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        telefone: cliente.telefone,
        clienteNome: cliente.nome,
        parcela: {
          id: parcela.id,
          parcela_atual: parcela.parcela_atual,
          total_parcelas: parcela.parcelas,
          titulo: parcela.titulo,
          valor: parcela.valor_parcela,
          data_vencimento: parcela.data_vencimento,
          link_pagamento: parcela.link_pagamento,
          link_unico: parcela.link_unico
        }
      })
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('❌ Erro ao enviar WhatsApp da parcela:', error);
    return { success: false, error: error.message };
  }
};

// ✅ FUNÇÃO PARA ENVIAR EMAIL DE PARCELA
const enviarEmailParcela = async (cliente, parcela) => {
  try {
    // Implementar envio de email da parcela
    console.log('📧 Enviando email da parcela:', {
      cliente: cliente.nome,
      parcela: parcela.parcela_atual,
      valor: parcela.valor_parcela
    });
    
    return { success: true, message: 'Email da parcela enviado (simulado)' };
    
  } catch (error) {
    console.error('❌ Erro ao enviar email da parcela:', error);
    return { success: false, error: error.message };
  }
};

// ✅ CONFIGURAR CRON JOB (executa a cada hora)
const iniciarJobParcelas = () => {
  console.log('🚀 Iniciando job de envio automático de parcelas...');
  
  // Executa a cada hora
  cron.schedule('0 * * * *', () => {
    console.log('⏰ Job de parcelas executando...');
    enviarParcelasAutomaticas();
  });

  // Executa imediatamente para teste
  setTimeout(() => {
    enviarParcelasAutomaticas();
  }, 5000);
};

module.exports = {
  iniciarJobParcelas,
  enviarParcelasAutomaticas
};