'use strict';

const { Tenant, Subscription, Plan } = require('../models');

/**
 * Middleware que resolve o tenant a partir do req.user (após authenticateToken).
 * Seta req.tenantId e req.tenant com os dados do tenant ativo.
 */
const resolveTenant = async (req, res, next) => {
  try {
    // Super admin pode acessar sem tenant específico ou com header X-Tenant-Id
    if (req.user && req.user.is_super_admin) {
      const headerTenantId = req.headers['x-tenant-id'];
      if (headerTenantId) {
        req.tenantId = parseInt(headerTenantId, 10);
      } else {
        req.tenantId = req.user.tenant_id;
      }
      req.isSuperAdmin = true;
      return next();
    }

    if (!req.user || !req.user.tenant_id) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Usuário não está vinculado a nenhuma organização'
      });
    }

    const tenant = await Tenant.findByPk(req.user.tenant_id);

    if (!tenant) {
      return res.status(404).json({
        error: 'Organização não encontrada',
        message: 'A organização vinculada ao seu usuário não existe'
      });
    }

    if (!tenant.ativo) {
      return res.status(403).json({
        error: 'Organização inativa',
        message: 'Sua organização está suspensa. Entre em contato com o suporte.'
      });
    }

    req.tenantId = tenant.id;
    req.tenant = tenant;
    req.isSuperAdmin = false;

    next();
  } catch (error) {
    console.error('Erro no middleware de tenant:', error);
    res.status(500).json({ error: 'Erro interno ao resolver organização' });
  }
};

/**
 * Middleware que verifica se a assinatura do tenant está ativa.
 * Deve ser usado após resolveTenant.
 */
const checkSubscription = async (req, res, next) => {
  try {
    // Super admin sempre tem acesso
    if (req.isSuperAdmin) return next();

    const subscription = await Subscription.findOne({
      where: {
        tenant_id: req.tenantId,
        status: ['active', 'trialing']
      },
      include: [{ model: Plan, as: 'plan' }],
      order: [['created_at', 'DESC']]
    });

    if (!subscription) {
      return res.status(402).json({
        error: 'Assinatura inativa',
        message: 'Sua organização não possui uma assinatura ativa. Escolha um plano para continuar.',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    if (!subscription.isActive()) {
      return res.status(402).json({
        error: 'Assinatura expirada',
        message: 'Sua assinatura expirou. Renove para continuar usando o sistema.',
        code: 'SUBSCRIPTION_EXPIRED',
        dias_restantes: 0
      });
    }

    req.subscription = subscription;
    req.plan = subscription.plan;

    next();
  } catch (error) {
    console.error('Erro ao verificar assinatura:', error);
    res.status(500).json({ error: 'Erro interno ao verificar assinatura' });
  }
};

/**
 * Helper: adiciona filtro tenant_id em queries Sequelize.
 * Uso: const where = addTenantFilter(req, { status: 'active' });
 */
const addTenantFilter = (req, where = {}) => {
  if (req.tenantId) {
    where.tenant_id = req.tenantId;
  }
  return where;
};

/**
 * Helper: adiciona tenant_id em dados para criação.
 * Uso: const data = addTenantToData(req, { nome: 'Fulano' });
 */
const addTenantToData = (req, data = {}) => {
  if (req.tenantId) {
    data.tenant_id = req.tenantId;
  }
  return data;
};

/**
 * Middleware que verifica se super admin (dono da plataforma).
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_super_admin) {
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Apenas administradores da plataforma podem acessar este recurso'
    });
  }
  next();
};

module.exports = {
  resolveTenant,
  checkSubscription,
  addTenantFilter,
  addTenantToData,
  requireSuperAdmin
};
