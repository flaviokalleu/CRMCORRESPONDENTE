const express = require('express');
const path = require('path');
const fs = require('fs');
const { ClienteAluguel, Aluguel } = require('../models');
const contratoService = require('../services/contratoService');
const asaasService = require('../services/asaasService');

const router = express.Router();

// POST /api/clientealuguel/:id/contrato — Gera contrato PDF
router.post('/clientealuguel/:id/contrato', async (req, res) => {
  try {
    const cliente = await ClienteAluguel.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente nao encontrado' });

    let aluguel = null;
    if (cliente.aluguel_id) {
      aluguel = await Aluguel.findByPk(cliente.aluguel_id);
    }

    const resultado = await contratoService.gerarContratoPDF(cliente, aluguel);

    res.status(200).json({
      message: 'Contrato gerado com sucesso',
      ...resultado,
    });
  } catch (error) {
    console.error('Erro ao gerar contrato:', error);
    res.status(500).json({ error: 'Erro ao gerar contrato PDF' });
  }
});

// GET /api/clientealuguel/:id/contrato — Baixa ultimo contrato PDF
router.get('/clientealuguel/:id/contrato', async (req, res) => {
  try {
    const clienteDir = path.resolve(__dirname, `../../uploads/contratos/${req.params.id}`);

    if (!fs.existsSync(clienteDir)) {
      return res.status(404).json({ error: 'Nenhum contrato encontrado' });
    }

    const arquivos = fs.readdirSync(clienteDir)
      .filter(f => f.endsWith('.pdf'))
      .sort()
      .reverse();

    if (arquivos.length === 0) {
      return res.status(404).json({ error: 'Nenhum contrato encontrado' });
    }

    const caminhoArquivo = path.join(clienteDir, arquivos[0]);
    res.download(caminhoArquivo, arquivos[0]);
  } catch (error) {
    console.error('Erro ao baixar contrato:', error);
    res.status(500).json({ error: 'Erro ao baixar contrato' });
  }
});

// GET /api/clientealuguel/:id/reajuste — Simula reajuste
router.get('/clientealuguel/:id/reajuste', async (req, res) => {
  try {
    const cliente = await ClienteAluguel.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente nao encontrado' });

    const indiceAnual = req.query.indice ? parseFloat(req.query.indice) : null;
    const reajuste = contratoService.calcularReajuste(cliente, indiceAnual);

    res.status(200).json(reajuste);
  } catch (error) {
    console.error('Erro ao calcular reajuste:', error);
    res.status(500).json({ error: 'Erro ao calcular reajuste' });
  }
});

// POST /api/clientealuguel/:id/reajuste/aplicar — Aplica reajuste
router.post('/clientealuguel/:id/reajuste/aplicar', async (req, res) => {
  try {
    const cliente = await ClienteAluguel.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: 'Cliente nao encontrado' });

    const { indice } = req.body;
    const reajuste = contratoService.calcularReajuste(cliente, indice);

    // Atualizar valor do aluguel
    const valorAntigo = parseFloat(cliente.valor_aluguel);
    await cliente.update({ valor_aluguel: reajuste.valor_reajustado });

    // Atualizar assinatura no Asaas se existir
    if (cliente.asaas_subscription_id) {
      try {
        await asaasService.atualizarAssinatura(cliente.asaas_subscription_id, {
          value: reajuste.valor_reajustado,
        });
      } catch (asaasError) {
        console.error('Erro ao atualizar assinatura Asaas no reajuste:', asaasError.message);
      }
    }

    res.status(200).json({
      message: 'Reajuste aplicado com sucesso',
      valor_anterior: valorAntigo,
      valor_novo: reajuste.valor_reajustado,
      indice_aplicado: reajuste.indice_percentual,
    });
  } catch (error) {
    console.error('Erro ao aplicar reajuste:', error);
    res.status(500).json({ error: 'Erro ao aplicar reajuste' });
  }
});

module.exports = router;
