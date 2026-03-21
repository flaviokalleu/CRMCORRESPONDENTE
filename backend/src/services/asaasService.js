const axios = require('axios');
require('dotenv').config();

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_ENVIRONMENT = process.env.ASAAS_ENVIRONMENT || 'sandbox';

const BASE_URL = ASAAS_ENVIRONMENT === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

console.log('Carregando configurações do Asaas...');
console.log('ENV ASAAS_API_KEY existe:', !!ASAAS_API_KEY);
console.log('Ambiente Asaas:', ASAAS_ENVIRONMENT);
console.log('URL Base Asaas:', BASE_URL);

if (!ASAAS_API_KEY) {
  console.error('ASAAS_API_KEY não configurado no .env');
}

const asaasApi = axios.create({
  baseURL: BASE_URL,
  headers: {
    'access_token': ASAAS_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Calcula a próxima data de vencimento baseado no dia_vencimento
const calcularProximoVencimento = (diaVencimento) => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();

  let dataVencimento = new Date(ano, mes, diaVencimento);

  // Se já passou o dia de vencimento do mês atual, usa o próximo mês
  if (hoje.getDate() >= diaVencimento) {
    dataVencimento = new Date(ano, mes + 1, diaVencimento);
  }

  const yyyy = dataVencimento.getFullYear();
  const mm = String(dataVencimento.getMonth() + 1).padStart(2, '0');
  const dd = String(dataVencimento.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Criar cliente no Asaas
const criarCliente = async (dados) => {
  try {
    const { name, cpfCnpj, email, phone } = dados;
    console.log('Criando cliente no Asaas:', { name, cpfCnpj, email });

    const response = await asaasApi.post('/customers', {
      name,
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      email: email || undefined,
      phone: phone ? phone.replace(/\D/g, '') : undefined,
      notificationDisabled: false,
    });

    console.log('Cliente criado no Asaas:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar cliente no Asaas:', error.response?.data || error.message);
    throw new Error(`Erro ao criar cliente no Asaas: ${error.response?.data?.errors?.[0]?.description || error.message}`);
  }
};

// Buscar cliente no Asaas
const buscarCliente = async (customerId) => {
  try {
    const response = await asaasApi.get(`/customers/${customerId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar cliente no Asaas:', error.response?.data || error.message);
    throw new Error(`Erro ao buscar cliente: ${error.message}`);
  }
};

// Criar assinatura recorrente (mensal)
const criarAssinatura = async (dados) => {
  try {
    const { customer, value, nextDueDate, description } = dados;
    console.log('Criando assinatura no Asaas:', { customer, value, nextDueDate });

    const response = await asaasApi.post('/subscriptions', {
      customer,
      billingType: 'UNDEFINED', // Inquilino escolhe: boleto, PIX ou cartão
      value: parseFloat(value),
      nextDueDate,
      cycle: 'MONTHLY',
      description: description || 'Aluguel mensal',
      maxPayments: undefined, // Sem limite
    });

    console.log('Assinatura criada no Asaas:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar assinatura no Asaas:', error.response?.data || error.message);
    throw new Error(`Erro ao criar assinatura: ${error.response?.data?.errors?.[0]?.description || error.message}`);
  }
};

// Atualizar assinatura (ex: novo valor)
const atualizarAssinatura = async (subscriptionId, dados) => {
  try {
    console.log('Atualizando assinatura no Asaas:', subscriptionId, dados);

    const response = await asaasApi.put(`/subscriptions/${subscriptionId}`, dados);

    console.log('Assinatura atualizada no Asaas:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar assinatura no Asaas:', error.response?.data || error.message);
    throw new Error(`Erro ao atualizar assinatura: ${error.message}`);
  }
};

// Cancelar assinatura
const cancelarAssinatura = async (subscriptionId) => {
  try {
    console.log('Cancelando assinatura no Asaas:', subscriptionId);

    const response = await asaasApi.delete(`/subscriptions/${subscriptionId}`);

    console.log('Assinatura cancelada no Asaas:', subscriptionId);
    return response.data;
  } catch (error) {
    console.error('Erro ao cancelar assinatura no Asaas:', error.response?.data || error.message);
    throw new Error(`Erro ao cancelar assinatura: ${error.message}`);
  }
};

// Criar cobrança avulsa (one-off)
const criarCobrancaAvulsa = async (dados) => {
  try {
    const { customer, value, dueDate, description } = dados;
    console.log('Criando cobranca avulsa no Asaas:', { customer, value, dueDate });

    const response = await asaasApi.post('/payments', {
      customer,
      billingType: 'UNDEFINED', // Inquilino escolhe
      value: parseFloat(value),
      dueDate,
      description: description || 'Cobranca de aluguel',
    });

    console.log('Cobranca avulsa criada no Asaas:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar cobranca avulsa no Asaas:', error.response?.data || error.message);
    throw new Error(`Erro ao criar cobranca: ${error.response?.data?.errors?.[0]?.description || error.message}`);
  }
};

// Buscar detalhes de um pagamento
const buscarCobranca = async (paymentId) => {
  try {
    const response = await asaasApi.get(`/payments/${paymentId}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar cobranca no Asaas:', error.response?.data || error.message);
    throw new Error(`Erro ao buscar cobranca: ${error.message}`);
  }
};

// Listar cobranças de uma assinatura
const listarCobrancasPorAssinatura = async (subscriptionId) => {
  try {
    const response = await asaasApi.get('/payments', {
      params: { subscription: subscriptionId },
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao listar cobrancas por assinatura:', error.response?.data || error.message);
    throw new Error(`Erro ao listar cobrancas: ${error.message}`);
  }
};

// Listar cobranças de um cliente
const listarCobrancasPorCliente = async (customerId) => {
  try {
    const response = await asaasApi.get('/payments', {
      params: { customer: customerId },
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao listar cobrancas por cliente:', error.response?.data || error.message);
    throw new Error(`Erro ao listar cobrancas: ${error.message}`);
  }
};

// Buscar dados do PIX de um pagamento
const buscarPixQrCode = async (paymentId) => {
  try {
    const response = await asaasApi.get(`/payments/${paymentId}/pixQrCode`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar PIX QR Code:', error.response?.data || error.message);
    return null;
  }
};

// Buscar linha digitável do boleto
const buscarIdentificacaoBoleto = async (paymentId) => {
  try {
    const response = await asaasApi.get(`/payments/${paymentId}/identificationField`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar identificacao do boleto:', error.response?.data || error.message);
    return null;
  }
};

// Testar conexão com o Asaas
const testarConexao = async () => {
  try {
    console.log('Testando conexao com Asaas...');

    const response = await asaasApi.get('/finance/getCurrentBalance');

    console.log('Conexao com Asaas OK. Saldo:', response.data);
    return {
      success: true,
      environment: ASAAS_ENVIRONMENT,
      balance: response.data,
      message: 'Conexao com Asaas funcionando corretamente',
    };
  } catch (error) {
    console.error('Erro ao testar conexao com Asaas:', error.response?.data || error.message);
    return {
      success: false,
      environment: ASAAS_ENVIRONMENT,
      error: error.response?.data || error.message,
    };
  }
};

module.exports = {
  criarCliente,
  buscarCliente,
  criarAssinatura,
  atualizarAssinatura,
  cancelarAssinatura,
  criarCobrancaAvulsa,
  buscarCobranca,
  listarCobrancasPorAssinatura,
  listarCobrancasPorCliente,
  buscarPixQrCode,
  buscarIdentificacaoBoleto,
  testarConexao,
  calcularProximoVencimento,
  ASAAS_API_KEY,
  ASAAS_ENVIRONMENT,
};
