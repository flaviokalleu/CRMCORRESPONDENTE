'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Tenant, User, Plan, Subscription, Token } = require('../models');
const { Op } = require('sequelize');

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'your_jwt_secret_key';
const REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET_KEY || 'your_jwt_refresh_secret_key';

// ===== ROTAS PÚBLICAS =====

// Listar planos disponíveis (público)
router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.findAll({
      where: { ativo: true },
      order: [['ordem', 'ASC']],
      attributes: { exclude: ['features_extras'] }
    });
    res.json(plans);
  } catch (error) {
    console.error('Erro ao listar planos:', error);
    res.status(500).json({ error: 'Erro ao listar planos' });
  }
});

// Verificar disponibilidade de slug
router.get('/check-slug/:slug', async (req, res) => {
  try {
    const existing = await Tenant.findOne({ where: { slug: req.params.slug } });
    res.json({ available: !existing });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar slug' });
  }
});

// ===== REGISTRO DE NOVO TENANT (ONBOARDING) =====
router.post('/register', async (req, res) => {
  const sequelize = require('../models').sequelize;
  const transaction = await sequelize.transaction();

  try {
    const rollbackAndRespond = async (status, error) => {
      if (!transaction.finished) {
        await transaction.rollback();
      }

      return res.status(status).json({ error });
    };

    const {
      empresa = {},
      admin = {},
      plan_id,
      plan_slug: rawPlanSlug,
      // Dados da empresa (formato legado)
      empresa_nome: legacyEmpresaNome,
      empresa_slug: legacyEmpresaSlug,
      empresa_cnpj: legacyEmpresaCnpj,
      empresa_email: legacyEmpresaEmail,
      empresa_telefone: legacyEmpresaTelefone,
      // Dados do admin (formato legado)
      admin_first_name: legacyAdminFirstName,
      admin_last_name: legacyAdminLastName,
      admin_email: legacyAdminEmail,
      admin_password: legacyAdminPassword,
      admin_telefone: legacyAdminTelefone
    } = req.body || {};

    const empresa_nome = legacyEmpresaNome || empresa.nome;
    const empresa_slug = legacyEmpresaSlug || empresa.slug;
    const empresa_cnpj = legacyEmpresaCnpj || empresa.cnpj;
    const empresa_email = legacyEmpresaEmail || empresa.email;
    const empresa_telefone = legacyEmpresaTelefone || empresa.telefone;

    const admin_first_name = legacyAdminFirstName || admin.first_name;
    const admin_last_name = legacyAdminLastName || admin.last_name;
    const admin_email = legacyAdminEmail || admin.email;
    const admin_password = legacyAdminPassword || admin.password;
    const admin_telefone = legacyAdminTelefone || admin.telefone;
    const selectedPlanIdentifier = rawPlanSlug || plan_id;

    // Validações
    if (!empresa_nome || !empresa_slug || !empresa_email) {
      return rollbackAndRespond(400, 'Nome, slug e email da empresa são obrigatórios');
    }
    if (!admin_email || !admin_password) {
      return rollbackAndRespond(400, 'Email e senha do administrador são obrigatórios');
    }
    if (admin_password.length < 6) {
      return rollbackAndRespond(400, 'Senha deve ter pelo menos 6 caracteres');
    }

    // Validar slug (apenas letras minúsculas, números e hífens)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(empresa_slug)) {
      return rollbackAndRespond(400, 'Slug deve conter apenas letras minúsculas, números e hífens');
    }

    // Verificar duplicatas
    const [existingSlug, existingEmail, existingUser] = await Promise.all([
      Tenant.findOne({ where: { slug: empresa_slug }, transaction }),
      Tenant.findOne({ where: { email: empresa_email }, transaction }),
      User.findOne({ where: { email: admin_email }, transaction })
    ]);

    if (existingSlug) {
      return rollbackAndRespond(409, 'Este slug já está em uso. Escolha outro.');
    }
    if (existingEmail) {
      return rollbackAndRespond(409, 'Este email de empresa já está cadastrado.');
    }
    if (existingUser) {
      return rollbackAndRespond(409, 'Este email de administrador já está cadastrado.');
    }

    // 1. Criar tenant
    const tenant = await Tenant.create({
      nome: empresa_nome,
      slug: empresa_slug,
      cnpj: empresa_cnpj || null,
      email: empresa_email,
      telefone: empresa_telefone || null,
      ativo: true,
      configuracoes: {}
    }, { transaction });

    // 2. Criar admin do tenant
    const hashedPassword = await bcrypt.hash(admin_password, 10);
    const adminUser = await User.create({
      first_name: admin_first_name || empresa_nome,
      last_name: admin_last_name || '',
      email: admin_email,
      username: admin_email,
      password: hashedPassword,
      telefone: admin_telefone || empresa_telefone || null,
      is_administrador: true,
      is_corretor: false,
      is_correspondente: false,
      is_super_admin: false,
      tenant_id: tenant.id
    }, { transaction });

    // 3. Criar assinatura
    let plan = null;

    if (selectedPlanIdentifier) {
      const isNumericPlanId = /^\d+$/.test(String(selectedPlanIdentifier));

      plan = await Plan.findOne({
        where: isNumericPlanId
          ? { id: Number(selectedPlanIdentifier) }
          : { slug: String(selectedPlanIdentifier) },
        transaction
      });
    }

    if (!plan) {
      plan = await Plan.findOne({ where: { slug: 'free' }, transaction });
    }

    const subscription = await Subscription.create({
      tenant_id: tenant.id,
      plan_id: plan.id,
      status: plan.trial_dias > 0 ? 'trialing' : 'active',
      ciclo: 'mensal',
      data_inicio: new Date(),
      data_fim_trial: plan.trial_dias > 0
        ? new Date(Date.now() + plan.trial_dias * 24 * 60 * 60 * 1000)
        : null,
      valor: plan.preco_mensal
    }, { transaction });

    await transaction.commit();

    // 4. Gerar tokens de login automático
    const role = 'Administrador';
    const payload = {
      id: adminUser.id,
      email: adminUser.email,
      role,
      is_corretor: false,
      is_correspondente: false,
      is_administrador: true,
      tenant_id: tenant.id,
      is_super_admin: false
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET_KEY, { expiresIn: '7d' });

    await Token.create({
      token,
      refresh_token: refreshToken,
      user_id: adminUser.id,
      user_type: role,
      expires_at: new Date(Date.now() + 60 * 60000),
      email: adminUser.email,
      created_at: new Date(),
      updated_at: new Date()
    });

    res.status(201).json({
      message: 'Organização criada com sucesso!',
      token,
      refreshToken,
      tenant: {
        id: tenant.id,
        nome: tenant.nome,
        slug: tenant.slug,
        email: tenant.email
      },
      user: {
        id: adminUser.id,
        email: adminUser.email,
        first_name: adminUser.first_name,
        role,
        is_administrador: true,
        tenant_id: tenant.id
      },
      subscription: {
        id: subscription.id,
        plan: plan.nome,
        status: subscription.status,
        trial_dias: plan.trial_dias
      }
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error('Erro ao registrar tenant:', error);
    res.status(500).json({ error: 'Erro ao criar organização. Tente novamente.' });
  }
});

// ===== TROCAR PLANO DO PRÓPRIO TENANT (autenticado) =====
router.post('/change-plan', async (req, res) => {
  try {
    // Verificar autenticação via Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, SECRET_KEY);
    } catch {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: 'planId é obrigatório' });

    const user = await User.findByPk(decoded.id);
    if (!user || !user.tenant_id) return res.status(404).json({ error: 'Usuário ou tenant não encontrado' });
    if (!user.is_administrador) return res.status(403).json({ error: 'Apenas administradores podem trocar o plano' });

    const plan = await Plan.findByPk(planId);
    if (!plan || !plan.ativo) return res.status(404).json({ error: 'Plano não encontrado ou inativo' });

    const subscription = await Subscription.findOne({ where: { tenant_id: user.tenant_id } });
    if (!subscription) return res.status(404).json({ error: 'Assinatura não encontrada' });

    await subscription.update({ plan_id: planId, status: 'active' });

    res.json({ message: 'Plano alterado com sucesso', plan: { id: plan.id, nome: plan.nome } });
  } catch (error) {
    console.error('Erro ao trocar plano:', error);
    res.status(500).json({ error: 'Erro ao trocar plano' });
  }
});

module.exports = router;
