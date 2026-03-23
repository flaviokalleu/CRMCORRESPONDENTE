'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

// Dashboard principal com métricas avançadas
router.get('/', dashboardController.getMainDashboard);

// Dados mensais de clientes cadastrados (12 meses)
router.get('/monthly', dashboardController.getMonthlyData);

// Dados semanais de clientes cadastrados
router.get('/weekly', dashboardController.getWeeklyData);

// Estatísticas do sistema
router.get('/system-stats', dashboardController.getSystemStats);

// Métricas de atividade em tempo real
router.get('/activity-metrics', dashboardController.getActivityMetrics);

// Notificações do dashboard
router.get('/notifications', dashboardController.getNotifications);

// Clientes aguardando aprovação
router.get('/dashboard/aguardando-aprovacao', dashboardController.getAguardandoAprovacao);

module.exports = router;
