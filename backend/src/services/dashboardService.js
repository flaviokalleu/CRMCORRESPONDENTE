'use strict';

const { User, Cliente } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

// Cache simples em memória (5 minutos)
let dashboardCache = {};
const CACHE_TTL = 5 * 60 * 1000;

function getCachedData(key) {
  const entry = dashboardCache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCachedData(key, data) {
  dashboardCache[key] = { data, timestamp: Date.now() };
}

function invalidateCache() {
  dashboardCache = {};
}

/**
 * Constrói whereCondition baseado no role do usuário.
 * Corretores veem apenas seus clientes; admins/correspondentes veem todos.
 */
async function buildWhereCondition(userEmail, userRole) {
  const user = await User.findOne({ where: { email: userEmail } });
  const where = {};
  if (user && user.is_corretor && !user.is_administrador && !user.is_correspondente) {
    where.user_id = user.id;
  }
  return { user, where };
}

/**
 * Dashboard principal com métricas avançadas.
 */
async function getMainDashboard(userEmail, userRole) {
  const cacheKey = `dashboard_${userEmail}_${userRole}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const { user, where: whereCondition } = await buildWhereCondition(userEmail, userRole);

  // Contadores básicos
  const totalCorretores = userRole === 'corretor'
    ? 1
    : await User.count({ where: { is_corretor: true } });

  const totalClientes = (user && user.is_corretor && !user.is_administrador && !user.is_correspondente)
    ? await Cliente.count({ where: { user_id: user.id } })
    : await Cliente.count();

  const totalCorrespondentes = await User.count({ where: { is_correspondente: true } });

  // Status breakdown
  const statusCounts = await Cliente.findAll({
    attributes: ['status', [fn('COUNT', col('status')), 'count']],
    where: whereCondition,
    group: ['status'],
    raw: true
  });

  let clientesAprovados = 0, clientesReprovados = 0, clientesPendentes = 0;
  statusCounts.forEach(item => {
    const status = (item.status || '').toLowerCase();
    const count = parseInt(item.count) || 0;
    if (status.includes('aprovado')) clientesAprovados += count;
    else if (status.includes('reprovado') || status.includes('rejeitado')) clientesReprovados += count;
    else clientesPendentes += count;
  });

  // Clientes aguardando aprovação
  const clientesAguardandoAprovacao = await Cliente.findAll({
    where: {
      ...whereCondition,
      [Op.or]: [
        { status: { [Op.iLike]: '%aguardando%' } },
        { status: { [Op.iLike]: '%pendente%' } },
        { status: { [Op.iLike]: '%análise%' } },
        { status: { [Op.iLike]: '%em análise%' } },
        { status: 'aguardando_aprovação' }
      ]
    },
    attributes: ['id', 'nome', 'status', 'created_at', 'updated_at'],
    order: [['created_at', 'DESC']]
  });

  const totalClientesAguardandoAprovacao = clientesAguardandoAprovacao.length;

  // Crescimento mensal
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const inicioMesAnterior = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const fimMesAnterior = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [clientesEsteMes, clientesMesAnterior] = await Promise.all([
    Cliente.count({ where: { ...whereCondition, created_at: { [Op.gte]: inicioMes } } }),
    Cliente.count({ where: { ...whereCondition, created_at: { [Op.gte]: inicioMesAnterior, [Op.lt]: fimMesAnterior } } })
  ]);

  const crescimentoMensal = clientesMesAnterior > 0
    ? Math.round(((clientesEsteMes - clientesMesAnterior) / clientesMesAnterior) * 100)
    : clientesEsteMes > 0 ? 100 : 0;

  // Atividade diária e semanal
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
  inicioSemana.setHours(0, 0, 0, 0);

  const inicioSemanaAnterior = new Date(inicioSemana);
  inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7);

  const [usuariosAtivosHoje, clientesHoje, clientesSemana, clientesSemanaAnterior] = await Promise.all([
    User.count({ where: { updated_at: { [Op.gte]: inicioHoje } } }),
    Cliente.count({ where: { ...whereCondition, created_at: { [Op.gte]: inicioHoje } } }),
    Cliente.count({ where: { ...whereCondition, created_at: { [Op.gte]: inicioSemana } } }),
    Cliente.count({ where: { ...whereCondition, created_at: { [Op.gte]: inicioSemanaAnterior, [Op.lt]: inicioSemana } } })
  ]);

  const crescimentoSemanal = clientesSemanaAnterior > 0
    ? Math.round(((clientesSemana - clientesSemanaAnterior) / clientesSemanaAnterior) * 100)
    : clientesSemana > 0 ? 100 : 0;

  // Top 5 usuários do mês atual
  let top5Usuarios = [];
  try {
    if (userRole !== 'corretor') {
      const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
      const clientesComUsuario = await Cliente.findAll({
        attributes: ['user_id', [fn('COUNT', col('Cliente.id')), 'clientes']],
        where: { user_id: { [Op.not]: null }, created_at: { [Op.between]: [inicioMes, fimMes] } },
        group: ['Cliente.user_id'],
        order: [[fn('COUNT', col('Cliente.id')), 'DESC']],
        limit: 5,
        raw: true
      });

      for (const item of clientesComUsuario) {
        const usuario = await User.findByPk(item.user_id, {
          attributes: ['id', 'first_name', 'last_name', 'email']
        });
        if (usuario) top5Usuarios.push({ user: usuario, clientes: parseInt(item.clientes) });
      }
    }
  } catch (error) {
    top5Usuarios = [];
  }

  // Performance
  const totalUsuarios = await User.count();
  const eficienciaMedia = totalUsuarios > 0 ? Math.round((totalClientes / totalUsuarios) * 100) / 100 : 0;
  const taxaAprovacao = totalClientes > 0 ? Math.round((clientesAprovados / totalClientes) * 100) : 0;
  const taxaRejeicao = totalClientes > 0 ? Math.round((clientesReprovados / totalClientes) * 100) : 0;

  // Análise de renda
  let rendaAnalysis = { rendaMedia: 0, rendaMaxima: 0, rendaMinima: 0, clientesComRenda: 0 };
  try {
    const rendaData = await Cliente.findAll({
      attributes: [
        [fn('AVG', literal('CAST("valor_renda" AS NUMERIC)')), 'rendaMedia'],
        [fn('MAX', literal('CAST("valor_renda" AS NUMERIC)')), 'rendaMaxima'],
        [fn('MIN', literal('CAST("valor_renda" AS NUMERIC)')), 'rendaMinima'],
        [fn('COUNT', col('valor_renda')), 'clientesComRenda']
      ],
      where: { ...whereCondition, valor_renda: { [Op.not]: null, [Op.ne]: '', [Op.ne]: '0' } },
      raw: true
    });
    const renda = rendaData[0] || {};
    rendaAnalysis = {
      rendaMedia: parseFloat(renda.rendaMedia || 0).toFixed(2),
      rendaMaxima: parseFloat(renda.rendaMaxima || 0).toFixed(2),
      rendaMinima: parseFloat(renda.rendaMinima || 0).toFixed(2),
      clientesComRenda: parseInt(renda.clientesComRenda || 0)
    };
  } catch (error) { /* usar valores padrão */ }

  const responseData = {
    totalCorretores, totalClientes, totalCount: totalClientes, totalCorrespondentes,
    totalClientesAguardandoAprovacao, clientesAguardandoAprovacao,
    userPermissions: {
      canViewAll: userRole === 'administrador' || userRole === 'correspondente',
      isCorretor: userRole === 'corretor',
      isAdministrador: userRole === 'administrador',
      isCorrespondente: userRole === 'correspondente'
    },
    clientesAprovados, clientesReprovados, clientesPendentes,
    clientesEsteMes, clientesMesAnterior, crescimentoSemanal, crescimentoMensal,
    usuariosAtivosHoje, clientesHoje, clientesSemana,
    top5Usuarios,
    performance: { eficienciaMedia, taxaAprovacao, taxaRejeicao, totalUsuarios },
    rendaAnalysis
  };

  setCachedData(cacheKey, responseData);
  return responseData;
}

/**
 * Dados mensais de clientes cadastrados (12 meses).
 */
async function getMonthlyData(userEmail, userRole) {
  const { where: whereCondition } = await buildWhereCondition(userEmail, userRole);

  const monthlyClientes = await Cliente.findAll({
    attributes: [
      [literal('EXTRACT(MONTH FROM "created_at")'), 'month'],
      [literal('EXTRACT(YEAR FROM "created_at")'), 'year'],
      [fn('COUNT', col('id')), 'count']
    ],
    where: { ...whereCondition, created_at: { [Op.gte]: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1) } },
    group: [literal('EXTRACT(YEAR FROM "created_at")'), literal('EXTRACT(MONTH FROM "created_at")')],
    order: [[literal('EXTRACT(YEAR FROM "created_at")'), 'ASC'], [literal('EXTRACT(MONTH FROM "created_at")'), 'ASC']],
    raw: true
  });

  const monthlyData = Array(12).fill(0);
  const currentYear = new Date().getFullYear();
  monthlyClientes.forEach(c => {
    const year = parseInt(c.year), month = parseInt(c.month) - 1;
    if ((year === currentYear || year === currentYear - 1) && month >= 0 && month < 12) {
      monthlyData[month] = parseInt(c.count);
    }
  });

  const monthlyGrowth = monthlyData.map((current, i) => {
    if (i === 0) return 0;
    const prev = monthlyData[i - 1];
    return prev > 0 ? Math.round(((current - prev) / prev) * 100) : current > 0 ? 100 : 0;
  });

  const totalYear = monthlyData.reduce((a, b) => a + b, 0);
  return {
    monthlyData, monthlyGrowth, totalYear,
    averageMonth: totalYear > 0 ? Math.round(totalYear / 12) : 0,
    labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  };
}

/**
 * Dados semanais de clientes cadastrados.
 */
async function getWeeklyData(userEmail, userRole) {
  const { where: whereCondition } = await buildWhereCondition(userEmail, userRole);

  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - 7);

  const weeklyClientes = await Cliente.findAll({
    attributes: [[literal('EXTRACT(DOW FROM "created_at")'), 'dayOfWeek'], [fn('COUNT', col('id')), 'count']],
    where: { ...whereCondition, created_at: { [Op.gte]: inicioSemana } },
    group: [literal('EXTRACT(DOW FROM "created_at")')],
    order: [[literal('EXTRACT(DOW FROM "created_at")'), 'ASC']],
    raw: true
  });

  const weeklyData = Array(7).fill(0);
  weeklyClientes.forEach(c => { const day = parseInt(c.dayOfWeek); if (day >= 0 && day < 7) weeklyData[day] = parseInt(c.count); });

  // Semana anterior
  const inicioSemanaAnterior = new Date();
  inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 14);
  const fimSemanaAnterior = new Date();
  fimSemanaAnterior.setDate(fimSemanaAnterior.getDate() - 7);

  const prevWeekClientes = await Cliente.findAll({
    attributes: [[literal('EXTRACT(DOW FROM "created_at")'), 'dayOfWeek'], [fn('COUNT', col('id')), 'count']],
    where: { ...whereCondition, created_at: { [Op.gte]: inicioSemanaAnterior, [Op.lt]: fimSemanaAnterior } },
    group: [literal('EXTRACT(DOW FROM "created_at")')],
    order: [[literal('EXTRACT(DOW FROM "created_at")'), 'ASC']],
    raw: true
  });

  const previousWeekData = Array(7).fill(0);
  prevWeekClientes.forEach(c => { const day = parseInt(c.dayOfWeek); if (day >= 0 && day < 7) previousWeekData[day] = parseInt(c.count); });

  const totalWeek = weeklyData.reduce((a, b) => a + b, 0);
  const totalPrevWeek = previousWeekData.reduce((a, b) => a + b, 0);
  const weeklyGrowth = totalPrevWeek > 0 ? Math.round(((totalWeek - totalPrevWeek) / totalPrevWeek) * 100) : totalWeek > 0 ? 100 : 0;

  return {
    weeklyData, previousWeekData, totalWeek, weeklyGrowth,
    labels: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  };
}

/**
 * Estatísticas do sistema.
 */
async function getSystemStats() {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalRegistros, totalUsuarios, atividadeRecente, usuariosRecentes] = await Promise.all([
    Cliente.count(),
    User.count(),
    Cliente.count({ where: { created_at: { [Op.gte]: ontem } } }),
    User.count({ where: { updated_at: { [Op.gte]: ontem } } })
  ]);

  return { totalRegistros, totalUsuarios, atividadeRecente, usuariosRecentes, timestamp: new Date() };
}

/**
 * Métricas de atividade em tempo real.
 */
async function getActivityMetrics(userEmail, userRole) {
  const { where: whereCondition } = await buildWhereCondition(userEmail, userRole);

  const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const duasSemanasAtras = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const trintaMinAtras = new Date(Date.now() - 30 * 60 * 1000);

  const [clientesUltimas24h, clientesUltimos7d, clientesSemanaAnterior, onlineUsers, totalClientes, totalUsuarios] = await Promise.all([
    Cliente.count({ where: { ...whereCondition, created_at: { [Op.gte]: ontem } } }),
    Cliente.count({ where: { ...whereCondition, created_at: { [Op.gte]: semanaAtras } } }),
    Cliente.count({ where: { ...whereCondition, created_at: { [Op.gte]: duasSemanasAtras, [Op.lt]: semanaAtras } } }),
    User.count({ where: { updated_at: { [Op.gte]: trintaMinAtras } } }),
    Cliente.count(),
    User.count()
  ]);

  const weeklyGrowth = clientesSemanaAnterior > 0
    ? Math.round(((clientesUltimos7d - clientesSemanaAnterior) / clientesSemanaAnterior) * 100)
    : clientesUltimos7d > 0 ? 100 : 0;

  return {
    clientesUltimas24h, clientesUltimos7d, weeklyGrowth, onlineUsers,
    efficiency: totalUsuarios > 0 ? Math.round((totalClientes / totalUsuarios) * 100) : 0
  };
}

/**
 * Notificações geradas dinamicamente.
 */
async function getNotifications(userEmail, userRole) {
  const { where: whereCondition } = await buildWhereCondition(userEmail, userRole);
  const notifications = [];

  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [pendingClients, newClientsToday, staleClients] = await Promise.all([
    Cliente.findAll({
      where: { ...whereCondition, status: 'aguardando_aprovacao' },
      attributes: ['id', 'nome', 'created_at'], limit: 10, order: [['created_at', 'DESC']]
    }),
    Cliente.findAll({
      where: { ...whereCondition, created_at: { [Op.gte]: inicioHoje } },
      attributes: ['id', 'nome', 'created_at'], limit: 10, order: [['created_at', 'DESC']]
    }),
    Cliente.findAll({
      where: { ...whereCondition, updated_at: { [Op.lt]: trintaDiasAtras } },
      attributes: ['id', 'nome', 'updated_at'], limit: 5, order: [['updated_at', 'ASC']]
    })
  ]);

  pendingClients.forEach(c => notifications.push({
    id: `pending_${c.id}`, type: 'warning', title: 'Cliente Aguardando Aprovação',
    message: `${c.nome} está aguardando aprovação`, clienteId: c.id, read: false,
    timestamp: c.created_at
  }));

  newClientsToday.forEach(c => notifications.push({
    id: `new_${c.id}`, type: 'info', title: 'Novo Cliente Cadastrado',
    message: `${c.nome} foi cadastrado hoje`, clienteId: c.id, read: false,
    timestamp: c.created_at
  }));

  staleClients.forEach(c => notifications.push({
    id: `stale_${c.id}`, type: 'alert', title: 'Cliente sem Atualização',
    message: `${c.nome} não é atualizado há mais de 30 dias`, clienteId: c.id, read: true,
    timestamp: c.updated_at
  }));

  return { notifications, unreadCount: notifications.filter(n => !n.read).length };
}

/**
 * Clientes aguardando aprovação.
 */
async function getAguardandoAprovacao() {
  return Cliente.findAll({
    where: { status: 'aguardando_aprovacao' },
    attributes: ['id', 'nome', 'status', 'created_at'],
    order: [['created_at', 'DESC']]
  });
}

module.exports = {
  getMainDashboard,
  getMonthlyData,
  getWeeklyData,
  getSystemStats,
  getActivityMetrics,
  getNotifications,
  getAguardandoAprovacao,
  invalidateCache
};
