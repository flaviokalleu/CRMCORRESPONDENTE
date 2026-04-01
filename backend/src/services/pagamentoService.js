'use strict';

const { User, Cliente, Pagamento } = require('../models');
const { Op } = require('sequelize');
const mercadoPagoService = require('./mercadoPagoService');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const WHATSAPP_API_URL = `${BACKEND_URL}/api/whatsapp`;

// ===== FUNÇÕES UTILITÁRIAS =====

function formatPhoneNumber(phone) {
  if (!phone) return null;
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) return null;

  let formattedPhone = cleanPhone;
  const COUNTRY_CODE = process.env.WHATSAPP_COUNTRY_CODE || '55';

  if (formattedPhone.startsWith(COUNTRY_CODE)) {
    if (formattedPhone.length === 13) {
      const codigoPais = formattedPhone.substring(0, 2);
      const ddd = formattedPhone.substring(2, 4);
      const nono = formattedPhone.substring(4, 5);
      const numero = formattedPhone.substring(5);
      if (nono === '9') formattedPhone = `${codigoPais}${ddd}${numero}`;
    }
  } else {
    if (formattedPhone.length === 11) {
      const ddd = formattedPhone.substring(0, 2);
      const nono = formattedPhone.substring(2, 3);
      const numero = formattedPhone.substring(3);
      if (nono === '9') formattedPhone = `${COUNTRY_CODE}${ddd}${numero}`;
      else formattedPhone = `${COUNTRY_CODE}${formattedPhone}`;
    } else if (formattedPhone.length === 10) {
      formattedPhone = `${COUNTRY_CODE}${formattedPhone}`;
    }
  }

  const EXPECTED_LENGTH = parseInt(process.env.WHATSAPP_PHONE_LENGTH || '12');
  if (formattedPhone.length !== EXPECTED_LENGTH) return null;
  return formattedPhone;
}

function formatarValorMonetario(valor) {
  if (!valor) return '0,00';
  const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
  if (isNaN(numero)) return '0,00';
  const CURRENCY_LOCALE = process.env.CURRENCY_LOCALE || 'pt-BR';
  return numero.toLocaleString(CURRENCY_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function converterValorParaNumero(valorFormatado) {
  if (!valorFormatado) return 0;
  const DECIMAL_SEPARATOR = process.env.DECIMAL_SEPARATOR || ',';
  const THOUSAND_SEPARATOR = process.env.THOUSAND_SEPARATOR || '.';
  let valorLimpo = valorFormatado.toString();
  valorLimpo = valorLimpo.replace(new RegExp(`\\${THOUSAND_SEPARATOR}`, 'g'), '');
  if (DECIMAL_SEPARATOR !== '.') valorLimpo = valorLimpo.replace(DECIMAL_SEPARATOR, '.');
  return parseFloat(valorLimpo) || 0;
}

function criarMensagemPagamento(pagamento, cliente, tipo = 'boleto') {
  const tipoEmoji = tipo === 'pix' ? '⚡' : '🎫';
  const tipoTexto = tipo === 'pix' ? 'PIX' : 'BOLETO';
  const vencimento = tipo === 'pix' ? '30 minutos' : new Date(pagamento.data_vencimento).toLocaleDateString('pt-BR');
  let mensagem = `${tipoEmoji} *${tipoTexto} GERADO*\n\n`;
  mensagem += `👤 *Cliente:* ${cliente.nome}\n📄 *Descrição:* ${pagamento.titulo}\n💰 *Valor:* R$ ${pagamento.valor}\n`;
  if (tipo === 'boleto' && pagamento.parcelas > 1) mensagem += `📊 *Parcelas:* ${pagamento.parcelas}x de R$ ${pagamento.valor_parcela}\n`;
  mensagem += `📅 *Vencimento:* ${vencimento}\n🆔 *ID:* #${pagamento.id}\n\n`;
  if (pagamento.descricao) mensagem += `📋 *Detalhes:* ${pagamento.descricao}\n\n`;
  mensagem += `🔗 *Link para pagamento:*\n${pagamento.link_pagamento}\n\n`;
  if (tipo === 'pix') mensagem += `⚡ *PIX - Pagamento instantâneo*\n⏰ _Válido por 30 minutos_\n\n`;
  else mensagem += `🎫 *BOLETO BANCÁRIO*\n💳 _Pode ser pago em qualquer banco_\n\n`;
  const EMPRESA_NOME = process.env.EMPRESA_NOME || 'Sistema CRM CAIXA';
  mensagem += `_Enviado automaticamente pelo ${EMPRESA_NOME}_`;
  return mensagem;
}

// ===== FUNÇÕES DE COMUNICAÇÃO =====

async function enviarWhatsAppViaBaileys(telefone, mensagem, tenantId) {
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tenantId ? { 'X-Tenant-Id': String(tenantId) } : {})
      },
      body: JSON.stringify({ phone: telefone, message: mensagem })
    });
    const result = await response.json();
    return result.success ? { success: true, messageId: result.messageId } : { success: false, error: result.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function verificarStatusWhatsApp(tenantId) {
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(tenantId ? { 'X-Tenant-Id': String(tenantId) } : {})
      }
    });
    const result = await response.json();
    return result.isAuthenticated || false;
  } catch (error) {
    return false;
  }
}

async function enviarWhatsAppParaCliente(cliente, pagamento, tipo, tenantId) {
  try {
    const response = await fetch(`${WHATSAPP_API_URL}/enviar-pagamento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tenantId ? { 'X-Tenant-Id': String(tenantId) } : {})
      },
      body: JSON.stringify({
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        clienteTelefone: cliente.telefone || cliente.celular,
        pagamentoId: pagamento.id,
        titulo: pagamento.titulo,
        valor: pagamento.valor,
        tipo: tipo,
        linkPagamento: pagamento.link_pagamento,
        dataVencimento: pagamento.data_vencimento
      })
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function enviarEmailParaCliente(cliente, pagamento, tipo) {
  return { success: true, message: `Email de ${tipo} enviado para ${cliente.email} (simulado)` };
}

async function notificarCriadorPagamentoAprovado(criador, pagamento, pagamentoMP, tenantId) {
  try {
    if (!criador || !criador.telefone) return { success: false, error: 'Criador sem telefone' };
    const telefoneFormatado = formatPhoneNumber(criador.telefone);
    if (!telefoneFormatado) return { success: false, error: 'Telefone do criador inválido' };

    let mensagem = `✅ *PAGAMENTO APROVADO!*\n\n`;
    mensagem += `🆔 *ID:* #${pagamento.id}\n📄 *Título:* ${pagamento.titulo}\n💰 *Valor:* R$ ${pagamento.valor}\n`;
    mensagem += `💳 *Método:* ${pagamentoMP?.payment_method_id || 'N/A'}\n⏰ *Aprovado em:* ${new Date().toLocaleString('pt-BR')}\n\n`;
    mensagem += `_Notificação automática do sistema_`;

    return await enviarWhatsAppViaBaileys(telefoneFormatado, mensagem, tenantId);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ===== LÓGICA DE NEGÓCIO =====

/**
 * Mapeia status do Mercado Pago para status local.
 */
function mapearStatusMP(mpStatus) {
  const statusMap = {
    approved: 'aprovado',
    pending: 'pendente',
    in_process: 'processando',
    rejected: 'rejeitado',
    cancelled: 'cancelado',
    refunded: 'reembolsado',
    charged_back: 'estornado'
  };
  return statusMap[mpStatus] || mpStatus;
}

/**
 * Listar pagamentos com paginação e filtros.
 */
async function listarPagamentos({ page = 1, limit = 20, status, tipo, cliente_id, userId, isAdmin }) {
  const where = {};
  if (status) where.status = status;
  if (tipo) where.tipo = tipo;
  if (cliente_id) where.cliente_id = cliente_id;
  if (!isAdmin) where.criado_por = userId;

  const offset = (page - 1) * limit;
  const { rows: pagamentos, count } = await Pagamento.findAndCountAll({
    where,
    include: [
      { model: Cliente, as: 'cliente', attributes: ['id', 'nome', 'email', 'telefone', 'celular'] },
      { model: User, as: 'criador', attributes: ['id', 'first_name', 'last_name', 'email'] }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  const pagamentosComInfo = pagamentos.map(p => {
    const pJson = p.toJSON();
    pJson.tem_comprovante = !!(pJson.comprovante_url || pJson.receipt_url);
    pJson.pode_obter_comprovante = pJson.status === 'aprovado' && pJson.mp_payment_id;
    return pJson;
  });

  return { pagamentos: pagamentosComInfo, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) };
}

/**
 * Obter pagamento por ID.
 */
async function obterPagamento(id, userId, isAdmin) {
  const pagamento = await Pagamento.findByPk(id, {
    include: [
      { model: Cliente, as: 'cliente', attributes: ['id', 'nome', 'email', 'telefone', 'celular', 'cpf'] },
      { model: User, as: 'criador', attributes: ['id', 'first_name', 'last_name', 'email'] }
    ]
  });

  if (!pagamento) return null;
  if (!isAdmin && pagamento.criado_por !== userId) return { forbidden: true };

  // Se aprovado com mp_payment_id mas sem receipt_url, tentar buscar
  if (pagamento.status === 'aprovado' && pagamento.mp_payment_id && !pagamento.receipt_url) {
    try {
      const { MercadoPagoConfig, Payment } = require('mercadopago');
      const client = new MercadoPagoConfig({ accessToken: mercadoPagoService.ACCESS_TOKEN });
      const payment = new Payment(client);
      const mpPayment = await payment.get({ id: pagamento.mp_payment_id });
      if (mpPayment.transaction_details?.external_resource_url) {
        await pagamento.update({ receipt_url: mpPayment.transaction_details.external_resource_url });
      }
    } catch (err) {
      console.error('Erro ao buscar receipt do MP:', err.message);
    }
  }

  return pagamento;
}

/**
 * Atualizar pagamento pendente.
 */
async function atualizarPagamento(id, data) {
  const pagamento = await Pagamento.findByPk(id);
  if (!pagamento) return null;
  if (pagamento.status !== 'pendente') return { error: 'Apenas pagamentos pendentes podem ser editados' };

  const allowedFields = ['titulo', 'descricao', 'valor', 'data_vencimento', 'parcelas', 'observacoes'];
  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) updateData[field] = data[field];
  }

  await pagamento.update(updateData);
  return pagamento;
}

/**
 * Deletar pagamento (não aprovados).
 */
async function deletarPagamento(id) {
  const pagamento = await Pagamento.findByPk(id);
  if (!pagamento) return null;
  if (pagamento.status === 'aprovado') return { error: 'Não é possível excluir pagamentos aprovados' };
  await pagamento.destroy();
  return { success: true };
}

/**
 * Obter configurações do sistema de pagamento.
 */
function getConfig() {
  return {
    maxParcelas: parseInt(process.env.MAX_PARCELAS || '12'),
    boletoDaysToExpire: parseInt(process.env.BOLETO_DAYS_TO_EXPIRE || '3'),
    pixExpireMinutes: parseInt(process.env.PIX_EXPIRE_MINUTES || '30'),
    currencyLocale: process.env.CURRENCY_LOCALE || 'pt-BR',
    empresaNome: process.env.EMPRESA_NOME || 'Sistema CRM CAIXA'
  };
}

module.exports = {
  // Utilitários
  formatPhoneNumber,
  formatarValorMonetario,
  converterValorParaNumero,
  criarMensagemPagamento,
  mapearStatusMP,
  // Comunicação
  enviarWhatsAppViaBaileys,
  verificarStatusWhatsApp,
  enviarWhatsAppParaCliente,
  enviarEmailParaCliente,
  notificarCriadorPagamentoAprovado,
  // CRUD
  listarPagamentos,
  obterPagamento,
  atualizarPagamento,
  deletarPagamento,
  getConfig,
  // Constantes
  WHATSAPP_API_URL,
  BACKEND_URL
};
