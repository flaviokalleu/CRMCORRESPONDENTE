'use strict';

const pagamentoService = require('../services/pagamentoService');
const mercadoPagoService = require('../services/mercadoPagoService');

async function listarPagamentos(req, res) {
  try {
    const isAdmin = req.user.role === 'administrador' || req.user.is_administrador;
    const result = await pagamentoService.listarPagamentos({
      ...req.query,
      userId: req.user.id,
      isAdmin
    });
    res.json(result);
  } catch (error) {
    console.error('Erro ao listar pagamentos:', error);
    res.status(500).json({ error: 'Erro ao listar pagamentos' });
  }
}

async function obterPagamento(req, res) {
  try {
    const isAdmin = req.user.role === 'administrador' || req.user.is_administrador;
    const result = await pagamentoService.obterPagamento(req.params.id, req.user.id, isAdmin);
    if (!result) return res.status(404).json({ error: 'Pagamento não encontrado' });
    if (result.forbidden) return res.status(403).json({ error: 'Sem permissão para visualizar este pagamento' });
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar pagamento:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamento' });
  }
}

async function atualizarPagamento(req, res) {
  try {
    const result = await pagamentoService.atualizarPagamento(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: 'Pagamento não encontrado' });
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (error) {
    console.error('Erro ao atualizar pagamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  }
}

async function deletarPagamento(req, res) {
  try {
    const result = await pagamentoService.deletarPagamento(req.params.id);
    if (!result) return res.status(404).json({ error: 'Pagamento não encontrado' });
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ message: 'Pagamento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir pagamento:', error);
    res.status(500).json({ error: 'Erro ao excluir pagamento' });
  }
}

async function getWhatsAppStatus(req, res) {
  try {
    const isConnected = await pagamentoService.verificarStatusWhatsApp();
    res.json({ connected: isConnected, status: isConnected ? 'connected' : 'disconnected' });
  } catch (error) {
    res.status(500).json({ connected: false, error: error.message });
  }
}

async function getConfig(req, res) {
  res.json(pagamentoService.getConfig());
}

async function getMercadoPagoConfig(req, res) {
  res.json({
    publicKey: mercadoPagoService.PUBLIC_KEY || null,
    ready: !!mercadoPagoService.ACCESS_TOKEN
  });
}

async function testMercadoPago(req, res) {
  try {
    const { MercadoPagoConfig, Preference } = require('mercadopago');
    const client = new MercadoPagoConfig({ accessToken: mercadoPagoService.ACCESS_TOKEN });
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [{ title: 'Teste de Conexão', unit_price: 0.01, quantity: 1 }],
        back_urls: {
          success: `${pagamentoService.BACKEND_URL}/api/pagamentos/webhook`,
          failure: `${pagamentoService.BACKEND_URL}/api/pagamentos/webhook`,
          pending: `${pagamentoService.BACKEND_URL}/api/pagamentos/webhook`
        }
      }
    });
    res.json({ success: true, message: 'Conexão com Mercado Pago funcionando!', preferenceId: result.id });
  } catch (error) {
    console.error('Erro no teste MP:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function enviarWhatsApp(req, res) {
  try {
    const { Pagamento, Cliente } = require('../models');
    const pagamento = await Pagamento.findByPk(req.params.id, {
      include: [{ model: Cliente, as: 'cliente' }]
    });
    if (!pagamento) return res.status(404).json({ error: 'Pagamento não encontrado' });
    if (!pagamento.cliente) return res.status(400).json({ error: 'Cliente não encontrado' });

    const telefone = pagamento.cliente.telefone || pagamento.cliente.celular;
    if (!telefone) return res.status(400).json({ error: 'Cliente não possui telefone cadastrado' });

    const isConnected = await pagamentoService.verificarStatusWhatsApp();
    if (!isConnected) return res.status(503).json({ error: 'WhatsApp não está conectado' });

    const telefoneFormatado = pagamentoService.formatPhoneNumber(telefone);
    if (!telefoneFormatado) return res.status(400).json({ error: 'Número de telefone inválido' });

    const mensagem = pagamentoService.criarMensagemPagamento(pagamento, pagamento.cliente, pagamento.tipo);
    const result = await pagamentoService.enviarWhatsAppViaBaileys(telefoneFormatado, mensagem);

    if (result.success) res.json({ success: true, message: 'WhatsApp enviado com sucesso' });
    else res.status(500).json({ success: false, error: result.error });
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    res.status(500).json({ error: 'Erro ao enviar WhatsApp' });
  }
}

async function enviarEmail(req, res) {
  try {
    const { Pagamento, Cliente } = require('../models');
    const pagamento = await Pagamento.findByPk(req.params.id, {
      include: [{ model: Cliente, as: 'cliente' }]
    });
    if (!pagamento) return res.status(404).json({ error: 'Pagamento não encontrado' });

    const result = await mercadoPagoService.enviarEmail(pagamento, pagamento.cliente);
    res.json(result);
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({ error: 'Erro ao enviar email' });
  }
}

module.exports = {
  listarPagamentos,
  obterPagamento,
  atualizarPagamento,
  deletarPagamento,
  getWhatsAppStatus,
  getConfig,
  getMercadoPagoConfig,
  testMercadoPago,
  enviarWhatsApp,
  enviarEmail
};
