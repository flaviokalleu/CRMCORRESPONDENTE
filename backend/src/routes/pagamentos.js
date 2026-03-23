const express = require('express');
const router = express.Router();
const { User, Cliente, Pagamento } = require('../models');
const { authenticateToken } = require('./authRoutes');
const mercadoPagoService = require('../services/mercadoPagoService');
const pagamentoController = require('../controllers/pagamentoController');
const pagamentoService = require('../services/pagamentoService');

// ✅ CONFIGURAÇÕES DO ENV
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const WHATSAPP_API_URL = `${BACKEND_URL}/api/whatsapp`;

console.log('🔍 Rotas de pagamento carregadas com sucesso');
console.log('🔗 Backend URL:', BACKEND_URL);
console.log('📱 WhatsApp API URL:', WHATSAPP_API_URL);

// ✅ WEBHOOK PÚBLICO - ATUALIZADO COM NOTIFICAÇÕES
router.post('/webhook', async (req, res) => {
  try {
    console.log('🔔 Webhook recebido do Mercado Pago:', JSON.stringify(req.body, null, 2));
    
    const { type, action, data, live_mode } = req.body;
    
    // Validação básica do webhook
    if (!type || !data) {
      console.log('⚠️ Webhook inválido - faltam campos obrigatórios');
      return res.status(400).json({ 
        error: 'Webhook inválido',
        received: req.body 
      });
    }
    
    // Apenas processar webhooks de pagamento
    if (type !== 'payment' || !data?.id) {
      console.log('⚠️ Webhook ignorado - não é de pagamento ou sem ID');
      return res.status(200).json({ 
        received: true, 
        ignored: true,
        reason: 'Não é webhook de pagamento'
      });
    }

    const paymentId = data.id;
    console.log('🔍 Processando pagamento ID:', paymentId, 'Ação:', action);

    // ✅ BUSCAR PAGAMENTO PELA EXTERNAL_REFERENCE
    const pagamentosRecentes = await Pagamento.findAll({
      where: {
        status: 'pendente',
        created_at: {
          [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      order: [['created_at', 'DESC']]
    });

    console.log(`🔍 Encontrados ${pagamentosRecentes.length} pagamentos pendentes nas últimas 24h`);

    // ✅ BUSCAR DETALHES DO PAGAMENTO NO MERCADO PAGO
    let pagamentoMP = null;
    let pagamentoLocal = null;

    try {
      const { MercadoPagoConfig, Payment } = require('mercadopago');
      const client = new MercadoPagoConfig({ accessToken: mercadoPagoService.ACCESS_TOKEN });
      const payment = new Payment(client);
      
      pagamentoMP = await payment.get({ id: paymentId });
      console.log('💳 Detalhes do pagamento MP:', {
        id: pagamentoMP.id,
        status: pagamentoMP.status,
        external_reference: pagamentoMP.external_reference,
        transaction_amount: pagamentoMP.transaction_amount,
        payment_method_id: pagamentoMP.payment_method_id
      });

      // Buscar pagamento local pela external_reference
      if (pagamentoMP.external_reference) {
        const referencePattern = /^(boleto|pix)_(\d+)_(\d+)$/;
        const match = pagamentoMP.external_reference.match(referencePattern);
        
        if (match) {
          const [, tipo, clienteId, timestamp] = match;
          console.log('🔍 Dados da referência:', { tipo, clienteId, timestamp });
          
          const timestampDate = new Date(parseInt(timestamp));
          const tolerancia = 5 * 60 * 1000; // 5 minutos
          
          pagamentoLocal = await Pagamento.findOne({
            where: {
              cliente_id: parseInt(clienteId),
              tipo: tipo,
              status: 'pendente',
              created_at: {
                [require('sequelize').Op.between]: [
                  new Date(timestampDate.getTime() - tolerancia),
                  new Date(timestampDate.getTime() + tolerancia)
                ]
              }
            },
            include: [
              {
                model: Cliente,
                as: 'cliente',
                attributes: ['id', 'nome', 'email', 'telefone', 'cpf']
              },
              {
                model: User,
                as: 'criador',
                attributes: ['id', 'first_name', 'last_name', 'telefone']
              }
            ]
          });
        }
      }

      // Se não encontrou pela external_reference, buscar pelo valor
      if (!pagamentoLocal && pagamentoMP.transaction_amount) {
        console.log('🔍 Buscando por valor:', pagamentoMP.transaction_amount);
        
        pagamentoLocal = pagamentosRecentes.find(p => {
          const valorNumerico = parseFloat(p.valor_numerico);
          const valorMP = parseFloat(pagamentoMP.transaction_amount);
          return Math.abs(valorNumerico - valorMP) < 0.01;
        });

        // Se encontrou, buscar com includes
        if (pagamentoLocal) {
          pagamentoLocal = await Pagamento.findByPk(pagamentoLocal.id, {
            include: [
              {
                model: Cliente,
                as: 'cliente',
                attributes: ['id', 'nome', 'email', 'telefone', 'cpf']
              },
              {
                model: User,
                as: 'criador',
                attributes: ['id', 'first_name', 'last_name', 'telefone']
              }
            ]
          });
        }
      }

    } catch (mpError) {
      console.error('❌ Erro ao buscar pagamento no MP:', mpError);
    }

    if (!pagamentoLocal) {
      console.log('⚠️ Pagamento local não encontrado para ID:', paymentId);
      return res.status(200).json({ 
        received: true, 
        warning: 'Pagamento local não encontrado',
        payment_id: paymentId,
        external_reference: pagamentoMP?.external_reference
      });
    }

    console.log('✅ Pagamento local encontrado:', {
      id: pagamentoLocal.id,
      cliente_id: pagamentoLocal.cliente_id,
      cliente_nome: pagamentoLocal.cliente?.nome,
      valor: pagamentoLocal.valor,
      status_atual: pagamentoLocal.status
    });

    // ✅ MAPEAR STATUS DO MERCADO PAGO
    let novoStatus = 'pendente';
    let dataPagamento = null;

    if (pagamentoMP?.status) {
      switch (pagamentoMP.status) {
        case 'approved':
          novoStatus = 'aprovado';
          dataPagamento = new Date();
          console.log('✅ Pagamento aprovado!');
          break;
        case 'pending':
          novoStatus = 'pendente';
          console.log('⏳ Pagamento pendente');
          break;
        case 'rejected':
          novoStatus = 'rejeitado';
          console.log('❌ Pagamento rejeitado');
          break;
        case 'cancelled':
          novoStatus = 'cancelado';
          console.log('🚫 Pagamento cancelado');
          break;
        case 'refunded':
          novoStatus = 'estornado';
          console.log('↩️ Pagamento estornado');
          break;
        default:
          console.log('❓ Status MP desconhecido:', pagamentoMP.status);
      }
    }

    // ✅ ATUALIZAR PAGAMENTO NO BANCO
    const dadosAtualizacao = {
      status: novoStatus,
      mp_payment_id: paymentId,
      dados_mp: {
        payment_data: pagamentoMP,
        webhook_data: req.body,
        updated_at: new Date().toISOString()
      }
    };

    if (dataPagamento) {
      dadosAtualizacao.data_pagamento = dataPagamento;
    }

    const statusAnterior = pagamentoLocal.status;
    await pagamentoLocal.update(dadosAtualizacao);

    console.log(`✅ Pagamento ${pagamentoLocal.id} atualizado:`, {
      status_anterior: statusAnterior,
      status_novo: novoStatus,
      data_pagamento: dataPagamento,
      mp_payment_id: paymentId
    });

    // ✅ ENVIAR NOTIFICAÇÕES QUANDO PAGAMENTO FOR APROVADO
    if (novoStatus === 'aprovado' && statusAnterior !== 'aprovado') {
      console.log('🎉 =======================================');
      console.log('🎉 PAGAMENTO APROVADO - ENVIANDO NOTIFICAÇÕES');
      console.log('🎉 =======================================');

      // ✅ NOTIFICAR CLIENTE SOBRE PAGAMENTO APROVADO
      if (pagamentoLocal.cliente?.telefone) {
        console.log('📱 Enviando confirmação para cliente...');
        try {
          await notificarClientePagamentoAprovado(pagamentoLocal.cliente, pagamentoLocal, pagamentoMP);
        } catch (clienteError) {
          console.error('❌ Erro ao notificar cliente:', clienteError);
        }
      }

      // ✅ NOTIFICAR ADMINISTRADORES SOBRE PAGAMENTO APROVADO
      console.log('📱 Enviando notificação para administradores...');
      try {
        await notificarAdministradoresPagamentoAprovado(pagamentoLocal, pagamentoMP);
      } catch (adminError) {
        console.error('❌ Erro ao notificar administradores:', adminError);
      }

      // ✅ NOTIFICAR CORRETOR QUE CRIOU O PAGAMENTO (SE DIFERENTE DOS ADMINS)
      if (pagamentoLocal.criador?.telefone && !pagamentoLocal.criador.is_administrador) {
        console.log('📱 Enviando notificação para corretor criador...');
        try {
          await notificarCriadorPagamentoAprovado(pagamentoLocal.criador, pagamentoLocal, pagamentoMP);
        } catch (criadorError) {
          console.error('❌ Erro ao notificar corretor criador:', criadorError);
        }
      }

      console.log('🎉 =======================================');
    }

    res.status(200).json({ 
      received: true,
      processed: true,
      pagamento_id: pagamentoLocal.id,
      status_anterior: statusAnterior,
      status_novo: novoStatus,
      mp_payment_id: paymentId,
      notificacoes_enviadas: novoStatus === 'aprovado',
      message: novoStatus === 'aprovado' ? 'Pagamento aprovado e notificações enviadas!' : 'Webhook processado'
    });

  } catch (error) {
    console.error('❌ Erro crítico ao processar webhook:', error);
    console.error('❌ Stack trace:', error.stack);
    
    res.status(200).json({
      received: true,
      error: 'Erro interno ao processar webhook',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ ROTA DE TESTE PARA SIMULAR WEBHOOK
router.post('/webhook/test', async (req, res) => {
  try {
    console.log('🧪 Simulando webhook de teste...');
    
    // Simular dados de webhook
    const webhookTest = {
      action: "payment.updated",
      api_version: "v1",
      data: { id: "12345" },
      date_created: new Date().toISOString(),
      id: "test-webhook-" + Date.now(),
      live_mode: false,
      type: "payment",
      user_id: 1488073343
    };
    
    // Fazer chamada interna para o webhook
    const response = await fetch(`${BACKEND_URL}/api/pagamentos/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookTest)
    });
    
    const result = await response.json();
    
    res.json({
      message: 'Teste de webhook executado',
      webhook_data: webhookTest,
      webhook_response: result,
      status: response.status
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Erro no teste de webhook',
      details: error.message
    });
  }
});

// ✅ MIDDLEWARE DE AUTENTICAÇÃO (APLICAR APÓS WEBHOOKS PÚBLICOS)
router.use(authenticateToken);

// ✅ FUNÇÃO PARA ENVIAR WHATSAPP VIA BAILEYS
const enviarWhatsAppViaBaileys = async (telefone, mensagem) => {
  try {
    console.log('📱 Enviando WhatsApp via Baileys para:', telefone);
    console.log('🔗 URL do WhatsApp API:', `${WHATSAPP_API_URL}/send-message`);
    
    const response = await fetch(`${WHATSAPP_API_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: telefone,
        message: mensagem
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ WhatsApp enviado via Baileys com sucesso');
      return { success: true, messageId: result.messageId };
    } else {
      console.error('❌ Erro ao enviar WhatsApp via Baileys:', result.message);
      return { success: false, error: result.message };
    }
  } catch (error) {
    console.error('❌ Erro de conexão com Baileys:', error);
    return { success: false, error: error.message };
  }
};

// ✅ FUNÇÃO PARA VERIFICAR STATUS DO WHATSAPP
const verificarStatusWhatsApp = async () => {
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    return result.isAuthenticated || false;
  } catch (error) {
    console.error('❌ Erro ao verificar status do WhatsApp:', error);
    return false;
  }
};

// ✅ FUNÇÃO PARA CRIAR MENSAGEM DE PAGAMENTO
const criarMensagemPagamento = (pagamento, cliente, tipo = 'boleto') => {
  const tipoEmoji = tipo === 'pix' ? '⚡' : '🎫';
  const tipoTexto = tipo === 'pix' ? 'PIX' : 'BOLETO';
  const vencimento = tipo === 'pix' ? '30 minutos' : new Date(pagamento.data_vencimento).toLocaleDateString('pt-BR');
  
  let mensagem = `${tipoEmoji} *${tipoTexto} GERADO*\n\n`;
  mensagem += `👤 *Cliente:* ${cliente.nome}\n`;
  mensagem += `📄 *Descrição:* ${pagamento.titulo}\n`;
  mensagem += `💰 *Valor:* R$ ${pagamento.valor}\n`;
  
  if (tipo === 'boleto' && pagamento.parcelas > 1) {
    mensagem += `📊 *Parcelas:* ${pagamento.parcelas}x de R$ ${pagamento.valor_parcela}\n`;
  }
  
  mensagem += `📅 *Vencimento:* ${vencimento}\n`;
  mensagem += `🆔 *ID:* #${pagamento.id}\n\n`;
  
  if (pagamento.descricao) {
    mensagem += `📋 *Detalhes:* ${pagamento.descricao}\n\n`;
  }
  
  mensagem += `🔗 *Link para pagamento:*\n${pagamento.link_pagamento}\n\n`;
  
  if (tipo === 'pix') {
    mensagem += `⚡ *PIX - Pagamento instantâneo*\n`;
    mensagem += `⏰ _Válido por 30 minutos_\n\n`;
  } else {
    mensagem += `🎫 *BOLETO BANCÁRIO*\n`;
    mensagem += `💳 _Pode ser pago em qualquer banco_\n\n`;
  }
  
  const EMPRESA_NOME = process.env.EMPRESA_NOME || 'Sistema CRM CAIXA';
  mensagem += `_Enviado automaticamente pelo ${EMPRESA_NOME}_`;
  
  return mensagem;
};

// ✅ FUNÇÃO DE FORMATAÇÃO DE TELEFONE (USANDO CONFIGURAÇÕES DO ENV)
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < 10) return null;
  
  let formattedPhone = cleanPhone;
  
  console.log('🔍 Número original limpo:', cleanPhone);
  
  // Puxar código do país do ENV (padrão: 55 para Brasil)
  const COUNTRY_CODE = process.env.WHATSAPP_COUNTRY_CODE || '55';
  
  // Se já tem código do país
  if (formattedPhone.startsWith(COUNTRY_CODE)) {
    // Se tem 13 dígitos (55 + DDD + 9 + 8 dígitos) - REMOVER O 9
    if (formattedPhone.length === 13) {
      const codigoPais = formattedPhone.substring(0, 2);
      const ddd = formattedPhone.substring(2, 4);
      const nono = formattedPhone.substring(4, 5);
      const numero = formattedPhone.substring(5);
      
      // Se o 5º dígito é 9, remover (assumindo que é o 9 adicional)
      if (nono === '9') {
        formattedPhone = `${codigoPais}${ddd}${numero}`;
        console.log('📱 Removido 9 adicional:', formattedPhone);
      }
    }
  } 
  // Se não tem código do país
  else {
    // Se tem 11 dígitos (DDD + 9 + 8 dígitos) - REMOVER O 9 e ADICIONAR CÓDIGO DO PAÍS
    if (formattedPhone.length === 11) {
      const ddd = formattedPhone.substring(0, 2);
      const nono = formattedPhone.substring(2, 3);
      const numero = formattedPhone.substring(3);
      
      // Se o 3º dígito é 9, remover (assumindo que é o 9 adicional)
      if (nono === '9') {
        formattedPhone = `${COUNTRY_CODE}${ddd}${numero}`;
        console.log(`📱 Removido 9 e adicionado ${COUNTRY_CODE}:`, formattedPhone);
      } else {
        // Se não tem 9, apenas adicionar código do país
        formattedPhone = `${COUNTRY_CODE}${formattedPhone}`;
        console.log(`📱 Adicionado apenas ${COUNTRY_CODE}:`, formattedPhone);
      }
    }
    // Se tem 10 dígitos (DDD + 8 dígitos) - ADICIONAR APENAS CÓDIGO DO PAÍS
    else if (formattedPhone.length === 10) {
      formattedPhone = `${COUNTRY_CODE}${formattedPhone}`;
      console.log(`📱 Adicionado ${COUNTRY_CODE} a número de 10 dígitos:`, formattedPhone);
    }
  }
  
  // Validar se o número final tem o tamanho correto (12 dígitos para Brasil)
  const EXPECTED_LENGTH = parseInt(process.env.WHATSAPP_PHONE_LENGTH || '12');
  if (formattedPhone.length !== EXPECTED_LENGTH) {
    console.log(`❌ Número inválido após formatação (deve ter ${EXPECTED_LENGTH} dígitos):`, formattedPhone);
    return null;
  }
  
  console.log('✅ Número formatado final:', formattedPhone);
  
  return formattedPhone;
};

// Função para formatar valor monetário
const formatarValorMonetario = (valor) => {
  if (!valor) return '0,00';
  
  const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
  if (isNaN(numero)) return '0,00';
  
  const CURRENCY_LOCALE = process.env.CURRENCY_LOCALE || 'pt-BR';
  
  return numero.toLocaleString(CURRENCY_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Função para converter valor formatado para número
const converterValorParaNumero = (valorFormatado) => {
  if (!valorFormatado) return 0;
  
  // Suporte para diferentes formatos de moeda baseado no ENV
  const DECIMAL_SEPARATOR = process.env.DECIMAL_SEPARATOR || ',',
        THOUSAND_SEPARATOR = process.env.THOUSAND_SEPARATOR || '.';
  
  let valorLimpo = valorFormatado.toString();
  
  // Remove separadores de milhares
  valorLimpo = valorLimpo.replace(new RegExp(`\\${THOUSAND_SEPARATOR}`, 'g'), '');
  
  // Substitui separador decimal por ponto
  if (DECIMAL_SEPARATOR !== '.') {
    valorLimpo = valorLimpo.replace(DECIMAL_SEPARATOR, '.');
  }
  
  return parseFloat(valorLimpo) || 0;
};

// ✅ CRIAR BOLETO COM ENVIO AUTOMÁTICO VIA BAILEYS
router.post('/boleto', async (req, res) => {
  try {
    const { 
      cliente_id, 
      titulo, 
      descricao, 
      valor, 
      data_vencimento, 
      observacoes,
      parcelas = 1,
      enviar_whatsapp = true, // ✅ PADRÃO VERDADEIRO
      enviar_email = true     // ✅ PADRÃO VERDADEIRO
    } = req.body;
    
    console.log('🎫 Criando boleto com envio automático:', {
      cliente_id,
      titulo,
      valor,
      enviar_whatsapp,
      enviar_email
    });

    // ✅ VALIDAÇÕES APRIMORADAS
    if (!cliente_id || !titulo || valor === undefined || valor === null) {
      return res.status(400).json({
        error: 'Campos obrigatórios: cliente_id, titulo e valor',
        recebido: { cliente_id, titulo, valor }
      });
    }

    // Validar se cliente_id é um número válido
    const clienteIdNum = parseInt(cliente_id);
    if (isNaN(clienteIdNum)) {
      return res.status(400).json({
        error: 'ID do cliente deve ser um número válido'
      });
    }

    // Validar parcelas
    const MAX_PARCELAS = parseInt(process.env.MAX_PARCELAS || '12');
    const parcelasNum = parseInt(parcelas);
    if (isNaN(parcelasNum) || parcelasNum < 1 || parcelasNum > MAX_PARCELAS) {
      return res.status(400).json({
        error: `Número de parcelas deve ser entre 1 e ${MAX_PARCELAS}`,
        recebido: parcelas
      });
    }

    // Buscar usuário atual
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }

    // Buscar cliente
    const cliente = await Cliente.findByPk(clienteIdNum);
    if (!cliente) {
      return res.status(404).json({ 
        error: 'Cliente não encontrado',
        cliente_id: clienteIdNum
      });
    }

    // ✅ PROCESSAR VALOR CORRETAMENTE
    let valorNumerico = 0;
    
    if (typeof valor === 'number') {
      valorNumerico = valor;
    } else if (typeof valor === 'string') {
      const valorLimpo = valor.replace(/[^\d,.-]/g, '');
      
      if (valorLimpo.includes(',')) {
        valorNumerico = parseFloat(valorLimpo.replace(/\./g, '').replace(',', '.'));
      } else {
        valorNumerico = parseFloat(valorLimpo);
      }
    }

    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      return res.status(400).json({
        error: 'Valor deve ser um número válido maior que zero',
        valor_recebido: valor,
        valor_processado: valorNumerico
      });
    }

    const valorFormatado = formatarValorMonetario(valorNumerico);
    const valorParcelaNumerica = parcelas > 1 ? (valorNumerico / parcelas) : valorNumerico;
    const valorParcelaFormatada = formatarValorMonetario(valorParcelaNumerica);

    // ✅ PROCESSAR DATA DE VENCIMENTO
    let dataVencimento;
    if (data_vencimento) {
      dataVencimento = new Date(data_vencimento);
      dataVencimento.setHours(23, 59, 59, 999);
    } else {
      const DEFAULT_DAYS_TO_EXPIRE = parseInt(process.env.BOLETO_DAYS_TO_EXPIRE || '7');
      dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + DEFAULT_DAYS_TO_EXPIRE);
      dataVencimento.setHours(23, 59, 59, 999);
    }

    // ✅ CRIAR REGISTRO DE PAGAMENTO
    const pagamento = await Pagamento.create({
      cliente_id: clienteIdNum,
      created_by: user.id,
      tipo: 'boleto',
      status: 'pendente',
      titulo: titulo.trim(),
      descricao: descricao ? descricao.trim() : '',
      valor: valorFormatado,
      valor_numerico: valorNumerico,
      parcelas: parseInt(parcelas),
      valor_parcela: valorParcelaFormatada,
      valor_parcela_numerico: valorParcelaNumerica,
      data_vencimento: dataVencimento,
      observacoes: observacoes ? observacoes.trim() : '',
      whatsapp_enviado: false,
      email_enviado: false
    });

    // Criar preferência no Mercado Pago
    try {
      const preferenciaMP = await mercadoPagoService.criarPreferenciaBoleto({
        cliente_id: clienteIdNum,
        cliente,
        titulo: titulo.trim(),
        descricao: descricao ? descricao.trim() : '',
        valor_numerico: valorNumerico,
        parcelas: parseInt(parcelas),
        data_vencimento: dataVencimento.toISOString()
      });

      // Atualizar pagamento com dados do MP
      await pagamento.update({
        mp_preference_id: preferenciaMP.id,
        link_pagamento: preferenciaMP.init_point,
        dados_mp: preferenciaMP
      });

      console.log('✅ Mercado Pago configurado:', preferenciaMP.id);

      // ✅ ENVIO AUTOMÁTICO PARA O CLIENTE
      const resultadosEnvio = {
        whatsapp: null,
        email: null
      };

      // 📱 ENVIAR WHATSAPP AUTOMATICAMENTE PARA O CLIENTE
      if (enviar_whatsapp) {
        console.log('📱 Enviando boleto via WhatsApp para cliente...');
        const resultadoWhatsApp = await enviarWhatsAppParaCliente(cliente, pagamento, 'boleto');
        
        if (resultadoWhatsApp.success) {
          await pagamento.update({
            whatsapp_enviado: true,
            data_envio_whatsapp: new Date()
          });
        }
        
        resultadosEnvio.whatsapp = resultadoWhatsApp;
      }

      // 📧 ENVIAR EMAIL AUTOMATICAMENTE PARA O CLIENTE
      if (enviar_email) {
        console.log('📧 Enviando boleto via Email para cliente...');
        const resultadoEmail = await enviarEmailParaCliente(cliente, pagamento, 'boleto');
        
        if (resultadoEmail.success) {
          await pagamento.update({
            email_enviado: true,
            data_envio_email: new Date()
          });
        }
        
        resultadosEnvio.email = resultadoEmail;
      }

      // Recarregar pagamento com dados atualizados
      const pagamentoAtualizado = await Pagamento.findByPk(pagamento.id, {
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'nome', 'email', 'telefone', 'cpf']
          }
        ]
      });

      // ✅ RESPOSTA COM RESULTADOS DE ENVIO
      res.status(201).json({
        success: true,
        message: 'Boleto criado e enviado com sucesso!',
        pagamento: pagamentoAtualizado,
        mercado_pago: {
          preference_id: preferenciaMP.id,
          init_point: preferenciaMP.init_point
        },
        envios: resultadosEnvio,
        enviado_automaticamente: {
          whatsapp: enviar_whatsapp && resultadosEnvio.whatsapp?.success,
          email: enviar_email && resultadosEnvio.email?.success
        }
      });

    } catch (mpError) {
      console.error('❌ Erro no Mercado Pago:', mpError);
      
      await pagamento.update({ 
        status: 'erro',
        observacoes: `${observacoes || ''}\n\nErro Mercado Pago: ${mpError.message}`
      });

      res.status(500).json({
        success: false,
        error: 'Erro ao criar boleto no Mercado Pago',
        details: mpError.message,
        pagamento_id: pagamento.id
      });
    }

  } catch (error) {
    console.error('❌ Erro geral ao criar boleto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// ✅ CRIAR PIX COM ENVIO AUTOMÁTICO VIA BAILEYS
router.post('/pix', async (req, res) => {
  try {
    const { 
      cliente_id, 
      titulo, 
      descricao, 
      valor, 
      observacoes,
      enviar_whatsapp = true, // ✅ PADRÃO VERDADEIRO
      enviar_email = true     // ✅ PADRÃO VERDADEIRO
    } = req.body;
    
    console.log('💳 Criando PIX com envio automático:', {
      cliente_id,
      titulo,
      valor,
      enviar_whatsapp,
      enviar_email
    });

    // ✅ VALIDAÇÕES APRIMORADAS
    if (!cliente_id || !titulo || valor === undefined || valor === null) {
      return res.status(400).json({
        error: 'Campos obrigatórios: cliente_id, titulo e valor',
        recebido: { cliente_id, titulo, valor }
      });
    }

    // Validar se cliente_id é um número válido
    const clienteIdNum = parseInt(cliente_id);
    if (isNaN(clienteIdNum)) {
      return res.status(400).json({
        error: 'ID do cliente deve ser um número válido'
      });
    }

    // Buscar usuário atual
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }

    // Buscar cliente
    const cliente = await Cliente.findByPk(clienteIdNum);
    if (!cliente) {
      return res.status(404).json({ 
        error: 'Cliente não encontrado',
        cliente_id: clienteIdNum
      });
    }

    // ✅ PROCESSAR VALOR CORRETAMENTE (mesmo método do boleto)
    let valorNumerico = 0;
    
    console.log('💰 Processando valor PIX:', { valor, tipo: typeof valor });
    
    if (typeof valor === 'number') {
      valorNumerico = valor;
    } else if (typeof valor === 'string') {
      const valorLimpo = valor.replace(/[^\d,.-]/g, '');
      
      if (valorLimpo.includes(',')) {
        valorNumerico = parseFloat(valorLimpo.replace(/\./g, '').replace(',', '.'));
      } else {
        valorNumerico = parseFloat(valorLimpo);
      }
    }

    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      return res.status(400).json({
        error: 'Valor deve ser um número válido maior que zero',
        valor_recebido: valor,
        valor_processado: valorNumerico
      });
    }

    const valorFormatado = formatarValorMonetario(valorNumerico);

    // PIX expira em 30 minutos
    const PIX_EXPIRE_MINUTES = parseInt(process.env.PIX_EXPIRE_MINUTES || '30');
    const dataVencimento = new Date(Date.now() + PIX_EXPIRE_MINUTES * 60 * 1000);

    // Criar registro de pagamento
    const pagamento = await Pagamento.create({
      cliente_id: clienteIdNum,
      created_by: user.id,
      tipo: 'pix',
      status: 'pendente',
      titulo: titulo.trim(),
      descricao: descricao ? descricao.trim() : '',
      valor: valorFormatado,
      valor_numerico: valorNumerico,
      parcelas: 1,
      valor_parcela: valorFormatado,
      valor_parcela_numerico: valorNumerico,
      data_vencimento: dataVencimento,
      observacoes: observacoes ? observacoes.trim() : '',
      whatsapp_enviado: false,
      email_enviado: false
    });

    // Criar preferência no Mercado Pago
    try {
      const preferenciaMP = await mercadoPagoService.criarPreferenciaPix({
        cliente_id: clienteIdNum,
        cliente,
        titulo: titulo.trim(),
        descricao: descricao ? descricao.trim() : '',
        valor_numerico: valorNumerico
      });

      // Atualizar pagamento com dados do MP
      await pagamento.update({
        mp_preference_id: preferenciaMP.id,
        link_pagamento: preferenciaMP.init_point,
        dados_mp: preferenciaMP
      });

      console.log('✅ Mercado Pago PIX configurado:', preferenciaMP.id);

      // ✅ ENVIO AUTOMÁTICO PARA O CLIENTE
      const resultadosEnvio = {
        whatsapp: null,
        email: null
      };

      // 📱 ENVIAR WHATSAPP AUTOMATICAMENTE PARA O CLIENTE
      if (enviar_whatsapp) {
        console.log('📱 Enviando PIX via WhatsApp para cliente...');
        const resultadoWhatsApp = await enviarWhatsAppParaCliente(cliente, pagamento, 'pix');
        
        if (resultadoWhatsApp.success) {
          await pagamento.update({
            whatsapp_enviado: true,
            data_envio_whatsapp: new Date()
          });
        }
        
        resultadosEnvio.whatsapp = resultadoWhatsApp;
      }

      // 📧 ENVIAR EMAIL AUTOMATICAMENTE PARA O CLIENTE
      if (enviar_email) {
        console.log('📧 Enviando PIX via Email para cliente...');
        const resultadoEmail = await enviarEmailParaCliente(cliente, pagamento, 'pix');
        
        if (resultadoEmail.success) {
          await pagamento.update({
            email_enviado: true,
            data_envio_email: new Date()
          });
        }
        
        resultadosEnvio.email = resultadoEmail;
      }

      // Recarregar pagamento com dados atualizados
      const pagamentoAtualizado = await Pagamento.findByPk(pagamento.id, {
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'nome', 'email', 'telefone', 'cpf']
          }
        ]
      });

      // ✅ RESPOSTA COM RESULTADOS DE ENVIO
      res.status(201).json({
        success: true,
        message: 'PIX criado e enviado com sucesso!',
        pagamento: pagamentoAtualizado,
        mercado_pago: {
          preference_id: preferenciaMP.id,
          init_point: preferenciaMP.init_point
        },
        envios: resultadosEnvio,
        enviado_automaticamente: {
          whatsapp: enviar_whatsapp && resultadosEnvio.whatsapp?.success,
          email: enviar_email && resultadosEnvio.email?.success
        },
        expira_em_minutos: PIX_EXPIRE_MINUTES
      });

    } catch (mpError) {
      console.error('❌ Erro no Mercado Pago PIX:', mpError);
      
      await pagamento.update({ 
        status: 'erro',
        observacoes: `${observacoes || ''}\n\nErro Mercado Pago: ${mpError.message}`
      });

      res.status(500).json({
        success: false,
        error: 'Erro ao criar PIX no Mercado Pago',
        details: mpError.message,
        pagamento_id: pagamento.id
      });
    }

  } catch (error) {
    console.error('❌ Erro geral ao criar PIX:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// ✅ NOVA ROTA UNIVERSAL
router.post('/universal', async (req, res) => {
  try {
    const { 
      cliente_id, 
      titulo, 
      descricao, 
      valor, 
      data_vencimento, 
      observacoes,
      enviar_whatsapp = true,
      enviar_email = true
    } = req.body;
    
    console.log('🌐 Criando pagamento universal:', {
      cliente_id,
      titulo,
      valor
    });

    // Validações
    if (!cliente_id || !titulo || valor === undefined || valor === null) {
      return res.status(400).json({
        error: 'Campos obrigatórios: cliente_id, titulo e valor'
      });
    }

    const clienteIdNum = parseInt(cliente_id);
    if (isNaN(clienteIdNum)) {
      return res.status(400).json({
        error: 'ID do cliente deve ser um número válido'
      });
    }

    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }

    const cliente = await Cliente.findByPk(clienteIdNum);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Processar valor
    let valorNumerico = typeof valor === 'number' ? valor : parseFloat(valor) || 0;

    if (valorNumerico <= 0) {
      return res.status(400).json({
        error: 'Valor deve ser maior que zero'
      });
    }

    // Gerar link único
    const linkUnico = gerarLinkUnico();
    
    const pagamento = await Pagamento.create({
      cliente_id: clienteIdNum,
      created_by: user.id,
      tipo: 'universal',
      status: 'pendente',
      titulo: titulo.trim(),
      descricao: descricao ? descricao.trim() : '',
      valor: formatarValorMonetario(valorNumerico),
      valor_numerico: valorNumerico,
      parcelas: 1,
      valor_parcela: formatarValorMonetario(valorNumerico),
      valor_parcela_numerico: valorNumerico,
      is_parcelado: false,
      parcela_atual: 1,
      link_unico: linkUnico,
      data_vencimento: data_vencimento ? new Date(data_vencimento) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      observacoes: observacoes ? observacoes.trim() : '',
      whatsapp_enviado: false,
      email_enviado: false,
      calculo_mp: false
    });

    // ✅ CRIAR PREFERÊNCIA UNIVERSAL NO MERCADO PAGO
    const preferenciaMP = await mercadoPagoService.criarPreferenciaUniversal({
      cliente,
      titulo: titulo.trim(),
      descricao: descricao ? descricao.trim() : '',
      valor_numerico: valorNumerico,
      data_vencimento: data_vencimento,
      link_unico: linkUnico
    });

    // Atualizar pagamento com dados do MP
    await pagamento.update({
      mp_preference_id: preferenciaMP.id,
      link_pagamento: preferenciaMP.init_point,
      dados_mp: preferenciaMP
    });

    console.log('✅ Pagamento universal criado com sucesso!');

    // ✅ ENVIO AUTOMÁTICO
    const resultadosEnvio = {
      whatsapp: null,
      email: null
    };

    if (enviar_whatsapp) {
      console.log('📱 Enviando via WhatsApp...');
      const resultadoWhatsApp = await enviarWhatsAppParaCliente(cliente, pagamento, 'universal');
      
      if (resultadoWhatsApp.success) {
        await pagamento.update({
          whatsapp_enviado: true,
          data_envio_whatsapp: new Date()
        });
      }
      
      resultadosEnvio.whatsapp = resultadoWhatsApp;
    }

    if (enviar_email) {
      console.log('📧 Enviando via Email...');
      const resultadoEmail = await enviarEmailParaCliente(cliente, pagamento, 'universal');
      
      if (resultadoEmail.success) {
        await pagamento.update({
          email_enviado: true,
          data_envio_email: new Date()
        });
      }
      
      resultadosEnvio.email = resultadoEmail;
    }

    res.status(201).json({
      success: true,
      message: 'Pagamento universal criado com sucesso!',
      pagamento: pagamento,
      mercado_pago: {
        preference_id: preferenciaMP.id,
        init_point: preferenciaMP.init_point
      },
      envios: resultadosEnvio
    });

  } catch (error) {
    console.error('❌ Erro ao criar pagamento universal:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// ✅ FUNÇÃO PARA ENVIAR WHATSAPP DIRETAMENTE PARA O CLIENTE
const enviarWhatsAppParaCliente = async (cliente, pagamento, tipo = 'boleto') => {
  try {
    if (!cliente.telefone) {
      console.log('⚠️ Cliente não possui telefone cadastrado');
      return { success: false, error: 'Cliente não possui telefone cadastrado' };
    }

    console.log('📱 Enviando pagamento via WhatsApp para cliente:', cliente.nome);

    // Fazer chamada para a API do WhatsApp do sistema
    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/api/whatsapp/enviar-pagamento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        telefone: cliente.telefone,
        clienteNome: cliente.nome,
        pagamento: {
          id: pagamento.id,
          tipo: pagamento.tipo,
          titulo: pagamento.titulo,
          descricao: pagamento.descricao,
          valor: pagamento.valor,
          parcelas: pagamento.parcelas,
          valor_parcela: pagamento.valor_parcela,
          data_vencimento: pagamento.data_vencimento,
          link_pagamento: pagamento.link_pagamento,
          created_at: pagamento.created_at
        }
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ WhatsApp enviado com sucesso para cliente');
      return { 
        success: true, 
        messageId: result.messageId,
        telefone: cliente.telefone
      };
    } else {
      console.error('❌ Erro ao enviar WhatsApp para cliente:', result.error);
      return { 
        success: false, 
        error: result.error || 'Erro desconhecido ao enviar WhatsApp'
      };
    }

  } catch (error) {
    console.error('❌ Erro de conexão ao enviar WhatsApp para cliente:', error);
    return { 
      success: false, 
      error: `Erro de conexão: ${error.message}`
    };
  }
};

// ✅ FUNÇÃO PARA ENVIAR EMAIL DIRETAMENTE PARA O CLIENTE
const enviarEmailParaCliente = async (cliente, pagamento, tipo = 'boleto') => {
  try {
    if (!cliente.email) {
      console.log('⚠️ Cliente não possui email cadastrado');
      return { success: false, error: 'Cliente não possui email cadastrado' };
    }

    console.log('📧 Enviando pagamento via Email para cliente:', cliente.email);

    // Implementar envio de email aqui
    // Por enquanto, vamos simular o envio
    return {
      success: true,
      message: 'Email enviado com sucesso (simulado)',
      email: cliente.email,
      pagamento_id: pagamento.id
    };

  } catch (error) {
    console.error('❌ Erro ao enviar email para cliente:', error);
    return { 
      success: false, 
      error: error.message
    };
  }
};

// ✅ REENVIAR WHATSAPP USANDO BAILEYS
router.post('/:id/enviar-whatsapp', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }

    // Verificar se é admin
    if (!user.is_administrador) {
      return res.status(403).json({ error: 'Apenas administradores podem enviar pagamentos' });
    }

    const pagamento = await Pagamento.findByPk(id, {
      include: [{ model: Cliente, as: 'cliente' }]
    });

    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    if (!pagamento.cliente.telefone) {
      return res.status(400).json({ error: 'Cliente não possui telefone cadastrado' });
    }

    // ✅ VERIFICAR STATUS DO WHATSAPP ANTES DE ENVIAR
    const whatsappConectado = await verificarStatusWhatsApp();
    
    if (!whatsappConectado) {
      return res.status(400).json({ 
        error: 'WhatsApp não está conectado. Conecte primeiro usando o QR Code.',
        whatsapp_status: false
      });
    }

    // ✅ USAR BAILEYS PARA REENVIO
    try {
      const telefoneFormatado = formatPhoneNumber(pagamento.cliente.telefone);
      
      if (!telefoneFormatado) {
        return res.status(400).json({ 
          error: 'Número de telefone inválido',
          telefone_original: pagamento.cliente.telefone
        });
      }

      const mensagem = criarMensagemPagamento(pagamento, pagamento.cliente, pagamento.tipo);
      const resultado = await enviarWhatsAppViaBaileys(telefoneFormatado, mensagem);
      
      if (resultado.success) {
        await pagamento.update({
          whatsapp_enviado: true,
          data_envio_whatsapp: new Date()
        });
      }

      res.json({
        message: resultado.success ? 'WhatsApp reenviado com sucesso via Baileys!' : 'Erro ao reenviar WhatsApp',
        resultado,
        telefone_formatado: telefoneFormatado,
        telefone_original: pagamento.cliente.telefone,
        whatsapp_status: true
      });

    } catch (whatsappError) {
      console.error('❌ Erro ao reenviar WhatsApp via Baileys:', whatsappError);
      res.status(500).json({
        error: 'Erro ao reenviar WhatsApp via Baileys',
        details: whatsappError.message
      });
    }

  } catch (error) {
    console.error('❌ Erro ao reenviar WhatsApp:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// ✅ ENVIAR PAGAMENTO POR EMAIL (ROTA SEPARADA)
router.post('/:id/enviar-email', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }

    // Verificar se é admin
    if (!user.is_administrador) {
      return res.status(403).json({ error: 'Apenas administradores podem enviar pagamentos' });
    }

    const pagamento = await Pagamento.findByPk(id, {
      include: [{ model: Cliente, as: 'cliente' }]
    });

    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    if (!pagamento.cliente.email) {
      return res.status(400).json({ error: 'Cliente não possui email cadastrado' });
    }

    const resultado = await mercadoPagoService.enviarEmail(pagamento, pagamento.cliente);

    res.json({
      message: resultado.success ? 'Email enviado com sucesso!' : 'Erro ao enviar email',
      resultado
    });

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// ✅ ROTA PÚBLICA PARA ACESSAR PAGAMENTO (SEM AUTENTICAÇÃO)
router.get('/publico/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const pagamento = await Pagamento.findByPk(id, {
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'email'] // Dados limitados por segurança
        }
      ]
    });

    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    // Retornar apenas dados necessários para o cliente
    res.json({
      pagamento: {
        id: pagamento.id,
        titulo: pagamento.titulo,
        descricao: pagamento.descricao,
        valor: pagamento.valor,
        parcelas: pagamento.parcelas,
        valor_parcela: pagamento.valor_parcela,
        tipo: pagamento.tipo,
        status: pagamento.status,
        data_vencimento: pagamento.data_vencimento,
        link_pagamento: pagamento.link_pagamento,
        created_at: pagamento.created_at,
        cliente: {
          nome: pagamento.cliente.nome
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar pagamento público:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

// ✅ LISTAR PAGAMENTOS COM URL DO COMPROVANTE
router.get('/', async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }

    let whereClause = {};
    
    // Se não é administrador, só mostra seus próprios pagamentos
    if (!user.is_administrador) {
      whereClause.created_by = user.id;
    }

    const { page = 1, limit = 50, status, tipo, cliente_id } = req.query;
    
    // Filtros adicionais
    if (status && status !== 'todos') {
      whereClause.status = status;
    }
    
    if (tipo && tipo !== 'todos') {
      whereClause.tipo = tipo;
    }
    
    if (cliente_id) {
      whereClause.cliente_id = parseInt(cliente_id);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Pagamento.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'email', 'telefone', 'cpf']
        },
        {
          model: User,
          as: 'criador',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
      // ✅ INCLUIR CAMPO COMPROVANTE_URL
      attributes: [
        'id', 'cliente_id', 'created_by', 'tipo', 'status', 'titulo', 'descricao',
        'valor', 'valor_numerico', 'valor_original', 'valor_original_numerico',
        'parcelas', 'valor_parcela', 'valor_parcela_numerico', 
        'juros_total', 'juros_total_numerico', 'taxa_juros', 'calculo_mp',
        'data_vencimento', 'data_pagamento', 'observacoes',
        'mp_preference_id', 'mp_payment_id', 'link_pagamento',
        'comprovante_url', // ✅ INCLUIR URL DO COMPROVANTE
        'whatsapp_enviado', 'email_enviado', 'data_envio_whatsapp', 'data_envio_email',
        'dados_mp', 'created_at', 'updated_at'
      ]
    });

    // ✅ PROCESSAR DADOS PARA INCLUIR STATUS DO COMPROVANTE
    const pagamentosProcessados = rows.map(pagamento => {
      const pagamentoJson = pagamento.toJSON();
      
      // Adicionar informações sobre comprovante
      pagamentoJson.tem_comprovante = !!pagamentoJson.comprovante_url;
      pagamentoJson.pode_obter_comprovante = pagamentoJson.status === 'aprovado' && !!pagamentoJson.mp_payment_id;
      
      return pagamentoJson;
    });

    res.json({
      success: true,
      pagamentos: pagamentosProcessados,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      },
      filtros_aplicados: {
        status: status || 'todos',
        tipo: tipo || 'todos',
        cliente_id: cliente_id || null,
        usuario_limitado: !user.is_administrador
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar pagamentos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// ✅ BUSCAR PAGAMENTO POR ID COM COMPROVANTE
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }

    let whereClause = { id: parseInt(id) };
    
    // Se não é administrador, só pode ver seus próprios pagamentos
    if (!user.is_administrador) {
      whereClause.created_by = user.id;
    }

    const pagamento = await Pagamento.findOne({
      where: whereClause,
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'email', 'telefone', 'cpf']
        },
        {
          model: User,
          as: 'criador',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!pagamento) {
      return res.status(404).json({ 
        error: 'Pagamento não encontrado',
        id: parseInt(id)
      });
    }

    // ✅ PROCESSAR DADOS DO PAGAMENTO
    const pagamentoJson = pagamento.toJSON();
    
    // Adicionar informações sobre comprovante
    pagamentoJson.tem_comprovante = !!pagamentoJson.comprovante_url;
    pagamentoJson.pode_obter_comprovante = pagamentoJson.status === 'aprovado' && !!pagamentoJson.mp_payment_id;
    
    // Se não tem comprovante mas pode obter, tentar buscar
    if (!pagamentoJson.tem_comprovante && pagamentoJson.pode_obter_comprovante) {
      try {
        const { MercadoPagoConfig, Payment } = require('mercadopago');
        const client = new MercadoPagoConfig({ accessToken: mercadoPagoService.ACCESS_TOKEN });
        const payment = new Payment(client);
        
        const paymentData = await payment.get({ id: pagamento.mp_payment_id });
        
        if (paymentData.transaction_details?.receipt_url) {
          // Atualizar pagamento com URL do comprovante
          await pagamento.update({
            comprovante_url: paymentData.transaction_details.receipt_url
          });
          
          pagamentoJson.comprovante_url = paymentData.transaction_details.receipt_url;
          pagamentoJson.tem_comprovante = true;
          
          console.log('✅ URL do comprovante obtida e salva:', paymentData.transaction_details.receipt_url);
        }
      } catch (mpError) {
        console.error('❌ Erro ao obter comprovante do MP:', mpError);
      }
    }

    res.json({
      success: true,
      pagamento: pagamentoJson
    });

  } catch (error) {
    console.error('❌ Erro ao buscar pagamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// ✅ DELETAR PAGAMENTO
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }

    // Verificar se é admin
    if (!user.is_administrador) {
      return res.status(403).json({ error: 'Apenas administradores podem deletar pagamentos' });
    }

    // Buscar pagamento
    const pagamento = await Pagamento.findByPk(id);
    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    // Verificar se o pagamento pode ser deletado (apenas pendentes)
    if (pagamento.status === 'aprovado') {
      return res.status(400).json({ error: 'Não é possível deletar pagamentos aprovados' });
    }

    // Deletar pagamento
    await pagamento.destroy();

    console.log('✅ Pagamento deletado:', id);

    res.json({
      message: 'Pagamento deletado com sucesso',
      pagamento_id: id
    });

  } catch (error) {
    console.error('❌ Erro ao deletar pagamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// ✅ ATUALIZAR PAGAMENTO
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      titulo, 
      descricao, 
      valor, 
      data_vencimento, 
      observacoes,
      parcelas = 1
    } = req.body;
    
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(403).json({ error: 'Usuário não autorizado' });
    }

    // Verificar se é admin
    if (!user.is_administrador) {
      return res.status(403).json({ error: 'Apenas administradores podem editar pagamentos' });
    }

    // Buscar pagamento
    const pagamento = await Pagamento.findByPk(id);
    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    // Verificar se o pagamento pode ser editado (apenas pendentes)
    if (pagamento.status !== 'pendente') {
      return res.status(400).json({ error: 'Apenas pagamentos pendentes podem ser editados' });
    }

    // Processar valor se fornecido
    let valorNumerico = pagamento.valor_numerico;
    let valorFormatado = pagamento.valor;
    let valorParcelaNumerica = pagamento.valor_parcela_numerico;
    let valorParcelaFormatada = pagamento.valor_parcela;

    if (valor) {
      valorNumerico = typeof valor === 'number' ? valor : parseFloat(valor) || 0;
      valorFormatado = formatarValorMonetario(valorNumerico);
      valorParcelaNumerica = parcelas > 1 ? (valorNumerico / parcelas) : valorNumerico;
      valorParcelaFormatada = formatarValorMonetario(valorParcelaNumerica);
    }

    // Atualizar pagamento
    await pagamento.update({
      titulo: titulo || pagamento.titulo,
      descricao: descricao !== undefined ? descricao : pagamento.descricao,
      valor: valorFormatado,
      valor_numerico: valorNumerico,
      parcelas: parseInt(parcelas),
      valor_parcela: valorParcelaFormatada,
      valor_parcela_numerico: valorParcelaNumerica,
      data_vencimento: data_vencimento ? new Date(data_vencimento) : pagamento.data_vencimento,
      observacoes: observacoes !== undefined ? observacoes : pagamento.observacoes
    });

    console.log('✅ Pagamento atualizado:', id);

    // Retornar pagamento atualizado
    const pagamentoAtualizado = await Pagamento.findByPk(id, {
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'email', 'telefone', 'cpf']
        }
      ]
    });

    res.json({
      message: 'Pagamento atualizado com sucesso',
      pagamento: pagamentoAtualizado
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar pagamento:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// ✅ ROTA PARA VERIFICAR STATUS DO WHATSAPP
router.get('/whatsapp/status', pagamentoController.getWhatsAppStatus);

// ✅ ROTA PARA OBTER CONFIGURAÇÕES DO SISTEMA
router.get('/config', pagamentoController.getConfig);

// ✅ ROTA PARA OBTER CONFIGURAÇÕES PÚBLICAS DO MERCADO PAGO
router.get('/mercadopago/config', pagamentoController.getMercadoPagoConfig);

// ✅ ROTA PARA TESTAR CONEXÃO COM MERCADO PAGO
router.get('/mercadopago/test', pagamentoController.testMercadoPago);

// ✅ ROTA PARA VERIFICAR STATUS DE PAGAMENTOS PENDENTES
router.post('/verificar-status', async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user || !user.is_administrador) {
      return res.status(403).json({ error: 'Apenas administradores podem verificar status' });
    }

    // Buscar pagamentos pendentes com MP preference ID
    const pagamentosPendentes = await Pagamento.findAll({
      where: {
        status: 'pendente',
        mp_preference_id: {
          [require('sequelize').Op.ne]: null
        }
      },
      include: [{
        model: Cliente,
        as: 'cliente',
        attributes: ['id', 'nome']
      }]
    });

    // Aqui você pode adicionar a lógica para verificar o status dos pagamentos pendentes
    // Por exemplo, iterar sobre pagamentosPendentes e consultar o status no Mercado Pago

    res.json({
      success: true,
      message: 'Verificação de status de pagamentos pendentes executada (implemente a lógica conforme necessário)',
      total_pendentes: pagamentosPendentes.length
    });

  } catch (error) {
    console.error('❌ Erro ao verificar status de pagamentos pendentes:', error);
    res.status(500).json({
      error: 'Erro ao verificar status de pagamentos pendentes',
      details: error.message
    });
  }
});

// ✅ FUNÇÃO PARA NOTIFICAR CORRETOR QUE CRIOU O PAGAMENTO
const notificarCriadorPagamentoAprovado = async (criador, pagamento, pagamentoMP) => {
  try {
    if (!criador.telefone) {
      console.log('⚠️ Corretor criador não possui telefone');
      return { success: false, error: 'Corretor sem telefone' };
    }

    console.log('📱 Enviando notificação para corretor criador:', `${criador.first_name} ${criador.last_name}`);

    const tipoEmoji = pagamento.tipo === 'pix' ? '⚡' : '🎫';
    const metodoPagamento = pagamentoMP?.payment_method_id || pagamento.tipo.toUpperCase();

    let mensagem = `${tipoEmoji} *SEU PAGAMENTO FOI APROVADO!*\n\n`;
    mensagem += `🎉 *Parabéns ${criador.first_name}!*\n\n`;
    mensagem += `O pagamento que você criou foi aprovado:\n\n`;
    mensagem += `👤 *Cliente:* ${pagamento.cliente.nome}\n`;
    mensagem += `📄 *Descrição:* ${pagamento.titulo}\n`;
    mensagem += `💰 *Valor:* R$ ${pagamento.valor}\n`;
    mensagem += `💳 *Método:* ${metodoPagamento}\n`;
    mensagem += `🆔 *ID:* #${pagamento.id}\n`;
    mensagem += `📅 *Data:* ${new Date().toLocaleString('pt-BR')}\n\n`;
    
    if (pagamento.descricao) {
      mensagem += `📋 *Detalhes:* ${pagamento.descricao}\n\n`;
    }
    
    mensagem += `✅ *Status: APROVADO*\n`;
    mensagem += `🏷️ *MP ID:* ${pagamentoMP?.id || 'N/A'}\n\n`;
    
    const EMPRESA_NOME = process.env.EMPRESA_NOME || 'Sistema CRM CAIXA';
    mensagem += `_${EMPRESA_NOME} - Seu pagamento foi recebido!_`;

    const response = await fetch(`${WHATSAPP_API_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: criador.telefone,
        message: mensagem
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Corretor criador notificado:', `${criador.first_name} ${criador.last_name}`);
      return { success: true, messageId: result.messageId };
    } else {
      console.error('❌ Erro ao notificar corretor criador:', result.message);
      return { success: false, error: result.message };
    }

  } catch (error) {
    console.error('❌ Erro ao enviar notificação para corretor criador:', error);
    return { success: false, error: error.message };
  }
};

// ✅ ROTA PARA REENVIAR NOTIFICAÇÕES DE PAGAMENTO APROVADO
router.post('/:id/reenviar-notificacoes', async (req, res) => {
  try {
    const { id } = req.params;
    const { notificar_cliente = true, notificar_admins = true, notificar_criador = true } = req.body;
    
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user || !user.is_administrador) {
      return res.status(403).json({ error: 'Apenas administradores podem reenviar notificações' });
    }

    // Buscar pagamento
    const pagamento = await Pagamento.findByPk(id, {
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome', 'email', 'telefone', 'cpf']
        },
        {
          model: User,
          as: 'criador',
          attributes: ['id', 'first_name', 'last_name', 'telefone', 'is_administrador']
        }
      ]
    });

    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    if (pagamento.status !== 'aprovado') {
      return res.status(400).json({ error: 'Apenas pagamentos aprovados podem ter notificações reenviadas' });
    }

    console.log('🔄 Reenviando notificações para pagamento:', id);

    const resultados = {
      cliente: null,
      administradores: null,
      criador: null
    };

    // Dados simulados do MP (já que não temos acesso direto ao objeto original)
    const pagamentoMPSimulado = {
      id: pagamento.mp_payment_id || 'N/A',
      payment_method_id: pagamento.tipo?.toUpperCase() || 'DESCONHECIDO',
      status: pagamento.status
    };

    // ✅ NOTIFICAR CLIENTE
    if (notificar_cliente && pagamento.cliente?.telefone) {
      console.log('📱 Notificando cliente... sobre pagamento aprovado...');
      try {
        resultados.cliente = await notificarClientePagamentoAprovado(pagamento.cliente, pagamento, pagamentoMPSimulado);
      } catch (error) {
        console.error('❌ Erro ao notificar cliente:', error);
        resultados.cliente = { success: false, error: error.message };
      }
    }

    // ✅ NOTIFICAR ADMINISTRADORES
    if (notificar_admins) {
      console.log('📱 Notificando administradores sobre pagamento aprovado...');
      try {
        resultados.administradores = await notificarAdministradoresPagamentoAprovado(pagamento, pagamentoMPSimulado);
      } catch (error) {
        console.error('❌ Erro ao notificar administradores:', error);
        resultados.administradores = { success: false, error: error.message };
      }
    }

    // ✅ NOTIFICAR CORRETOR CRIADOR (SE DIFERENTE DOS ADMINS)
    if (notificar_criador && pagamento.criador?.telefone && !pagamento.criador.is_administrador) {
      console.log('📱 Notificando corretor criador sobre pagamento aprovado...');
      try {
        resultados.criador = await notificarCriadorPagamentoAprovado(pagamento.criador, pagamento, pagamentoMPSimulado);
      } catch (error) {
        console.error('❌ Erro ao notificar corretor criador:', error);
        resultados.criador = { success: false, error: error.message };
      }
    }

    res.json({
      success: true,
      message: 'Notificações reenviadas com sucesso',
      resultados
    });

  } catch (error) {
    console.error('❌ Erro ao reenviar notificações:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

module.exports = router;