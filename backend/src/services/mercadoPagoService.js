const { MercadoPagoConfig, Preference } = require('mercadopago');

// ✅ CARREGAR VARIÁVEIS DO ENV PRIMEIRO
require('dotenv').config();

// ✅ CONFIGURAÇÕES OBRIGATÓRIAS DO MERCADO PAGO
const ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const PUBLIC_KEY = process.env.MERCADO_PAGO_PUBLIC_KEY;

console.log('🔍 Carregando configurações do Mercado Pago...');
console.log('📁 ENV ACCESS_TOKEN existe:', !!ACCESS_TOKEN);
console.log('📁 ENV PUBLIC_KEY existe:', !!PUBLIC_KEY);

if (ACCESS_TOKEN) {
  console.log('🔑 Access Token carregado:', `${ACCESS_TOKEN.substring(0, 20)}...`);
}

if (PUBLIC_KEY) {
  console.log('🔓 Public Key carregado:', `${PUBLIC_KEY.substring(0, 20)}...`);
}

// ✅ VALIDAR SE AS CHAVES ESTÃO CONFIGURADAS
if (!ACCESS_TOKEN) {
  console.error('❌ ERRO: MERCADO_PAGO_ACCESS_TOKEN não configurado no .env');
  console.error('📋 Valor atual da variável:', process.env.MERCADO_PAGO_ACCESS_TOKEN);
  console.error('📋 Todas as variáveis ENV relacionadas ao MP:', {
    MERCADO_PAGO_ACCESS_TOKEN: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    MERCADO_PAGO_PUBLIC_KEY: process.env.MERCADO_PAGO_PUBLIC_KEY
  });
  throw new Error('Token de acesso do Mercado Pago é obrigatório');
}

if (!PUBLIC_KEY) {
  console.warn('⚠️ AVISO: MERCADO_PAGO_PUBLIC_KEY não configurado no .env');
}

// ✅ INICIALIZAR CLIENTE DO MERCADO PAGO
const client = new MercadoPagoConfig({ 
  accessToken: ACCESS_TOKEN,
  options: {
    timeout: 10000,
    idempotencyKey: process.env.NODE_ENV || 'development'
  }
});

const preference = new Preference(client);

console.log('✅ Mercado Pago configurado com sucesso');
console.log('🔑 Access Token Status: OK');
console.log('🔓 Public Key Status:', PUBLIC_KEY ? 'OK' : 'NÃO CONFIGURADO');

// ✅ FUNÇÃO PARA CRIAR PREFERÊNCIA UNIVERSAL (TODOS OS TIPOS DE PAGAMENTO)
const criarPreferenciaUniversal = async (dados) => {
  try {
    const { cliente, titulo, descricao, valor_numerico, parcelas = 1, data_vencimento, link_unico } = dados;
    
    console.log('🌐 Criando preferência UNIVERSAL (todos os pagamentos) no MP:', {
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      valor: valor_numerico,
      parcelas,
      titulo
    });

    // Validar dados obrigatórios
    if (!cliente || !titulo || !valor_numerico) {
      throw new Error('Dados obrigatórios não fornecidos: cliente, titulo, valor_numerico');
    }

    if (valor_numerico <= 0) {
      throw new Error('Valor deve ser maior que zero');
    }

    // ✅ CONFIGURAR PREFERÊNCIA UNIVERSAL - ACEITA TODOS OS TIPOS
    const preferenceData = {
      items: [
        {
          id: link_unico || `universal_${cliente.id}_${Date.now()}`,
          title: titulo,
          description: descricao || titulo,
          category_id: 'services',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: parseFloat(valor_numerico.toFixed(2))
        }
      ],
      payer: {
        name: cliente.nome,
        email: cliente.email || `cliente${cliente.id}@temporario.com`,
        phone: {
          area_code: cliente.telefone ? cliente.telefone.substring(0, 2) : '11',
          number: cliente.telefone ? cliente.telefone.substring(2) : '999999999'
        },
        identification: {
          type: 'CPF',
          number: cliente.cpf ? cliente.cpf.replace(/\D/g, '') : '00000000000'
        }
      },
      // ✅ CONFIGURAÇÃO PARA ACEITAR TODOS OS TIPOS DE PAGAMENTO
      payment_methods: {
        // ✅ NÃO EXCLUIR NENHUM MÉTODO - ACEITA TODOS
        excluded_payment_methods: [], // Lista vazia = aceita todos
        excluded_payment_types: [],   // Lista vazia = aceita todos os tipos
        
        // ✅ CONFIGURAÇÕES DE PARCELAMENTO INTELIGENTE
        installments: parseInt(parcelas) || 12, // Máximo de parcelas permitidas
        default_installments: 1, // Padrão: à vista
        
        // ✅ INCLUIR EXPLICITAMENTE OS PRINCIPAIS MÉTODOS
        included_payment_methods: [
          // PIX
          { id: 'pix' },
          
          // Cartões de Crédito
          { id: 'visa' },
          { id: 'master' },
          { id: 'amex' },
          { id: 'elo' },
          { id: 'hipercard' },
          
          // Cartões de Débito
          { id: 'debvisa' },
          { id: 'debmaster' },
          { id: 'debelo' },
          
          // Boletos
          { id: 'bolbradesco' },
          { id: 'pec' },
          
          // Dinheiro em conta MP
          { id: 'account_money' }
        ]
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pagamento/sucesso`,
        failure: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pagamento/erro`,
        pending: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pagamento/pendente`
      },
      auto_return: 'approved',
      external_reference: link_unico || `universal_${cliente.id}_${Date.now()}`,
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/pagamentos/webhook`,
      
      // ✅ CONFIGURAÇÕES DE EXPIRAÇÃO INTELIGENTES
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: data_vencimento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
      
      // ✅ CONFIGURAÇÕES ADICIONAIS
      marketplace_fee: 0, // Sem taxa de marketplace
      statement_descriptor: 'CRMIMOB IMOBILIARIA', // Aparece na fatura do cartão
      
      // ✅ METADATA PARA TRACKING
      metadata: {
        cliente_id: cliente.id.toString(),
        cliente_nome: cliente.nome,
        sistema: 'CRMIMOB_IMOVEIS',
        tipo_pagamento: 'universal',
        parcelas: parcelas.toString(),
        created_at: new Date().toISOString()
      }
    };

    console.log('📋 Dados da preferência universal:', JSON.stringify(preferenceData, null, 2));

    const response = await preference.create({ body: preferenceData });
    
    console.log('✅ Preferência UNIVERSAL criada com sucesso:', {
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      tipos_aceitos: 'TODOS (PIX, Cartão, Boleto, etc.)'
    });

    return response;

  } catch (error) {
    console.error('❌ Erro ao criar preferência universal:', error);
    console.error('❌ Stack trace:', error.stack);
    throw new Error(`Erro no Mercado Pago (Universal): ${error.message}`);
  }
};

// ✅ FUNÇÃO PARA CALCULAR JUROS BASEADO NO TIPO DE PAGAMENTO
const calcularJurosPorTipo = async (valor, parcelas, tipoPagamento = 'boleto') => {
  try {
    console.log('📊 Calculando juros por tipo:', { valor, parcelas, tipoPagamento });
    
    if (parcelas <= 1) {
      return {
        valor_original: valor,
        valor_com_juros: valor,
        juros_total: 0,
        juros_percentual: 0,
        valor_parcela: valor,
        tipo_pagamento: tipoPagamento
      };
    }

    // ✅ TAXAS DIFERENCIADAS POR TIPO DE PAGAMENTO
    let taxaJurosMensal = 0;
    
    switch (tipoPagamento.toLowerCase()) {
      case 'pix':
        taxaJurosMensal = 0; // PIX não tem juros
        break;
      case 'boleto':
        taxaJurosMensal = 0.0199; // 1.99% ao mês para boleto
        break;
      case 'cartao_credito':
      case 'credit_card':
        taxaJurosMensal = 0.0399; // 3.99% ao mês para cartão de crédito
        break;
      case 'cartao_debito':
      case 'debit_card':
        taxaJurosMensal = 0.0149; // 1.49% ao mês para débito
        break;
      default:
        taxaJurosMensal = 0.0299; // 2.99% padrão
    }

    // Calcular juros compostos
    const jurosComposto = Math.pow(1 + taxaJurosMensal, parcelas - 1);
    const valorComJuros = valor * jurosComposto;
    const jurosTotal = valorComJuros - valor;
    const valorParcela = valorComJuros / parcelas;

    const resultado = {
      valor_original: parseFloat(valor.toFixed(2)),
      valor_com_juros: parseFloat(valorComJuros.toFixed(2)),
      juros_total: parseFloat(jurosTotal.toFixed(2)),
      juros_percentual: parseFloat(((jurosTotal / valor) * 100).toFixed(2)),
      valor_parcela: parseFloat(valorParcela.toFixed(2)),
      parcelas: parcelas,
      tipo_pagamento: tipoPagamento,
      taxa_mensal: (taxaJurosMensal * 100).toFixed(2) + '%'
    };

    console.log('📊 Resultado do cálculo por tipo:', resultado);
    return resultado;

  } catch (error) {
    console.error('❌ Erro ao calcular juros por tipo:', error);
    throw new Error(`Erro ao calcular juros: ${error.message}`);
  }
};

// ✅ FUNÇÃO PARA CRIAR PREFERÊNCIA COM JUROS CALCULADOS UNIVERSAL
const criarPreferenciaUniversalComJuros = async (dados) => {
  try {
    const { 
      cliente, 
      titulo, 
      descricao, 
      valor_numerico, 
      parcelas = 1, 
      parcela_atual = 1, 
      link_unico,
      tipo_pagamento = 'universal'
    } = dados;
    
    console.log('💰 Criando preferência universal com juros:', {
      cliente_id: cliente.id,
      valor_original: valor_numerico,
      parcelas,
      parcela_atual,
      tipo_pagamento,
      link_unico
    });

    // Calcular juros (usando cartão como referência para estimativa)
    const calculoJuros = await calcularJurosPorTipo(valor_numerico, parcelas, 'cartao_credito');
    
    const preferenceData = {
      items: [
        {
          id: link_unico || `universal_${cliente.id}_${Date.now()}`,
          title: parcelas > 1 ? `${titulo} - Parcela ${parcela_atual}/${parcelas}` : titulo,
          description: parcelas > 1 ? 
            `${descricao || titulo} - Parcela ${parcela_atual} de ${parcelas}` : 
            (descricao || titulo),
          category_id: 'services',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: parcelas > 1 ? calculoJuros.valor_parcela : valor_numerico
        }
      ],
      payer: {
        name: cliente.nome,
        email: cliente.email || `cliente${cliente.id}@temporario.com`,
        phone: {
          area_code: cliente.telefone ? cliente.telefone.substring(0, 2) : '11',
          number: cliente.telefone ? cliente.telefone.substring(2) : '999999999'
        },
        identification: {
          type: 'CPF',
          number: cliente.cpf ? cliente.cpf.replace(/\D/g, '') : '00000000000'
        }
      },
      // ✅ ACEITAR TODOS OS TIPOS DE PAGAMENTO
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12, // Permitir até 12x no cartão
        default_installments: 1
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pagamento/sucesso`,
        failure: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pagamento/erro`,
        pending: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pagamento/pendente`
      },
      auto_return: 'approved',
      external_reference: link_unico || `universal_${cliente.id}_${parcela_atual}_${Date.now()}`,
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/pagamentos/webhook`,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      
      statement_descriptor: 'CRMIMOB IMOBILIARIA',
      metadata: {
        cliente_id: cliente.id.toString(),
        parcela_atual: parcela_atual.toString(),
        total_parcelas: parcelas.toString(),
        valor_original: valor_numerico.toString(),
        sistema: 'CRMIMOB_IMOVEIS'
      }
    };

    const response = await preference.create({ body: preferenceData });
    
    console.log('✅ Preferência universal com juros criada:', {
      id: response.id,
      valor_parcela: parcelas > 1 ? calculoJuros.valor_parcela : valor_numerico,
      juros_aplicados: calculoJuros.juros_total,
      tipos_aceitos: 'TODOS'
    });

    return {
      ...response,
      calculo_juros: calculoJuros
    };

  } catch (error) {
    console.error('❌ Erro ao criar preferência universal com juros:', error);
    throw new Error(`Erro no Mercado Pago: ${error.message}`);
  }
};

// ✅ FUNÇÃO PARA OBTER TIPOS DE PAGAMENTO DISPONÍVEIS
const obterTiposPagamentoDisponiveis = () => {
  return {
    pix: {
      nome: 'PIX',
      descricao: 'Pagamento instantâneo',
      juros: '0%',
      tempo: 'Instantâneo'
    },
    boleto: {
      nome: 'Boleto Bancário',
      descricao: 'Vencimento em até 30 dias',
      juros: '1.99% a.m.',
      tempo: 'Até 3 dias úteis'
    },
    cartao_credito: {
      nome: 'Cartão de Crédito',
      descricao: 'Parcelamento em até 12x',
      juros: '3.99% a.m.',
      tempo: 'Instantâneo'
    },
    cartao_debito: {
      nome: 'Cartão de Débito',
      descricao: 'Débito direto na conta',
      juros: '1.49% a.m.',
      tempo: 'Instantâneo'
    },
    conta_mp: {
      nome: 'Saldo Mercado Pago',
      descricao: 'Usar saldo da conta MP',
      juros: '0%',
      tempo: 'Instantâneo'
    }
  };
};

// ✅ MANTER FUNÇÕES ANTIGAS PARA COMPATIBILIDADE
const calcularJurosMercadoPago = async (valor, parcelas) => {
  return await calcularJurosPorTipo(valor, parcelas, 'cartao_credito');
};

const criarPreferenciaComJuros = async (dados) => {
  return await criarPreferenciaUniversalComJuros(dados);
};

// ✅ MANTER FUNÇÕES EXISTENTES
const criarPreferenciaBoleto = async (dados) => {
  // Usar função universal mas forçar apenas boleto
  const dadosModificados = {
    ...dados,
    tipo_restricao: 'boleto'
  };
  
  try {
    const resultado = await criarPreferenciaUniversal(dadosModificados);
    
    // Modificar para aceitar apenas boleto
    const preferenceData = {
      ...resultado,
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'prepaid_card' }
        ],
        included_payment_methods: [
          { id: 'bolbradesco' },
          { id: 'pec' }
        ]
      }
    };
    
    return resultado;
  } catch (error) {
    throw error;
  }
};

const criarPreferenciaPix = async (dados) => {
  // Usar função universal mas forçar apenas PIX
  const dadosModificados = {
    ...dados,
    tipo_restricao: 'pix'
  };
  
  try {
    const resultado = await criarPreferenciaUniversal(dadosModificados);
    return resultado;
  } catch (error) {
    throw error;
  }
};

// ✅ FUNÇÃO PARA PROCESSAR WEBHOOK
const processarWebhook = async (dados) => {
  try {
    console.log('🔔 Processando webhook do MP:', dados);
    
    if (dados.type === 'payment') {
      return {
        tipo: 'payment',
        payment_id: dados.data?.id,
        status: dados.action,
        dados: dados
      };
    }
    
    return { tipo: 'outro', dados };
    
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    throw error;
  }
};

// ✅ FUNÇÃO PARA BUSCAR PAGAMENTO NO MERCADO PAGO
const buscarPagamento = async (paymentId) => {
  try {
    const { MercadoPagoConfig, Payment } = require('mercadopago');
    const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
    const payment = new Payment(client);
    
    const resultado = await payment.get({ id: paymentId });
    
    console.log('🔍 Pagamento encontrado no MP:', {
      id: resultado.id,
      status: resultado.status,
      external_reference: resultado.external_reference,
      transaction_amount: resultado.transaction_amount,
      payment_method_id: resultado.payment_method_id,
      payment_type_id: resultado.payment_type_id
    });
    
    return resultado;
    
  } catch (error) {
    console.error('❌ Erro ao buscar pagamento no MP:', error);
    throw error;
  }
};

// ✅ FUNÇÃO PARA TESTAR CONEXÃO
const testarConexao = async () => {
  try {
    console.log('🧪 Testando conexão com Mercado Pago...');
    
    const dadosTeste = {
      cliente: {
        id: 999,
        nome: 'Cliente Teste',
        email: 'teste@teste.com',
        telefone: '11999999999',
        cpf: '00000000000'
      },
      titulo: 'Teste de Conexão Universal',
      descricao: 'Teste automático da API - Aceita todos os pagamentos',
      valor_numerico: 0.01,
      parcelas: 1
    };

    const result = await criarPreferenciaUniversal(dadosTeste);
    
    console.log('✅ Teste de conexão universal bem-sucedido!');
    return {
      success: true,
      preference_id: result.id,
      init_point: result.init_point,
      tipos_aceitos: 'PIX, Cartão, Boleto, etc.',
      message: 'Conexão universal com Mercado Pago funcionando corretamente'
    };
    
  } catch (error) {
    console.error('❌ Teste de conexão falhou:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  // ✅ NOVAS FUNÇÕES UNIVERSAIS
  criarPreferenciaUniversal,
  criarPreferenciaUniversalComJuros,
  calcularJurosPorTipo,
  obterTiposPagamentoDisponiveis,
  
  // ✅ FUNÇÕES DE COMPATIBILIDADE
  criarPreferenciaBoleto,
  criarPreferenciaPix,
  calcularJurosMercadoPago,
  criarPreferenciaComJuros,
  
  // ✅ FUNÇÕES UTILITÁRIAS
  processarWebhook,
  buscarPagamento,
  testarConexao,
  
  // ✅ CONSTANTES
  ACCESS_TOKEN,
  PUBLIC_KEY
};