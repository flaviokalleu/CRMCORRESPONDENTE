'use strict';

const { Tenant, User, Plan, Subscription, Cliente, Imovel, Aluguel } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const TENANT_INCLUDE = [{
  model: Subscription,
  as: 'subscriptions',
  include: [{ model: Plan, as: 'plan' }],
  order: [['created_at', 'DESC']],
  limit: 1
}];

const MODULE_FIELDS = [
  'has_whatsapp', 'has_pagamentos', 'has_ai_analysis',
  'has_relatorios_avancados', 'has_multi_usuarios', 'has_api_access',
  'has_suporte_prioritario', 'has_dominio_customizado'
];

const LIMIT_FIELDS = ['max_clientes', 'max_usuarios', 'max_imoveis', 'max_alugueis'];
const STORAGE_FIELDS = ['max_storage_mb', 'max_file_size_mb'];

const ALLOWED_UPDATE_FIELDS = [
  'nome', 'cnpj', 'email', 'telefone', 'ativo', 'configuracoes',
  'dominio_customizado', 'endereco', 'cidade', 'estado', 'cep',
  'use_custom_modules',
  ...LIMIT_FIELDS,
  ...STORAGE_FIELDS,
  ...MODULE_FIELDS
];

/**
 * Listar tenants com paginação, busca e stats.
 */
async function listTenants({ page = 1, limit = 20, search, ativo }) {
  const offset = (page - 1) * limit;

  const where = {};
  if (search) {
    where[Op.or] = [
      { nome: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { cnpj: { [Op.iLike]: `%${search}%` } }
    ];
  }
  if (ativo !== undefined) {
    where.ativo = ativo === 'true';
  }

  const { rows: tenants, count } = await Tenant.findAndCountAll({
    where,
    include: TENANT_INCLUDE,
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  const tenantsWithStats = await Promise.all(
    tenants.map(async (tenant) => {
      const [clientes, usuarios, imoveis] = await Promise.all([
        Cliente.count({ where: { tenant_id: tenant.id } }),
        User.count({ where: { tenant_id: tenant.id } }),
        Imovel.count({ where: { tenant_id: tenant.id } })
      ]);
      return { ...tenant.toJSON(), stats: { clientes, usuarios, imoveis } };
    })
  );

  return {
    tenants: tenantsWithStats,
    total: count,
    page: parseInt(page),
    totalPages: Math.ceil(count / limit)
  };
}

/**
 * Detalhes de um tenant com stats completas.
 */
async function getTenantDetails(id) {
  const tenant = await Tenant.findByPk(id, {
    include: [{
      model: Subscription,
      as: 'subscriptions',
      include: [{ model: Plan, as: 'plan' }],
      order: [['created_at', 'DESC']]
    }]
  });

  if (!tenant) return null;

  const [clientes, usuarios, imoveis, alugueis] = await Promise.all([
    Cliente.count({ where: { tenant_id: tenant.id } }),
    User.count({ where: { tenant_id: tenant.id } }),
    Imovel.count({ where: { tenant_id: tenant.id } }),
    Aluguel.count({ where: { tenant_id: tenant.id } })
  ]);

  const adminUser = await User.findOne({
    where: { tenant_id: tenant.id, is_administrador: true },
    attributes: { exclude: ['password'] },
    order: [['created_at', 'ASC']]
  });

  return {
    ...tenant.toJSON(),
    stats: { clientes, usuarios, imoveis, alugueis },
    admin_user: adminUser ? adminUser.toJSON() : null
  };
}

/**
 * Criar tenant com assinatura opcional.
 */
async function createTenant({
  nome,
  slug,
  cnpj,
  email,
  telefone,
  plan_id,
  admin_first_name,
  admin_last_name,
  admin_email,
  admin_password,
  admin_telefone
}) {
  const normalizedNome = nome?.trim();
  const normalizedSlug = slug?.trim().toLowerCase();
  const normalizedCompanyEmail = email?.trim().toLowerCase();
  const normalizedAdminEmail = admin_email?.trim().toLowerCase();
  const normalizedAdminFirstName = admin_first_name?.trim();
  const normalizedAdminLastName = admin_last_name?.trim();
  const normalizedCompanyPhone = telefone?.trim() || null;
  const normalizedAdminPhone = admin_telefone?.trim() || null;

  if (!normalizedNome || !normalizedSlug || !normalizedCompanyEmail || !normalizedAdminEmail || !admin_password) {
    throw { status: 400, message: 'Nome, slug, email da empresa, email do administrador e senha são obrigatórios' };
  }

  if (admin_password.length < 6) {
    throw { status: 400, message: 'Senha do administrador deve ter pelo menos 6 caracteres' };
  }

  const existingSlug = await Tenant.findOne({ where: { slug: normalizedSlug } });
  if (existingSlug) {
    throw { status: 409, message: 'Slug já está em uso' };
  }

  const existingAdmin = await User.findOne({ where: { email: normalizedAdminEmail } });
  if (existingAdmin) {
    throw { status: 409, message: 'Email do administrador já está em uso' };
  }

  const tenant = await Tenant.create({
    nome: normalizedNome,
    slug: normalizedSlug,
    cnpj,
    email: normalizedCompanyEmail,
    telefone: normalizedCompanyPhone,
    ativo: true
  });

  await User.create({
    first_name: normalizedAdminFirstName || normalizedNome,
    last_name: normalizedAdminLastName || '',
    username: normalizedAdminEmail,
    email: normalizedAdminEmail,
    telefone: normalizedAdminPhone || normalizedCompanyPhone,
    password: await bcrypt.hash(admin_password, 10),
    is_administrador: true,
    is_corretor: false,
    is_correspondente: false,
    is_super_admin: false,
    tenant_id: tenant.id
  });

  if (plan_id) {
    const plan = await Plan.findByPk(plan_id);
    if (plan) {
      await Subscription.create({
        tenant_id: tenant.id,
        plan_id: plan.id,
        status: plan.trial_dias > 0 ? 'trialing' : 'active',
        ciclo: 'mensal',
        data_inicio: new Date(),
        data_fim_trial: plan.trial_dias > 0
          ? new Date(Date.now() + plan.trial_dias * 24 * 60 * 60 * 1000)
          : null,
        valor: plan.preco_mensal
      });
    }
  }

  return tenant;
}

/**
 * Atualizar tenant (dados + limites + módulos).
 * Segue padrão Evoticket: se use_custom_modules=false, limpa overrides de módulos.
 */
async function updateTenant(id, data) {
  const tenant = await Tenant.findByPk(id, { include: TENANT_INCLUDE });
  if (!tenant) return null;

  const normalizedCompanyEmail = typeof data.email === 'string' ? data.email.trim().toLowerCase() : data.email;
  const normalizedAdminEmail = typeof data.admin_email === 'string' ? data.admin_email.trim().toLowerCase() : data.admin_email;
  const normalizedAdminFirstName = typeof data.admin_first_name === 'string' ? data.admin_first_name.trim() : data.admin_first_name;
  const normalizedAdminLastName = typeof data.admin_last_name === 'string' ? data.admin_last_name.trim() : data.admin_last_name;
  const normalizedCompanyPhone = typeof data.telefone === 'string' ? data.telefone.trim() : data.telefone;
  const normalizedAdminPhone = typeof data.admin_telefone === 'string' ? data.admin_telefone.trim() : data.admin_telefone;

  const adminUser = await User.findOne({
    where: { tenant_id: tenant.id, is_administrador: true },
    order: [['created_at', 'ASC']]
  });

  const updateData = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  if (normalizedCompanyEmail !== undefined) updateData.email = normalizedCompanyEmail;
  if (normalizedCompanyPhone !== undefined) updateData.telefone = normalizedCompanyPhone;

  if (data.nome !== undefined && !String(data.nome).trim()) {
    throw { status: 400, message: 'Nome da empresa é obrigatório' };
  }

  if (normalizedCompanyEmail !== undefined && !normalizedCompanyEmail) {
    throw { status: 400, message: 'Email da empresa é obrigatório' };
  }

  if (data.admin_email !== undefined && !normalizedAdminEmail) {
    throw { status: 400, message: 'Email do administrador não pode ficar vazio' };
  }

  // Se desativando módulos customizados, limpar overrides
  if (updateData.use_custom_modules === false) {
    for (const field of MODULE_FIELDS) {
      updateData[field] = null;
    }
  }

  if (normalizedAdminEmail && normalizedAdminEmail !== adminUser?.email) {
    const existingAdminWithEmail = await User.findOne({
      where: {
        email: normalizedAdminEmail,
        id: { [Op.ne]: adminUser?.id || 0 }
      }
    });

    if (existingAdminWithEmail) {
      throw { status: 409, message: 'Email do administrador já está em uso' };
    }
  }

  await tenant.update(updateData);

  const hasAdminPayload = [
    'admin_first_name',
    'admin_last_name',
    'admin_email',
    'admin_telefone',
    'admin_password'
  ].some((field) => data[field] !== undefined && data[field] !== '');

  if (hasAdminPayload) {
    if (adminUser) {
      const adminUpdateData = {};

      if (normalizedAdminFirstName !== undefined) adminUpdateData.first_name = normalizedAdminFirstName;
      if (normalizedAdminLastName !== undefined) adminUpdateData.last_name = normalizedAdminLastName;
      if (normalizedAdminEmail !== undefined) {
        adminUpdateData.email = normalizedAdminEmail;
        adminUpdateData.username = normalizedAdminEmail;
      }
      if (normalizedAdminPhone !== undefined) adminUpdateData.telefone = normalizedAdminPhone;
      if (data.admin_password) adminUpdateData.password = await bcrypt.hash(data.admin_password, 10);

      await adminUser.update(adminUpdateData);
    } else if (normalizedAdminEmail && data.admin_password) {
      await User.create({
        first_name: normalizedAdminFirstName || tenant.nome,
        last_name: normalizedAdminLastName || '',
        username: normalizedAdminEmail,
        email: normalizedAdminEmail,
        telefone: normalizedAdminPhone || tenant.telefone || null,
        password: await bcrypt.hash(data.admin_password, 10),
        is_administrador: true,
        is_corretor: false,
        is_correspondente: false,
        is_super_admin: false,
        tenant_id: tenant.id
      });
    }
  }

  // Recarregar com associações
  return getTenantDetails(tenant.id);
}

/**
 * Resolver módulos efetivos (herança plano vs custom).
 */
async function getEffectiveModules(id) {
  const tenant = await Tenant.findByPk(id, {
    include: [{
      model: Subscription,
      as: 'subscriptions',
      where: { status: ['active', 'trialing'] },
      include: [{ model: Plan, as: 'plan' }],
      order: [['created_at', 'DESC']],
      limit: 1,
      required: false
    }]
  });

  if (!tenant) return null;

  const plan = tenant.subscriptions?.[0]?.plan;

  const modules = {};
  for (const field of MODULE_FIELDS) {
    if (tenant.use_custom_modules && tenant[field] !== null) {
      modules[field] = { value: tenant[field], source: 'tenant' };
    } else if (plan) {
      modules[field] = { value: plan[field] || false, source: 'plan' };
    } else {
      modules[field] = { value: false, source: 'none' };
    }
  }

  const limits = {};
  for (const field of LIMIT_FIELDS) {
    if (tenant[field] !== null && tenant[field] !== undefined) {
      limits[field] = { value: tenant[field], source: 'tenant' };
    } else if (plan) {
      limits[field] = { value: plan[field] || 0, source: 'plan' };
    } else {
      limits[field] = { value: 0, source: 'none' };
    }
  }

  // Storage
  const storage = {};
  for (const field of STORAGE_FIELDS) {
    if (tenant[field] !== null && tenant[field] !== undefined) {
      storage[field] = { value: tenant[field], source: 'tenant' };
    } else if (plan) {
      storage[field] = { value: plan[field] || 0, source: 'plan' };
    } else {
      storage[field] = { value: 0, source: 'none' };
    }
  }
  storage.storage_used_bytes = parseInt(tenant.storage_used_bytes || 0);
  storage.storage_used_mb = Math.round((storage.storage_used_bytes / (1024 * 1024)) * 100) / 100;

  return {
    tenant_id: tenant.id,
    use_custom_modules: tenant.use_custom_modules,
    plan: plan ? { id: plan.id, nome: plan.nome } : null,
    modules,
    limits,
    storage
  };
}

/**
 * Toggle ativo/inativo.
 */
async function toggleTenantStatus(id) {
  const tenant = await Tenant.findByPk(id);
  if (!tenant) return null;

  await tenant.update({ ativo: !tenant.ativo });
  return {
    message: tenant.ativo ? 'Organização ativada' : 'Organização suspensa',
    ativo: tenant.ativo
  };
}

/**
 * Métricas do dashboard super admin.
 */
async function getMetrics() {
  const sequelize = require('../models').sequelize;

  const totalTenants = await Tenant.count();
  const tenantsAtivos = await Tenant.count({ where: { ativo: true } });

  const assinaturasAtivas = await Subscription.count({
    where: { status: ['active', 'trialing'] }
  });

  const mrrResult = await Subscription.findAll({
    where: { status: 'active' },
    attributes: [
      [sequelize.fn('SUM',
        sequelize.literal(`CASE WHEN ciclo = 'mensal' THEN valor ELSE valor / 12 END`)
      ), 'mrr']
    ],
    raw: true
  });
  const mrr = parseFloat(mrrResult[0]?.mrr || 0);

  const tenantsPorPlano = await Subscription.findAll({
    where: { status: ['active', 'trialing'] },
    include: [{ model: Plan, as: 'plan', attributes: ['nome', 'slug'] }],
    attributes: [
      'plan_id',
      [sequelize.fn('COUNT', sequelize.col('Subscription.id')), 'total']
    ],
    group: ['plan_id', 'plan.id'],
    raw: true,
    nest: true
  });

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const novosTenantsMes = await Tenant.count({
    where: { created_at: { [Op.gte]: inicioMes } }
  });

  const churnMes = await Subscription.count({
    where: {
      status: 'canceled',
      cancelado_em: { [Op.gte]: inicioMes }
    }
  });

  const [totalClientes, totalUsuarios, totalImoveis] = await Promise.all([
    Cliente.count(),
    User.count(),
    Imovel.count()
  ]);

  return {
    tenants: { total: totalTenants, ativos: tenantsAtivos, novos_mes: novosTenantsMes },
    financeiro: { mrr, arr: mrr * 12, assinaturas_ativas: assinaturasAtivas, churn_mes: churnMes },
    planos: tenantsPorPlano,
    recursos: { clientes: totalClientes, usuarios: totalUsuarios, imoveis: totalImoveis }
  };
}

/**
 * Impersonar tenant (retorna info do admin).
 */
async function impersonateTenant(id) {
  const tenant = await Tenant.findByPk(id);
  if (!tenant) return null;

  const tenantAdmin = await User.findOne({
    where: { tenant_id: tenant.id, is_administrador: true }
  });

  if (!tenantAdmin) {
    throw { status: 404, message: 'Nenhum administrador encontrado nesta organização' };
  }

  return {
    message: 'Impersonação disponível',
    tenant: { id: tenant.id, nome: tenant.nome },
    admin: { id: tenantAdmin.id, email: tenantAdmin.email, nome: tenantAdmin.first_name },
    instrucao: 'Use o header X-Tenant-Id com o ID do tenant para acessar como super admin'
  };
}

/**
 * Listar usuários de um tenant.
 */
async function getTenantUsers(tenantId) {
  return User.findAll({
    where: { tenant_id: tenantId },
    attributes: { exclude: ['password'] },
    order: [['created_at', 'DESC']]
  });
}

module.exports = {
  listTenants,
  getTenantDetails,
  createTenant,
  updateTenant,
  getEffectiveModules,
  toggleTenantStatus,
  getMetrics,
  impersonateTenant,
  getTenantUsers
};
