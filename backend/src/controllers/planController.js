'use strict';

const planService = require('../services/planService');

async function listPlans(req, res) {
  try {
    const plans = await planService.listPlans();
    res.json(plans);
  } catch (error) {
    console.error('Erro ao listar planos:', error);
    res.status(500).json({ error: 'Erro ao listar planos' });
  }
}

async function createPlan(req, res) {
  try {
    const plan = await planService.createPlan(req.body);
    res.status(201).json(plan);
  } catch (error) {
    console.error('Erro ao criar plano:', error);
    res.status(500).json({ error: 'Erro ao criar plano' });
  }
}

async function updatePlan(req, res) {
  try {
    const plan = await planService.updatePlan(req.params.id, req.body);
    if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
    res.json(plan);
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
}

async function listSubscriptions(req, res) {
  try {
    const subscriptions = await planService.listSubscriptions(req.query);
    res.json(subscriptions);
  } catch (error) {
    console.error('Erro ao listar assinaturas:', error);
    res.status(500).json({ error: 'Erro ao listar assinaturas' });
  }
}

async function changePlan(req, res) {
  try {
    const { plan_id, ciclo } = req.body;
    const subscription = await planService.changePlan(req.params.tenantId, plan_id, ciclo);
    if (!subscription) return res.status(404).json({ error: 'Plano não encontrado' });
    res.json(subscription);
  } catch (error) {
    console.error('Erro ao alterar plano:', error);
    res.status(500).json({ error: 'Erro ao alterar plano' });
  }
}

module.exports = {
  listPlans,
  createPlan,
  updatePlan,
  listSubscriptions,
  changePlan
};
