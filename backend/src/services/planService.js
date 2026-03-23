'use strict';

const { Plan, Subscription, Tenant } = require('../models');

/**
 * Listar todos os planos ordenados.
 */
async function listPlans() {
  return Plan.findAll({ order: [['ordem', 'ASC']] });
}

/**
 * Criar plano.
 */
async function createPlan(data) {
  return Plan.create(data);
}

/**
 * Atualizar plano.
 */
async function updatePlan(id, data) {
  const plan = await Plan.findByPk(id);
  if (!plan) return null;
  await plan.update(data);
  return plan;
}

/**
 * Listar assinaturas com filtros opcionais.
 */
async function listSubscriptions({ status, tenant_id } = {}) {
  const where = {};
  if (status) where.status = status;
  if (tenant_id) where.tenant_id = tenant_id;

  return Subscription.findAll({
    where,
    include: [
      { model: Tenant, as: 'tenant' },
      { model: Plan, as: 'plan' }
    ],
    order: [['created_at', 'DESC']]
  });
}

/**
 * Alterar plano de um tenant (cancela anterior, cria nova assinatura).
 */
async function changePlan(tenantId, plan_id, ciclo) {
  const plan = await Plan.findByPk(plan_id);
  if (!plan) return null;

  // Cancelar assinatura anterior
  await Subscription.update(
    { status: 'canceled', cancelado_em: new Date() },
    { where: { tenant_id: tenantId, status: ['active', 'trialing'] } }
  );

  // Criar nova assinatura
  const valor = ciclo === 'anual' ? plan.preco_anual : plan.preco_mensal;
  return Subscription.create({
    tenant_id: tenantId,
    plan_id: plan.id,
    status: 'active',
    ciclo: ciclo || 'mensal',
    data_inicio: new Date(),
    valor
  });
}

module.exports = {
  listPlans,
  createPlan,
  updatePlan,
  listSubscriptions,
  changePlan
};
