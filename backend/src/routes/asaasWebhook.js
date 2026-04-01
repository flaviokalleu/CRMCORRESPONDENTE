const express = require('express');
const router = express.Router();
const { ClienteAluguel, CobrancaAluguel, Tenant } = require('../models');
const { client, isAuthenticated } = require('./whatsappRoutes');
const { gerarReciboPDF } = require('../services/reciboService');
const { processarRepasse } = require('../services/repasseService');

const WEBHOOK_TOKEN_GLOBAL = process.env.ASAAS_WEBHOOK_TOKEN;

/**
 * Processa o corpo do webhook para um tenant identificado.
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {string|null} webhookToken - token esperado (null = sem validação)
 * @param {string|null} apiKey - chave Asaas do tenant (null = usa global)
 */
async function processarWebhook(req, res, webhookToken, apiKey) {
  try {
    // Validar token do webhook (se configurado)
    if (webhookToken) {
      const receivedToken = req.headers['asaas-access-token'];
      if (receivedToken !== webhookToken) {
        console.error('Asaas webhook: token invalido');
        return res.status(401).json({ error: 'Token invalido' });
      }
    }

    const { event, payment } = req.body;
    console.log('Asaas webhook recebido:', event, payment?.id);

    if (!event || !payment) {
      return res.status(200).json({ received: true });
    }

    // Buscar cobrança local pelo asaas_payment_id
    let cobranca = await CobrancaAluguel.findOne({
      where: { asaas_payment_id: payment.id },
      include: [{ model: ClienteAluguel, as: 'clienteAluguel' }],
    });

    // Se não existe localmente e veio de uma assinatura, cria o registro
    if (!cobranca && payment.subscription) {
      const clienteAluguel = await ClienteAluguel.findOne({
        where: { asaas_subscription_id: payment.subscription },
      });

      if (clienteAluguel) {
        cobranca = await CobrancaAluguel.create({
          cliente_aluguel_id: clienteAluguel.id,
          asaas_payment_id: payment.id,
          valor: payment.value,
          data_vencimento: payment.dueDate,
          status: 'PENDING',
          billing_type: payment.billingType || 'UNDEFINED',
          invoice_url: payment.invoiceUrl || null,
          bank_slip_url: payment.bankSlipUrl || null,
          tipo: 'recorrente',
          descricao: payment.description || 'Aluguel mensal',
        });
        cobranca.clienteAluguel = clienteAluguel;
        console.log('CobrancaAluguel criada via webhook:', cobranca.id);
      }
    }

    if (!cobranca) {
      console.log('Asaas webhook: cobranca nao encontrada para payment', payment.id);
      return res.status(200).json({ received: true });
    }

    const clienteAluguel = cobranca.clienteAluguel || await ClienteAluguel.findByPk(cobranca.cliente_aluguel_id);

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        // Atualizar cobrança
        await cobranca.update({
          status: 'CONFIRMED',
          data_pagamento: new Date().toISOString().split('T')[0],
          billing_type: payment.billingType || cobranca.billing_type,
        });

        // Atualizar ClienteAluguel
        if (clienteAluguel) {
          // Marcar como pago
          clienteAluguel.pago = true;

          // Adicionar ao historico_pagamentos para compatibilidade
          const historico = Array.isArray(clienteAluguel.historico_pagamentos)
            ? clienteAluguel.historico_pagamentos
            : [];

          historico.push({
            id: Date.now(),
            data: new Date().toISOString().split('T')[0],
            valor: payment.value,
            status: 'Pago',
            forma_pagamento: payment.billingType || 'Asaas',
            asaas_payment_id: payment.id,
          });

          clienteAluguel.historico_pagamentos = historico;
          clienteAluguel.changed('historico_pagamentos', true);
          await clienteAluguel.save();

          // Gerar recibo PDF automaticamente
          let reciboMsg = '';
          try {
            const recibo = await gerarReciboPDF(cobranca, clienteAluguel);
            await cobranca.update({ recibo_url: recibo.url_relativa });
            reciboMsg = `\nSeu recibo esta disponivel no portal do inquilino.`;
          } catch (reciboErr) {
            console.error('Erro ao gerar recibo:', reciboErr.message);
          }

          // Enviar WhatsApp de confirmação
          await enviarWhatsApp(
            clienteAluguel.telefone,
            `Ola ${clienteAluguel.nome}! Seu pagamento de aluguel no valor de R$ ${parseFloat(payment.value).toFixed(2)} foi confirmado. Obrigado!${reciboMsg}`
          );

          // Processar repasse automático ao proprietário via PIX
          try {
            await processarRepasse(cobranca, clienteAluguel, enviarWhatsApp, apiKey);
          } catch (repasseErr) {
            // Não bloqueia o webhook — o repasse pode ser reprocessado manualmente
            console.error('Erro ao processar repasse automático:', repasseErr.message);
          }
        }

        console.log('Pagamento confirmado:', payment.id);
        break;
      }

      case 'PAYMENT_OVERDUE': {
        await cobranca.update({ status: 'OVERDUE' });

        if (clienteAluguel) {
          clienteAluguel.pago = false;
          await clienteAluguel.save();

          const linkMsg = cobranca.invoice_url
            ? ` Pague aqui: ${cobranca.invoice_url}`
            : '';

          await enviarWhatsApp(
            clienteAluguel.telefone,
            `Ola ${clienteAluguel.nome}, seu aluguel de R$ ${parseFloat(payment.value).toFixed(2)} venceu em ${payment.dueDate}. Por favor regularize seu pagamento.${linkMsg}`
          );
        }

        console.log('Pagamento vencido:', payment.id);
        break;
      }

      case 'PAYMENT_CREATED': {
        await cobranca.update({
          status: 'PENDING',
          invoice_url: payment.invoiceUrl || cobranca.invoice_url,
          bank_slip_url: payment.bankSlipUrl || cobranca.bank_slip_url,
          billing_type: payment.billingType || cobranca.billing_type,
        });

        console.log('Pagamento criado no Asaas:', payment.id);
        break;
      }

      case 'PAYMENT_REFUNDED': {
        await cobranca.update({ status: 'REFUNDED' });
        console.log('Pagamento estornado:', payment.id);
        break;
      }

      case 'PAYMENT_DELETED': {
        await cobranca.update({ status: 'CANCELLED' });
        console.log('Pagamento cancelado:', payment.id);
        break;
      }

      default:
        console.log('Asaas webhook evento nao tratado:', event);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook Asaas:', error);
    // Sempre retorna 200 para evitar retries desnecessários
    res.status(200).json({ received: true, error: error.message });
  }
}

// POST /api/asaas/webhook/:tenantSlug — webhook por tenant (chave e token individuais)
router.post('/asaas/webhook/:tenantSlug', async (req, res) => {
  const { tenantSlug } = req.params;

  const tenant = await Tenant.findOne({ where: { slug: tenantSlug } });
  if (!tenant) {
    console.error(`Asaas webhook: tenant "${tenantSlug}" não encontrado`);
    return res.status(404).json({ error: 'Tenant não encontrado' });
  }

  const webhookToken = tenant.asaas_webhook_token || null;
  const apiKey = tenant.asaas_api_key || null;

  return processarWebhook(req, res, webhookToken, apiKey);
});

// POST /api/asaas/webhook — rota legada (usa chave global do .env)
router.post('/asaas/webhook', (req, res) => {
  return processarWebhook(req, res, WEBHOOK_TOKEN_GLOBAL, null);
});

// GET /api/asaas/teste — testa conexão com Asaas
router.get('/asaas/teste', async (req, res) => {
  try {
    const asaasService = require('../services/asaasService');
    const resultado = await asaasService.testarConexao();
    res.status(200).json(resultado);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper para enviar WhatsApp
async function enviarWhatsApp(telefone, mensagem) {
  try {
    if (client && isAuthenticated) {
      const numero = telefone.replace(/\D/g, '');
      const destinatario = numero.startsWith('55') ? numero : `55${numero}`;
      await client.sendMessage(`${destinatario}@c.us`, mensagem);
      console.log('WhatsApp enviado para:', destinatario);
    } else {
      console.log('WhatsApp nao disponivel, mensagem nao enviada:', mensagem);
    }
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error.message);
  }
}

module.exports = router;
