'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('../middleware/authenticateToken');
const { resolveTenant } = require('../middleware/tenantMiddleware');
const { Tenant } = require('../models');

// ===== MULTER CONFIG PARA LOGO DO TENANT =====
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/tenants', String(req.tenantId));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${Date.now()}${ext}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou SVG.'));
    }
  }
});

// Aplicar autenticação e resolução de tenant em todas as rotas
router.use(authenticateToken, resolveTenant);

// ===== GET /settings — Obter dados e configurações do tenant =====
router.get('/settings', async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.tenantId, {
      attributes: ['id', 'nome', 'slug', 'cnpj', 'email', 'telefone', 'logo', 'configuracoes', 'endereco', 'cidade', 'estado', 'cep']
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('Erro ao buscar configurações do tenant:', error);
    res.status(500).json({ error: 'Erro interno ao buscar configurações' });
  }
});

// ===== PUT /settings — Atualizar dados do tenant =====
router.put('/settings', async (req, res) => {
  try {
    // Somente administrador do tenant pode atualizar
    if (!req.user.is_administrador && !req.user.is_super_admin) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Apenas administradores podem alterar as configurações da organização'
      });
    }

    const tenant = await Tenant.findByPk(req.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // Campos permitidos para atualização (slug não pode ser alterado)
    const allowedFields = ['nome', 'cnpj', 'email', 'telefone', 'endereco', 'cidade', 'estado', 'cep', 'configuracoes'];
    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    await tenant.update(updateData);

    res.json({
      message: 'Configurações atualizadas com sucesso',
      tenant: {
        id: tenant.id,
        nome: tenant.nome,
        slug: tenant.slug,
        cnpj: tenant.cnpj,
        email: tenant.email,
        telefone: tenant.telefone,
        logo: tenant.logo,
        configuracoes: tenant.configuracoes,
        endereco: tenant.endereco,
        cidade: tenant.cidade,
        estado: tenant.estado,
        cep: tenant.cep
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações do tenant:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.errors.map(e => e.message)
      });
    }
    res.status(500).json({ error: 'Erro interno ao atualizar configurações' });
  }
});

// ===== POST /settings/logo — Upload do logo do tenant =====
router.post('/settings/logo', logoUpload.single('logo'), async (req, res) => {
  try {
    // Somente administrador do tenant pode atualizar
    if (!req.user.is_administrador && !req.user.is_super_admin) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Apenas administradores podem alterar o logo da organização'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const tenant = await Tenant.findByPk(req.tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // Remover logo anterior se existir
    if (tenant.logo) {
      const oldLogoPath = path.join(__dirname, '../../uploads', tenant.logo);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Caminho relativo para salvar no banco
    const logoPath = `tenants/${req.tenantId}/${req.file.filename}`;
    await tenant.update({ logo: logoPath });

    res.json({
      message: 'Logo atualizado com sucesso',
      logo: logoPath
    });
  } catch (error) {
    console.error('Erro ao fazer upload do logo:', error);
    res.status(500).json({ error: 'Erro interno ao fazer upload do logo' });
  }
});

// ===== GET /settings/asaas — Retorna config Asaas (chave mascarada) =====
router.get('/settings/asaas', async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.tenantId, {
      attributes: ['id', 'slug', 'asaas_api_key', 'asaas_webhook_token']
    });
    if (!tenant) return res.status(404).json({ error: 'Organização não encontrada' });

    const apiKey = tenant.asaas_api_key;
    const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8000}`;

    res.json({
      asaas_api_key_configured: !!apiKey,
      // Mostra apenas os últimos 6 caracteres para confirmação visual
      asaas_api_key_preview: apiKey ? `****${apiKey.slice(-6)}` : null,
      asaas_webhook_token: tenant.asaas_webhook_token || null,
      webhook_url: `${BACKEND_URL}/api/asaas/webhook/${tenant.slug}`,
    });
  } catch (error) {
    console.error('Erro ao buscar config Asaas:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ===== PUT /settings/asaas — Salva chave Asaas e webhook token do tenant =====
router.put('/settings/asaas', async (req, res) => {
  try {
    if (!req.user.is_administrador && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Acesso negado — apenas administradores' });
    }

    const tenant = await Tenant.findByPk(req.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Organização não encontrada' });

    const { asaas_api_key, asaas_webhook_token } = req.body;
    const updateData = {};

    // Só atualiza se vieram novos valores — string vazia apaga
    if (asaas_api_key !== undefined) {
      updateData.asaas_api_key = asaas_api_key || null;
    }
    if (asaas_webhook_token !== undefined) {
      updateData.asaas_webhook_token = asaas_webhook_token || null;
    }

    await tenant.update(updateData);

    // Testa a conexão se a chave foi atualizada
    let testeConexao = null;
    if (asaas_api_key) {
      const asaasService = require('../services/asaasService');
      testeConexao = await asaasService.testarConexao(asaas_api_key);
    }

    const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8000}`;
    res.json({
      message: 'Configurações Asaas salvas com sucesso',
      asaas_api_key_configured: !!(asaas_api_key || tenant.asaas_api_key),
      asaas_webhook_token: updateData.asaas_webhook_token ?? tenant.asaas_webhook_token,
      webhook_url: `${BACKEND_URL}/api/asaas/webhook/${tenant.slug}`,
      teste_conexao: testeConexao,
    });
  } catch (error) {
    console.error('Erro ao salvar config Asaas:', error);
    res.status(500).json({ error: 'Erro interno ao salvar configurações Asaas' });
  }
});

// ===== POST /settings/asaas/testar — Testa a chave Asaas do tenant =====
router.post('/settings/asaas/testar', async (req, res) => {
  try {
    const tenant = await Tenant.findByPk(req.tenantId, {
      attributes: ['asaas_api_key']
    });
    if (!tenant) return res.status(404).json({ error: 'Organização não encontrada' });

    const apiKey = req.body.asaas_api_key || tenant.asaas_api_key;
    if (!apiKey) {
      return res.status(400).json({ error: 'Nenhuma chave Asaas configurada' });
    }

    const asaasService = require('../services/asaasService');
    const resultado = await asaasService.testarConexao(apiKey);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao testar conexão Asaas:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
