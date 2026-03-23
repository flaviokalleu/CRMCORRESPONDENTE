'use strict';

const dashboardService = require('../services/dashboardService');

async function getMainDashboard(req, res) {
  try {
    const data = await dashboardService.getMainDashboard(req.user.email, req.user.role);
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ message: 'Erro ao buscar dados do dashboard', error: error.message });
  }
}

async function getMonthlyData(req, res) {
  try {
    const data = await dashboardService.getMonthlyData(req.user.email, req.user.role);
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar dados mensais:', error);
    res.status(500).json({ message: 'Erro ao buscar dados mensais', error: error.message });
  }
}

async function getWeeklyData(req, res) {
  try {
    const data = await dashboardService.getWeeklyData(req.user.email, req.user.role);
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar dados semanais:', error);
    res.status(500).json({ message: 'Erro ao buscar dados semanais', error: error.message });
  }
}

async function getSystemStats(req, res) {
  try {
    const data = await dashboardService.getSystemStats();
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do sistema:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas', error: error.message });
  }
}

async function getActivityMetrics(req, res) {
  try {
    const data = await dashboardService.getActivityMetrics(req.user.email, req.user.role);
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar métricas de atividade:', error);
    res.status(500).json({ message: 'Erro ao buscar métricas', error: error.message });
  }
}

async function getNotifications(req, res) {
  try {
    const data = await dashboardService.getNotifications(req.user.email, req.user.role);
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ message: 'Erro ao buscar notificações', error: error.message });
  }
}

async function getAguardandoAprovacao(req, res) {
  try {
    const clientes = await dashboardService.getAguardandoAprovacao();
    res.json(clientes);
  } catch (error) {
    console.error('Erro ao buscar clientes aguardando aprovação:', error);
    res.status(500).json({ message: 'Erro ao buscar dados', error: error.message });
  }
}

module.exports = {
  getMainDashboard,
  getMonthlyData,
  getWeeklyData,
  getSystemStats,
  getActivityMetrics,
  getNotifications,
  getAguardandoAprovacao
};
