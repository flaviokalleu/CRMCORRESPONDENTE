'use strict';

const { Cliente, User, Imovel, Aluguel, Tenant } = require('../models');

/**
 * Resolve se uma feature está habilitada, respeitando override do tenant.
 * Padrão Evoticket: se tenant.use_custom_modules=true, usa flag do tenant;
 * caso contrário, herda do plano.
 */
const isFeatureEnabled = (tenant, plan, featureName) => {
  if (tenant?.use_custom_modules && tenant[featureName] !== null && tenant[featureName] !== undefined) {
    return tenant[featureName];
  }
  return plan ? (plan[featureName] || false) : false;
};

/**
 * Resolve o limite efetivo (tenant override > plano).
 * Limites do tenant são SEMPRE respeitados se definidos, independente de use_custom_modules.
 */
const getEffectiveLimit = (tenant, plan, field) => {
  if (tenant && tenant[field] !== null && tenant[field] !== undefined) {
    return tenant[field];
  }
  return plan ? (plan[field] || 0) : 0;
};

/**
 * Verifica se uma feature está habilitada (respeita override do tenant).
 * Uso: router.post('/enviar', checkFeature('has_whatsapp'), controller)
 */
const checkFeature = (featureName) => {
  return async (req, res, next) => {
    // Super admin sempre tem acesso
    if (req.isSuperAdmin) return next();

    if (!req.plan) {
      return res.status(402).json({
        error: 'Plano não encontrado',
        message: 'Configure uma assinatura para acessar este recurso.',
        code: 'NO_PLAN'
      });
    }

    // Buscar tenant para verificar override
    let tenant = req.tenant;
    if (!tenant && req.tenantId) {
      tenant = await Tenant.findByPk(req.tenantId);
    }

    if (!isFeatureEnabled(tenant, req.plan, featureName)) {
      return res.status(403).json({
        error: 'Recurso não disponível',
        message: `Este recurso não está disponível no plano ${req.plan.nome}. Faça upgrade para ter acesso.`,
        code: 'FEATURE_NOT_AVAILABLE',
        feature: featureName,
        plano_atual: req.plan.slug,
        upgrade_necessario: true
      });
    }

    next();
  };
};

/**
 * Verifica limites quantitativos do plano.
 * Uso: router.post('/clientes', checkLimit('clientes'), controller)
 *
 * Tipos suportados: 'clientes', 'usuarios', 'imoveis', 'alugueis'
 */
const checkLimit = (resourceType) => {
  return async (req, res, next) => {
    // Super admin sempre tem acesso
    if (req.isSuperAdmin) return next();

    if (!req.plan) {
      return res.status(402).json({
        error: 'Plano não encontrado',
        message: 'Configure uma assinatura para acessar este recurso.',
        code: 'NO_PLAN'
      });
    }

    const limitMap = {
      clientes: { field: 'max_clientes', model: Cliente, label: 'clientes' },
      usuarios: { field: 'max_usuarios', model: User, label: 'usuários' },
      imoveis: { field: 'max_imoveis', model: Imovel, label: 'imóveis' },
      alugueis: { field: 'max_alugueis', model: Aluguel, label: 'aluguéis' }
    };

    const config = limitMap[resourceType];
    if (!config) return next();

    // Buscar tenant para verificar override de limite
    let tenant = req.tenant;
    if (!tenant && req.tenantId) {
      tenant = await Tenant.findByPk(req.tenantId);
    }

    const maxAllowed = getEffectiveLimit(tenant, req.plan, config.field);

    // 0 = ilimitado
    if (maxAllowed === 0) return next();

    try {
      const currentCount = await config.model.count({
        where: { tenant_id: req.tenantId }
      });

      if (currentCount >= maxAllowed) {
        return res.status(403).json({
          error: 'Limite atingido',
          message: `Você atingiu o limite de ${maxAllowed} ${config.label}. Faça upgrade para adicionar mais.`,
          code: 'LIMIT_REACHED',
          resource: resourceType,
          limite: maxAllowed,
          atual: currentCount,
          plano_atual: req.plan.slug,
          upgrade_necessario: true
        });
      }

      req.resourceUsage = {
        type: resourceType,
        current: currentCount,
        max: maxAllowed,
        remaining: maxAllowed - currentCount
      };

      next();
    } catch (error) {
      console.error(`Erro ao verificar limite de ${resourceType}:`, error);
      next();
    }
  };
};

/**
 * Middleware que retorna info de uso do plano na resposta.
 * Útil para o frontend exibir "X de Y clientes utilizados".
 */
const getPlanUsage = async (req, res) => {
  try {
    if (!req.plan) {
      return res.status(402).json({ error: 'Plano não encontrado' });
    }

    // Buscar tenant para resolver overrides
    let tenant = req.tenant;
    if (!tenant && req.tenantId) {
      tenant = await Tenant.findByPk(req.tenantId);
    }

    const [clientes, usuarios, imoveis, alugueis] = await Promise.all([
      Cliente.count({ where: { tenant_id: req.tenantId } }),
      User.count({ where: { tenant_id: req.tenantId } }),
      Imovel.count({ where: { tenant_id: req.tenantId } }),
      Aluguel.count({ where: { tenant_id: req.tenantId } })
    ]);

    const limClientes = getEffectiveLimit(tenant, req.plan, 'max_clientes');
    const limUsuarios = getEffectiveLimit(tenant, req.plan, 'max_usuarios');
    const limImoveis = getEffectiveLimit(tenant, req.plan, 'max_imoveis');
    const limAlugueis = getEffectiveLimit(tenant, req.plan, 'max_alugueis');

    res.json({
      plano: {
        nome: req.plan.nome,
        slug: req.plan.slug
      },
      uso: {
        clientes: { atual: clientes, limite: limClientes || 'Ilimitado' },
        usuarios: { atual: usuarios, limite: limUsuarios || 'Ilimitado' },
        imoveis: { atual: imoveis, limite: limImoveis || 'Ilimitado' },
        alugueis: { atual: alugueis, limite: limAlugueis || 'Ilimitado' }
      },
      features: {
        whatsapp: isFeatureEnabled(tenant, req.plan, 'has_whatsapp'),
        pagamentos: isFeatureEnabled(tenant, req.plan, 'has_pagamentos'),
        ai_analysis: isFeatureEnabled(tenant, req.plan, 'has_ai_analysis'),
        relatorios_avancados: isFeatureEnabled(tenant, req.plan, 'has_relatorios_avancados'),
        multi_usuarios: isFeatureEnabled(tenant, req.plan, 'has_multi_usuarios'),
        api_access: isFeatureEnabled(tenant, req.plan, 'has_api_access'),
        suporte_prioritario: isFeatureEnabled(tenant, req.plan, 'has_suporte_prioritario'),
        dominio_customizado: isFeatureEnabled(tenant, req.plan, 'has_dominio_customizado')
      },
      modulos_customizados: tenant?.use_custom_modules || false,
      subscription: req.subscription ? {
        status: req.subscription.status,
        ciclo: req.subscription.ciclo,
        dias_restantes: req.subscription.daysRemaining()
      } : null
    });
  } catch (error) {
    console.error('Erro ao obter uso do plano:', error);
    res.status(500).json({ error: 'Erro ao obter informações do plano' });
  }
};

module.exports = {
  checkFeature,
  checkLimit,
  getPlanUsage,
  isFeatureEnabled,
  getEffectiveLimit
};
