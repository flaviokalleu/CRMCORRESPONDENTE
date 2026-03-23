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
    const {
      // Dados da empresa
      empresa_nome,
      empresa_slug,
      empresa_cnpj,
      empresa_email,
      empresa_telefone,
      // Dados do admin
      admin_first_name,
      admin_last_name,
      admin_email,
      admin_password,
      admin_telefone,
      // Plano
      plan_slug
    } = req.body;

    // Validações
    if (!empresa_nome || !empresa_slug || !empresa_email) {
      return res.status(400).json({ error: 'Nome, slug e email da empresa são obrigatórios' });
    }
    if (!admin_email || !admin_password) {
      return res.status(400).json({ error: 'Email e senha do administrador são obrigatórios' });
    }
    if (admin_password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    // Validar slug (apenas letras minúsculas, números e hífens)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(empresa_slug)) {
      return res.status(400).json({ error: 'Slug deve conter apenas letras minúsculas, números e hífens' });
    }

    // Verificar duplicatas
    const [existingSlug, existingEmail, existingUser] = await Promise.all([
      Tenant.findOne({ where: { slug: empresa_slug }, transaction }),
      Tenant.findOne({ where: { email: empresa_email }, transaction }),
      User.findOne({ where: { email: admin_email }, transaction })
    ]);

    if (existingSlug) {
      return res.status(409).json({ error: 'Este slug já está em uso. Escolha outro.' });
    }
    if (existingEmail) {
      return res.status(409).json({ error: 'Este email de empresa já está cadastrado.' });
    }
    if (existingUser) {
      return res.status(409).json({ error: 'Este email de administrador já está cadastrado.' });
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
    let plan = await Plan.findOne({ where: { slug: plan_slug || 'free' }, transaction });
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
    await transaction.rollback();
    console.error('Erro ao registrar tenant:', error);
    res.status(500).json({ error: 'Erro ao criar organização. Tente novamente.' });
  }
});

module.exports = router;
