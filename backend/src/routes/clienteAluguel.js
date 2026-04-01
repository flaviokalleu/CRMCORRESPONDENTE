const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { ClienteAluguel, CobrancaAluguel, Aluguel } = require('../models');
const asaasService = require('../services/asaasService');
const { calcularScoreInquilino } = require('../services/scoreInquilinoService');

const router = express.Router();

// ── Upload config for inquilino documents ──────────────────────────────────
const inquilinoUploadDir = path.join(__dirname, '../../uploads/clientes');
const fiadorUploadDir    = path.join(__dirname, '../../uploads/fiador_documentos');

[inquilinoUploadDir, fiadorUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const inquilinoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, file.fieldname === 'fiador_documento_id' ? fiadorUploadDir : inquilinoUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const inquilinoUpload = multer({
  storage: inquilinoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: 'documento_id',       maxCount: 1 },
  { name: 'contrato',           maxCount: 1 },
  { name: 'fiador_documento_id', maxCount: 1 },
]);

// 1. Rota para adicionar cliente + criar cliente e assinatura no Asaas
router.post('/clientealuguel', inquilinoUpload, async (req, res) => {
  const {
    nome, cpf, email, telefone,
    valor_aluguel, dia_vencimento,
    aluguel_id, data_inicio_contrato, data_fim_contrato, indice_reajuste,
    // novos campos
    data_nascimento, cidade_nascimento,
    tem_fiador,
    fiador_nome, fiador_telefone, fiador_email, fiador_cpf,
    fiador_data_nascimento, fiador_cidade_nascimento,
  } = req.body;

  const documento_id_path     = req.files?.documento_id?.[0]?.path || null;
  const contrato_path         = req.files?.contrato?.[0]?.path || null;
  const fiador_documento_id_path = req.files?.fiador_documento_id?.[0]?.path || null;

  try {
    const clienteAluguel = await ClienteAluguel.create({
      nome:      nome      || null,
      cpf:       cpf       || null,
      email:     email     || null,
      telefone:  telefone  || null,
      valor_aluguel:  valor_aluguel  ? parseFloat(valor_aluguel)  : 0,
      dia_vencimento: dia_vencimento ? parseInt(dia_vencimento, 10) : 1,
      aluguel_id: aluguel_id || null,
      data_inicio_contrato: data_inicio_contrato || null,
      data_fim_contrato:    data_fim_contrato    || null,
      indice_reajuste:      indice_reajuste      || 'IGPM',
      // novos campos
      data_nascimento:       data_nascimento       || null,
      cidade_nascimento:     cidade_nascimento     || null,
      tem_fiador:            tem_fiador === 'true' || tem_fiador === true,
      fiador_nome:           fiador_nome           || null,
      fiador_telefone:       fiador_telefone       || null,
      fiador_email:          fiador_email          || null,
      fiador_cpf:            fiador_cpf            || null,
      fiador_data_nascimento: fiador_data_nascimento || null,
      fiador_cidade_nascimento: fiador_cidade_nascimento || null,
      documento_id_path,
      contrato_path,
      fiador_documento_id_path,
    });

    // Tentar criar cliente e assinatura no Asaas (não bloqueia se falhar)
    try {
      if (asaasService.ASAAS_API_KEY) {
        // Criar cliente no Asaas
        const asaasCustomer = await asaasService.criarCliente({
          name: nome,
          cpfCnpj: cpf,
          email,
          phone: telefone,
        });

        clienteAluguel.asaas_customer_id = asaasCustomer.id;

        // Criar assinatura recorrente
        const nextDueDate = asaasService.calcularProximoVencimento(dia_vencimento);
        const asaasSubscription = await asaasService.criarAssinatura({
          customer: asaasCustomer.id,
          value: valor_aluguel,
          nextDueDate,
          description: `Aluguel - ${nome}`,
        });

        clienteAluguel.asaas_subscription_id = asaasSubscription.id;
        clienteAluguel.asaas_subscription_status = 'ACTIVE';

        await clienteAluguel.save();
        console.log('Cliente e assinatura Asaas criados com sucesso');
      }
    } catch (asaasError) {
      console.error('Erro ao integrar com Asaas (cliente criado sem Asaas):', asaasError.message);
      // O cliente foi criado no DB local, admin pode sincronizar depois
    }

    res.status(201).json(clienteAluguel);
  } catch (error) {
    console.error("Erro ao adicionar aluguel:", error.message, error.errors);
    res.status(500).json({
      error: "Erro ao adicionar aluguel.",
      details: process.env.NODE_ENV !== 'production' ? (error.errors?.map(e => e.message) || error.message) : undefined,
    });
  }
});

// 2. Rota para listar todos os clientes
router.get('/clientealuguel', async (req, res) => {
  try {
    const clienteAlugueis = await ClienteAluguel.findAll();
    res.status(200).json(clienteAlugueis);
  } catch (error) {
    console.error("Erro ao listar alugueis:", error);
    res.status(500).json({ error: "Erro ao listar alugueis." });
  }
});

// 3. Rota para buscar cliente específico
router.get('/clientealuguel/:id', async (req, res) => {
  try {
    const cliente = await ClienteAluguel.findByPk(req.params.id);

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.status(200).json(cliente);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    res.status(500).json({ error: "Erro ao buscar cliente." });
  }
});

// 4. Rota para ADICIONAR pagamento manual (usando JSON)
router.post('/clientealuguel/:id/pagamento', async (req, res) => {
  try {
    const cliente = await ClienteAluguel.findByPk(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const { data, valor, status, forma_pagamento } = req.body;
    const novoPagamento = {
      id: Date.now(),
      data,
      valor,
      status,
      forma_pagamento
    };

    if (!Array.isArray(cliente.historico_pagamentos)) {
      cliente.historico_pagamentos = [];
    }

    const novoHistorico = [...cliente.historico_pagamentos, novoPagamento];

    cliente.historico_pagamentos = novoHistorico;
    cliente.changed('historico_pagamentos', true);

    await cliente.save();

    res.status(200).json(cliente);
  } catch (error) {
    console.error('Erro ao adicionar pagamento:', error);
    res.status(500).json({ error: 'Erro ao adicionar pagamento' });
  }
});

// 5. Rota para DELETAR pagamento manual (usando índice)
router.delete('/clientealuguel/:id/pagamento/:pagamentoId', async (req, res) => {
  try {
    const { id: clienteId, pagamentoId } = req.params;

    const cliente = await ClienteAluguel.findByPk(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    if (!Array.isArray(cliente.historico_pagamentos)) {
      return res.status(400).json({ error: 'Histórico de pagamentos não encontrado' });
    }

    const novoHistorico = cliente.historico_pagamentos.filter(pag => pag.id != pagamentoId);

    if (novoHistorico.length === cliente.historico_pagamentos.length) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    cliente.historico_pagamentos = novoHistorico;
    cliente.changed('historico_pagamentos', true);

    await cliente.save();

    res.status(200).json(cliente);
  } catch (error) {
    console.error('Erro ao deletar pagamento:', error);
    res.status(500).json({ error: 'Erro ao deletar pagamento' });
  }
});

// 6. Rota para atualizar cliente + atualizar assinatura Asaas se valor mudou
router.put('/clientealuguel/:id', inquilinoUpload, async (req, res) => {
  const { id } = req.params;
  const {
    nome, cpf, email, telefone,
    valor_aluguel, dia_vencimento, pago, historico_pagamentos,
    data_nascimento, cidade_nascimento,
    tem_fiador,
    fiador_nome, fiador_telefone, fiador_email, fiador_cpf,
    fiador_data_nascimento, fiador_cidade_nascimento,
    // proprietário e repasse
    proprietario_nome, proprietario_telefone, proprietario_pix,
    taxa_administracao,
    // corretor
    corretor_nome, corretor_pix, corretor_percentual,
  } = req.body;

  try {
    const clienteAtual = await ClienteAluguel.findByPk(id);
    if (!clienteAtual) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const f = (v, fallback) => (v !== undefined ? (v || null) : fallback);

    const updateData = {
      nome,
      cpf,
      email,
      telefone,
      valor_aluguel:  valor_aluguel  != null ? parseFloat(valor_aluguel)  : clienteAtual.valor_aluguel,
      dia_vencimento: dia_vencimento != null ? parseInt(dia_vencimento, 10) : clienteAtual.dia_vencimento,
      pago,
      historico_pagamentos,
      data_nascimento:          f(data_nascimento,          clienteAtual.data_nascimento),
      cidade_nascimento:        f(cidade_nascimento,        clienteAtual.cidade_nascimento),
      tem_fiador:               tem_fiador !== undefined ? (tem_fiador === 'true' || tem_fiador === true) : clienteAtual.tem_fiador,
      fiador_nome:              f(fiador_nome,              clienteAtual.fiador_nome),
      fiador_telefone:          f(fiador_telefone,          clienteAtual.fiador_telefone),
      fiador_email:             f(fiador_email,             clienteAtual.fiador_email),
      fiador_cpf:               f(fiador_cpf,               clienteAtual.fiador_cpf),
      fiador_data_nascimento:   f(fiador_data_nascimento,   clienteAtual.fiador_data_nascimento),
      fiador_cidade_nascimento: f(fiador_cidade_nascimento, clienteAtual.fiador_cidade_nascimento),
      // proprietário
      proprietario_nome:     f(proprietario_nome,     clienteAtual.proprietario_nome),
      proprietario_telefone: f(proprietario_telefone, clienteAtual.proprietario_telefone),
      proprietario_pix:      f(proprietario_pix,      clienteAtual.proprietario_pix),
      taxa_administracao:    taxa_administracao != null ? parseFloat(taxa_administracao) : clienteAtual.taxa_administracao,
      // corretor
      corretor_nome:       f(corretor_nome,       clienteAtual.corretor_nome),
      corretor_pix:        f(corretor_pix,        clienteAtual.corretor_pix),
      corretor_percentual: corretor_percentual != null ? parseFloat(corretor_percentual) : clienteAtual.corretor_percentual,
    };

    if (req.files?.documento_id?.[0])        updateData.documento_id_path        = req.files.documento_id[0].path;
    if (req.files?.contrato?.[0])            updateData.contrato_path             = req.files.contrato[0].path;
    if (req.files?.fiador_documento_id?.[0]) updateData.fiador_documento_id_path  = req.files.fiador_documento_id[0].path;

    await ClienteAluguel.update(updateData, { where: { id } });

    // Se o valor do aluguel mudou e tem assinatura Asaas, atualizar
    if (valor_aluguel && clienteAtual.asaas_subscription_id &&
        parseFloat(valor_aluguel) !== parseFloat(clienteAtual.valor_aluguel)) {
      try {
        await asaasService.atualizarAssinatura(clienteAtual.asaas_subscription_id, {
          value: parseFloat(valor_aluguel),
        });
        console.log('Assinatura Asaas atualizada com novo valor:', valor_aluguel);
      } catch (asaasError) {
        console.error('Erro ao atualizar assinatura Asaas:', asaasError.message);
      }
    }

    const updatedClienteAluguel = await ClienteAluguel.findByPk(id);
    res.status(200).json(updatedClienteAluguel);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro ao atualizar cliente.' });
  }
});

// 7. Rota para deletar cliente + cancelar assinatura Asaas
router.delete('/clientealuguel/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const cliente = await ClienteAluguel.findByPk(id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    // Cancelar assinatura no Asaas se existir
    if (cliente.asaas_subscription_id) {
      try {
        await asaasService.cancelarAssinatura(cliente.asaas_subscription_id);
        console.log('Assinatura Asaas cancelada:', cliente.asaas_subscription_id);
      } catch (asaasError) {
        console.error('Erro ao cancelar assinatura Asaas:', asaasError.message);
      }
    }

    // Deletar cobranças relacionadas
    await CobrancaAluguel.destroy({ where: { cliente_aluguel_id: id } });

    await cliente.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ error: 'Erro ao excluir cliente.' });
  }
});

// ===== NOVAS ROTAS ASAAS =====

// 8. Gerar cobrança avulsa
router.post('/clientealuguel/:id/cobranca-avulsa', async (req, res) => {
  try {
    const cliente = await ClienteAluguel.findByPk(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    if (!cliente.asaas_customer_id) {
      return res.status(400).json({ error: 'Cliente não possui cadastro no Asaas. Sincronize primeiro.' });
    }

    const { valor, data_vencimento, descricao } = req.body;

    const asaasPayment = await asaasService.criarCobrancaAvulsa({
      customer: cliente.asaas_customer_id,
      value: valor || cliente.valor_aluguel,
      dueDate: data_vencimento,
      description: descricao || `Cobranca avulsa - ${cliente.nome}`,
    });

    const cobranca = await CobrancaAluguel.create({
      cliente_aluguel_id: cliente.id,
      asaas_payment_id: asaasPayment.id,
      valor: asaasPayment.value,
      data_vencimento: asaasPayment.dueDate,
      status: 'PENDING',
      billing_type: asaasPayment.billingType || 'UNDEFINED',
      invoice_url: asaasPayment.invoiceUrl || null,
      bank_slip_url: asaasPayment.bankSlipUrl || null,
      tipo: 'avulso',
      descricao: descricao || `Cobranca avulsa - ${cliente.nome}`,
    });

    res.status(201).json(cobranca);
  } catch (error) {
    console.error('Erro ao gerar cobranca avulsa:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar cobranca avulsa' });
  }
});

// 9. Listar cobranças de um cliente
router.get('/clientealuguel/:id/cobrancas', async (req, res) => {
  try {
    const cobrancas = await CobrancaAluguel.findAll({
      where: { cliente_aluguel_id: req.params.id },
      order: [['data_vencimento', 'DESC']],
    });

    res.status(200).json(cobrancas);
  } catch (error) {
    console.error('Erro ao listar cobrancas:', error);
    res.status(500).json({ error: 'Erro ao listar cobrancas' });
  }
});

// 10. Sincronizar cliente com Asaas (caso tenha falhado na criação)
router.post('/clientealuguel/:id/sincronizar-asaas', async (req, res) => {
  try {
    const cliente = await ClienteAluguel.findByPk(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    if (!asaasService.ASAAS_API_KEY) {
      return res.status(400).json({ error: 'ASAAS_API_KEY não configurado' });
    }

    // Criar cliente no Asaas se não existir
    if (!cliente.asaas_customer_id) {
      const asaasCustomer = await asaasService.criarCliente({
        name: cliente.nome,
        cpfCnpj: cliente.cpf,
        email: cliente.email,
        phone: cliente.telefone,
      });
      cliente.asaas_customer_id = asaasCustomer.id;
    }

    // Criar assinatura se não existir
    if (!cliente.asaas_subscription_id) {
      const nextDueDate = asaasService.calcularProximoVencimento(cliente.dia_vencimento);
      const asaasSubscription = await asaasService.criarAssinatura({
        customer: cliente.asaas_customer_id,
        value: cliente.valor_aluguel,
        nextDueDate,
        description: `Aluguel - ${cliente.nome}`,
      });
      cliente.asaas_subscription_id = asaasSubscription.id;
      cliente.asaas_subscription_status = 'ACTIVE';
    }

    await cliente.save();

    // Sincronizar cobranças existentes no Asaas
    if (cliente.asaas_subscription_id) {
      try {
        const pagamentosAsaas = await asaasService.listarCobrancasPorAssinatura(cliente.asaas_subscription_id);

        if (pagamentosAsaas.data && pagamentosAsaas.data.length > 0) {
          for (const pagamento of pagamentosAsaas.data) {
            const existe = await CobrancaAluguel.findOne({
              where: { asaas_payment_id: pagamento.id },
            });

            if (!existe) {
              await CobrancaAluguel.create({
                cliente_aluguel_id: cliente.id,
                asaas_payment_id: pagamento.id,
                valor: pagamento.value,
                data_vencimento: pagamento.dueDate,
                data_pagamento: pagamento.paymentDate || null,
                status: mapAsaasStatus(pagamento.status),
                billing_type: pagamento.billingType || 'UNDEFINED',
                invoice_url: pagamento.invoiceUrl || null,
                bank_slip_url: pagamento.bankSlipUrl || null,
                tipo: 'recorrente',
                descricao: pagamento.description || 'Aluguel mensal',
              });
            }
          }
        }
      } catch (syncError) {
        console.error('Erro ao sincronizar cobrancas:', syncError.message);
      }
    }

    res.status(200).json(cliente);
  } catch (error) {
    console.error('Erro ao sincronizar com Asaas:', error);
    res.status(500).json({ error: error.message || 'Erro ao sincronizar com Asaas' });
  }
});

// Helper para mapear status do Asaas para o status local
function mapAsaasStatus(asaasStatus) {
  const statusMap = {
    'PENDING': 'PENDING',
    'RECEIVED': 'CONFIRMED',
    'CONFIRMED': 'CONFIRMED',
    'OVERDUE': 'OVERDUE',
    'REFUNDED': 'REFUNDED',
    'RECEIVED_IN_CASH': 'CONFIRMED',
    'REFUND_REQUESTED': 'REFUNDED',
    'CHARGEBACK_REQUESTED': 'REFUNDED',
    'CHARGEBACK_DISPUTE': 'REFUNDED',
    'AWAITING_CHARGEBACK_REVERSAL': 'PENDING',
    'DUNNING_REQUESTED': 'OVERDUE',
    'DUNNING_RECEIVED': 'CONFIRMED',
    'AWAITING_RISK_ANALYSIS': 'PENDING',
  };
  return statusMap[asaasStatus] || 'PENDING';
}

// 11. Recalcular score de um inquilino
router.post('/clientealuguel/:id/score', async (req, res) => {
  try {
    const cliente = await ClienteAluguel.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente nao encontrado' });

    const cobrancas = await CobrancaAluguel.findAll({
      where: { cliente_aluguel_id: cliente.id },
    });

    const resultado = await calcularScoreInquilino(cliente, cobrancas);

    await cliente.update({
      score_inquilino: resultado.score,
      score_detalhes: resultado,
      score_atualizado_em: new Date(),
    });

    res.status(200).json(resultado);
  } catch (error) {
    console.error('Erro ao calcular score:', error);
    res.status(500).json({ error: 'Erro ao calcular score' });
  }
});

// 12. Listar imoveis disponiveis para vincular
router.get('/alugueis-disponiveis', async (req, res) => {
  try {
    const imoveis = await Aluguel.findAll();
    res.status(200).json(imoveis);
  } catch (error) {
    console.error('Erro ao listar imoveis:', error);
    res.status(500).json({ error: 'Erro ao listar imoveis' });
  }
});

module.exports = router;
