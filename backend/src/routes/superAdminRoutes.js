'use strict';

const express = require('express');
const router = express.Router();
const { requireSuperAdmin } = require('../middleware/tenantMiddleware');
const superAdminController = require('../controllers/superAdminController');
const planController = require('../controllers/planController');

// Todos os endpoints exigem super admin
router.use(requireSuperAdmin);

// ===== TENANTS =====
router.get('/tenants', superAdminController.listTenants);
router.get('/tenants/:id', superAdminController.getTenantDetails);
router.post('/tenants', superAdminController.createTenant);
router.put('/tenants/:id', superAdminController.updateTenant);
router.get('/tenants/:id/modules', superAdminController.getEffectiveModules);
router.patch('/tenants/:id/toggle-status', superAdminController.toggleTenantStatus);
router.post('/tenants/:id/impersonate', superAdminController.impersonateTenant);
router.get('/tenants/:id/users', superAdminController.getTenantUsers);

// ===== PLANOS =====
router.get('/plans', planController.listPlans);
router.post('/plans', planController.createPlan);
router.put('/plans/:id', planController.updatePlan);

// ===== ASSINATURAS =====
router.get('/subscriptions', planController.listSubscriptions);
router.put('/subscriptions/:tenantId/change-plan', planController.changePlan);

// ===== MÉTRICAS =====
router.get('/metrics', superAdminController.getMetrics);

module.exports = router;
