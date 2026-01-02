const express = require('express');
const { ClienteAluguel } = require('../models');

const router = express.Router();

// 1. Rota para adicionar cliente
router.post('/clientealuguel', async (req, res) => {
  const { nome, cpf, email, telefone, valor_aluguel, dia_vencimento } = req.body;

  try {
    const clienteAluguel = await ClienteAluguel.create({
      nome,
      cpf,
      email,
      telefone,
      valor_aluguel,
      dia_vencimento,
    });
    res.status(201).json(clienteAluguel);
  } catch (error) {
    console.error("Erro ao adicionar aluguel:", error);
    res.status(500).json({ error: "Erro ao adicionar aluguel." });
  }
});

// 2. Rota para listar todos os clientes SEM histórico
router.get('/clientealuguel', async (req, res) => {
  try {
    const clienteAlugueis = await ClienteAluguel.findAll();
    res.status(200).json(clienteAlugueis);
  } catch (error) {
    console.error("Erro ao listar alugueis:", error);
    res.status(500).json({ error: "Erro ao listar alugueis." });
  }
});

// 3. Rota para buscar cliente específico SEM histórico
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

// 4. Rota para ADICIONAR pagamento (usando JSON)
router.post('/clientealuguel/:id/pagamento', async (req, res) => {
  try {
    const cliente = await ClienteAluguel.findByPk(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const { data, valor, status, forma_pagamento } = req.body;
    const novoPagamento = { 
      id: Date.now(), // ID temporário baseado em timestamp
      data, 
      valor, 
      status, 
      forma_pagamento 
    };

    // Garante que historico_pagamentos é array
    if (!Array.isArray(cliente.historico_pagamentos)) {
      cliente.historico_pagamentos = [];
    }

    // Cria uma nova cópia do array e adiciona o pagamento
    const novoHistorico = [...cliente.historico_pagamentos, novoPagamento];
    
    // Atribui o novo array e marca como mudado
    cliente.historico_pagamentos = novoHistorico;
    cliente.changed('historico_pagamentos', true);
    
    await cliente.save();

    res.status(200).json(cliente);
  } catch (error) {
    console.error('Erro ao adicionar pagamento:', error);
    res.status(500).json({ error: 'Erro ao adicionar pagamento' });
  }
});

// 5. Rota para DELETAR pagamento (usando índice)
router.delete('/clientealuguel/:id/pagamento/:pagamentoId', async (req, res) => {
  try {
    console.log('DELETE chamado para:', req.params);
    
    const { id: clienteId, pagamentoId } = req.params;
    
    const cliente = await ClienteAluguel.findByPk(clienteId);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    if (!Array.isArray(cliente.historico_pagamentos)) {
      return res.status(400).json({ error: 'Histórico de pagamentos não encontrado' });
    }

    console.log('ANTES - Histórico:', cliente.historico_pagamentos);

    // Filtra removendo o pagamento com o ID específico
    const novoHistorico = cliente.historico_pagamentos.filter(pag => pag.id != pagamentoId);
    
    if (novoHistorico.length === cliente.historico_pagamentos.length) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    // Atribui o novo array e marca como mudado
    cliente.historico_pagamentos = novoHistorico;
    cliente.changed('historico_pagamentos', true);
    
    await cliente.save();

    console.log('DEPOIS - Histórico:', cliente.historico_pagamentos);

    res.status(200).json(cliente);
  } catch (error) {
    console.error('Erro ao deletar pagamento:', error);
    res.status(500).json({ error: 'Erro ao deletar pagamento' });
  }
});

// 6. Rota para atualizar cliente
router.put('/clientealuguel/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, cpf, email, telefone, valor_aluguel, dia_vencimento, pago, historico_pagamentos } = req.body;

  try {
    const [updated] = await ClienteAluguel.update(
      { nome, cpf, email, telefone, valor_aluguel, dia_vencimento, pago, historico_pagamentos },
      { where: { id: id } }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const updatedClienteAluguel = await ClienteAluguel.findByPk(id);
    res.status(200).json(updatedClienteAluguel);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro ao atualizar cliente.' });
  }
});

// 7. Rota para deletar cliente
router.delete('/clientealuguel/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await ClienteAluguel.destroy({
      where: { id: id }
    });

    if (!result) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ error: 'Erro ao excluir cliente.' });
  }
});

module.exports = router;
