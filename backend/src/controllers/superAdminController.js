'use strict';

const tenantService = require('../services/tenantService');

async function listTenants(req, res) {
  try {
    const result = await tenantService.listTenants(req.query);
    res.json(result);
  } catch (error) {
    console.error('Erro ao listar tenants:', error);
    res.status(500).json({ error: 'Erro ao listar organizações' });
  }
}

async function getTenantDetails(req, res) {
  try {
    const result = await tenantService.getTenantDetails(req.params.id);
    if (!result) return res.status(404).json({ error: 'Organização não encontrada' });
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar tenant:', error);
    res.status(500).json({ error: 'Erro ao buscar organização' });
  }
}

async function createTenant(req, res) {
  try {
    const tenant = await tenantService.createTenant(req.body);
    res.status(201).json(tenant);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Erro ao criar tenant:', error);
    res.status(500).json({ error: 'Erro ao criar organização' });
  }
}

async function updateTenant(req, res) {
  try {
    const result = await tenantService.updateTenant(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: 'Organização não encontrada' });
    res.json(result);
  } catch (error) {
    console.error('Erro ao atualizar tenant:', error);
    res.status(500).json({ error: 'Erro ao atualizar organização' });
  }
}

async function getEffectiveModules(req, res) {
  try {
    const result = await tenantService.getEffectiveModules(req.params.id);
    if (!result) return res.status(404).json({ error: 'Organização não encontrada' });
    res.json(result);
  } catch (error) {
    console.error('Erro ao buscar módulos:', error);
    res.status(500).json({ error: 'Erro ao buscar módulos' });
  }
}

async function toggleTenantStatus(req, res) {
  try {
    const result = await tenantService.toggleTenantStatus(req.params.id);
    if (!result) return res.status(404).json({ error: 'Organização não encontrada' });
    res.json(result);
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    res.status(500).json({ error: 'Erro ao alterar status' });
  }
}

async function getMetrics(req, res) {
  try {
    const result = await tenantService.getMetrics();
    res.json(result);
  } catch (error) {
    console.error('Erro ao calcular métricas:', error);
    res.status(500).json({ error: 'Erro ao calcular métricas' });
  }
}

async function impersonateTenant(req, res) {
  try {
    const result = await tenantService.impersonateTenant(req.params.id);
    if (!result) return res.status(404).json({ error: 'Organização não encontrada' });
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Erro ao impersonar:', error);
    res.status(500).json({ error: 'Erro ao impersonar tenant' });
  }
}

async function getTenantUsers(req, res) {
  try {
    const users = await tenantService.getTenantUsers(req.params.id);
    res.json(users);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
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
