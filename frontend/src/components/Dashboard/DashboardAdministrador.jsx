import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Users, UserCheck, UserPlus, Clock, AlertTriangle,
  TrendingUp, TrendingDown, Activity, Target, BarChart3, Signal,
  CheckCircle, XCircle, Trophy, Zap, RefreshCw, Bell,
  ArrowUpRight, ArrowDownRight, DollarSign, ClipboardList,
  Database, Calendar, Star, AlertCircle, Gauge, Eye,
  Server, Cpu, Globe, Monitor, Award, PieChart as PieChartIcon,
  Wallet, CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, Legend,
  RadialBarChart, RadialBar,
} from "recharts";
import {
  KPICard, MiniStat, EffRing, ChartCard, SectionHeader, RankingCard,
  CustomTooltip, DashboardLoading, DashboardError,
  CARD, BORDER, ACCENT_GRADIENT, PALETTE, TICK,
  fadeUp, stagger, fmtNum, fmtPct, fmtR$,
  getStatusDisplay, getStatusColors,
} from "./shared/DashboardUI";

const DashboardAdministrador = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [activityMetrics, setActivityMetrics] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isVisibleRef = useRef(true);
  const intervalRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  const fetchAll = useCallback(async (signal) => {
    if (!isVisibleRef.current) return;
    try {
      const authToken = localStorage.getItem('authToken');
      const headers = { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' };
      const opts = { headers, signal };

      const [dashRes, monthlyRes, weeklyRes, sysRes, actRes, notifRes] = await Promise.all([
        fetch(`${API_URL}/dashboard`, opts),
        fetch(`${API_URL}/dashboard/monthly`, opts),
        fetch(`${API_URL}/dashboard/weekly`, opts),
        fetch(`${API_URL}/dashboard/system-stats`, opts).catch(() => null),
        fetch(`${API_URL}/dashboard/activity-metrics`, opts).catch(() => null),
        fetch(`${API_URL}/dashboard/notifications`, opts).catch(() => null),
      ]);

      if (!dashRes.ok) throw new Error('Erro ao carregar dados');
      const data = await dashRes.json();
      setDashboardData(data);

      // Monthly + Weekly charts
      if (monthlyRes.ok && weeklyRes.ok) {
        const monthly = await monthlyRes.json();
        const weekly = await weeklyRes.json();

        const labels = monthly.labels || ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
        let monthlyArr = monthly.monthlyData || Array(12).fill(0);
        const monthlyGrowth = monthly.monthlyGrowth || Array(12).fill(0);

        if (data.userPermissions?.canViewAll && data.totalCount) {
          const sum = monthlyArr.reduce((a, b) => a + b, 0);
          if (sum !== data.totalCount) monthlyArr[monthlyArr.length - 1] += data.totalCount - sum;
        }

        const weekLabels = weekly.labels || ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
        const weeklyArr = weekly.weeklyData || Array(7).fill(0);
        const prevWeekArr = weekly.previousWeekData || Array(7).fill(0);

        setChartData({
          monthly: labels.map((l, i) => ({
            name: l, clientes: monthlyArr[i] || 0, crescimento: monthlyGrowth[i] || 0,
          })),
          weekly: weekLabels.map((l, i) => ({
            name: l, atual: weeklyArr[i] || 0, anterior: prevWeekArr[i] || 0,
          })),
          totalYear: monthly.totalYear || 0,
          averageMonth: monthly.averageMonth || 0,
          totalWeek: weekly.totalWeek || 0,
          weeklyGrowth: weekly.weeklyGrowth || 0,
        });
      } else {
        setChartData({
          monthly: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map(l => ({ name: l, clientes: 0, crescimento: 0 })),
          weekly: ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(l => ({ name: l, atual: 0, anterior: 0 })),
          totalYear: 0, averageMonth: 0, totalWeek: 0, weeklyGrowth: 0,
        });
      }

      if (sysRes?.ok) setSystemStats(await sysRes.json());
      else setSystemStats({ totalRegistros: 0, totalUsuarios: 0, atividadeRecente: 0, usuariosRecentes: 0 });

      if (actRes?.ok) setActivityMetrics(await actRes.json());
      if (notifRes?.ok) setNotifications(await notifRes.json());

      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAll(controller.signal);
    intervalRef.current = setInterval(() => fetchAll(controller.signal), 30000);
    const vis = () => { isVisibleRef.current = document.visibilityState === 'visible'; if (isVisibleRef.current) fetchAll(controller.signal); };
    document.addEventListener('visibilitychange', vis);
    return () => { controller.abort(); clearInterval(intervalRef.current); document.removeEventListener('visibilitychange', vis); };
  }, [fetchAll]);

  const derived = useMemo(() => {
    if (!dashboardData) return null;
    const {
      totalCorretores = 0, totalClientes = 0, totalCount = 0, totalCorrespondentes = 0,
      clientesAguardandoAprovacao = [], top5Usuarios = [],
      crescimentoSemanal = 0, crescimentoMensal = 0,
      usuariosAtivosHoje = 0, clientesHoje = 0, clientesSemana = 0,
      clientesEsteMes = 0, clientesMesAnterior = 0,
      performance = {}, clientesAprovados = 0, clientesReprovados = 0,
      clientesPendentes = 0, rendaAnalysis = {},
    } = dashboardData;

    const aguardando = clientesAguardandoAprovacao.filter(c => c.status === 'aguardando_aprovacao');
    const total3 = (clientesAprovados || 0) + (clientesReprovados || 0) + aguardando.length;
    const pctAprov = total3 > 0 ? Math.round((clientesAprovados / total3) * 100) : 0;
    const pctRejeit = total3 > 0 ? Math.round((clientesReprovados / total3) * 100) : 0;
    const pctAguar = total3 > 0 ? Math.round((aguardando.length / total3) * 100) : 0;

    const rankingItems = (top5Usuarios || []).map(item => {
      const u = item.user || {};
      return {
        id: u.id,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Usuário',
        value: item.clientes || 0,
      };
    });

    const pieData = [
      { name: 'Aprovados', value: clientesAprovados || 0 },
      { name: 'Aguardando', value: aguardando.length },
      { name: 'Reprovados', value: clientesReprovados || 0 },
      { name: 'Pendentes', value: clientesPendentes || 0 },
    ].filter(d => d.value > 0);

    // Radial data for gauge
    const radialData = [
      { name: 'Aprovação', value: pctAprov, fill: '#10b981' },
      { name: 'Rejeição', value: pctRejeit, fill: '#ef4444' },
      { name: 'Pendência', value: pctAguar, fill: '#eab308' },
    ];

    return {
      totalCorretores, totalClientes: totalCount || totalClientes,
      totalCorrespondentes, aguardando, rankingItems,
      crescimentoSemanal, crescimentoMensal, usuariosAtivosHoje,
      clientesHoje, clientesSemana, clientesEsteMes, clientesMesAnterior,
      performance, clientesAprovados, clientesReprovados, clientesPendentes,
      rendaAnalysis, pctAprov, pctRejeit, pctAguar,
      pieData, radialData,
    };
  }, [dashboardData]);

  if (loading) return <DashboardLoading title="Dashboard Administrador" />;
  if (error || !derived) return <DashboardError error={error} onRetry={() => { setLoading(true); fetchAll(); }} />;
  if (!chartData || !systemStats) return <DashboardLoading title="dados" />;

  const d = derived;
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const notifCount = notifications?.unreadCount || 0;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-caixa-gradient min-h-screen">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 border-b backdrop-blur-md"
        style={{ borderColor: BORDER, backgroundColor: CARD }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: ACCENT_GRADIENT }}>
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Dashboard</h1>
            <p className="text-[11px] text-white/50">{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {notifCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
              style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
              <Bell className="w-3.5 h-3.5" />
              <span>{notifCount}</span>
            </div>
          )}
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
            style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
            <Signal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ao vivo</span>
          </motion.div>
        </div>
      </div>

      {/* ── Content ── */}
      <motion.div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4"
        initial="hidden" animate="show" variants={stagger}>

        {/* ═══ VISÃO GERAL — 6 KPIs ═══ */}
        <SectionHeader icon={<BarChart3 className="w-3.5 h-3.5" />} title="Visão Geral"
          subtitle={new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} />

        <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <KPICard index={0} title="Total Clientes" value={fmtNum(d.totalClientes)}
            sub={`${d.clientesHoje} hoje`} icon={<Users className="w-4 h-4" />} accent="#3b82f6" trend={d.crescimentoMensal} />
          <KPICard index={1} title="Correspondentes" value={fmtNum(d.totalCorretores)}
            sub="cadastrados" icon={<ClipboardList className="w-4 h-4" />} accent="#F97316" />
          <KPICard index={2} title="Aguardando" value={fmtNum(d.aguardando.length)}
            sub="aprovação" icon={<Clock className="w-4 h-4" />} accent="#eab308" />
          <KPICard index={3} title="Aprovados" value={fmtNum(d.clientesAprovados)}
            sub={`${d.pctAprov}%`} icon={<CheckCircle className="w-4 h-4" />} accent="#10b981" />
          <KPICard index={4} title="Reprovados" value={fmtNum(d.clientesReprovados)}
            sub={`${d.pctRejeit}%`} icon={<XCircle className="w-4 h-4" />} accent="#ef4444" />
          <KPICard index={5} title="Online" value={fmtNum(systemStats?.usuariosRecentes || d.usuariosAtivosHoje)}
            sub="ativos agora" icon={<Signal className="w-4 h-4" />} accent="#06b6d4" />
        </motion.div>

        {/* ═══ CONTROLE DETALHADO — 8 KPIs ═══ */}
        <SectionHeader icon={<Activity className="w-3.5 h-3.5" />} title="Controle Detalhado"
          subtitle="Métricas de crescimento e performance" />

        <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <KPICard index={0} title="Hoje" value={fmtNum(d.clientesHoje)}
            sub="cadastros" icon={<UserPlus className="w-4 h-4" />} accent="#3b82f6" />
          <KPICard index={1} title="Semana" value={fmtNum(d.clientesSemana)}
            icon={<Calendar className="w-4 h-4" />} accent="#8b5cf6" trend={d.crescimentoSemanal} />
          <KPICard index={2} title="Este Mês" value={fmtNum(d.clientesEsteMes)}
            sub={`ant: ${d.clientesMesAnterior}`} icon={<Activity className="w-4 h-4" />} accent="#06b6d4" trend={d.crescimentoMensal} />
          <KPICard index={3} title="No Ano" value={fmtNum(chartData.totalYear)}
            sub={`média: ${chartData.averageMonth}/mês`} icon={<Globe className="w-4 h-4" />} accent="#10b981" />
          <KPICard index={4} title="Aprovação" value={fmtPct(d.performance?.taxaAprovacao || d.pctAprov)}
            icon={<Target className="w-4 h-4" />} accent="#10b981" />
          <KPICard index={5} title="Rejeição" value={fmtPct(d.performance?.taxaRejeicao || d.pctRejeit)}
            icon={<TrendingDown className="w-4 h-4" />} accent="#ef4444" />
          <KPICard index={6} title="Eficiência" value={`${d.performance?.eficienciaMedia || 0}`}
            icon={<Zap className="w-4 h-4" />} accent="#F97316" />
          <KPICard index={7} title="Usuários" value={fmtNum(d.performance?.totalUsuarios || systemStats?.totalUsuarios || 0)}
            sub="no sistema" icon={<UserCheck className="w-4 h-4" />} accent="#ec4899" />
        </motion.div>

        {/* ═══ ANÁLISE DE RENDA — 4 mini cards ═══ */}
        <SectionHeader icon={<DollarSign className="w-3.5 h-3.5" />} title="Análise Financeira"
          subtitle="Perfil de renda dos clientes" />

        <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <KPICard index={0} title="Renda Média" value={fmtR$(parseFloat(d.rendaAnalysis?.rendaMedia || 0))}
            icon={<DollarSign className="w-4 h-4" />} accent="#10b981" />
          <KPICard index={1} title="Renda Máxima" value={fmtR$(parseFloat(d.rendaAnalysis?.rendaMaxima || 0))}
            icon={<TrendingUp className="w-4 h-4" />} accent="#3b82f6" />
          <KPICard index={2} title="Renda Mínima" value={fmtR$(parseFloat(d.rendaAnalysis?.rendaMinima || 0))}
            icon={<TrendingDown className="w-4 h-4" />} accent="#eab308" />
          <KPICard index={3} title="Com Renda" value={fmtNum(d.rendaAnalysis?.clientesComRenda || 0)}
            sub="clientes informaram" icon={<Wallet className="w-4 h-4" />} accent="#8b5cf6" />
        </motion.div>

        {/* ═══ PERFORMANCE RINGS + RESUMO — 2 cols ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* Performance rings */}
          <motion.div variants={fadeUp} className="rounded-xl p-3 backdrop-blur-md"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: ACCENT_GRADIENT }}>
                <Gauge className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs font-bold text-white">Performance</p>
            </div>
            <motion.div variants={stagger} className="grid grid-cols-3 gap-2">
              <EffRing index={0} title="Aprovação" value={fmtPct(d.pctAprov)} pct={d.pctAprov} accent="#10b981" />
              <EffRing index={1} title="Rejeição" value={fmtPct(d.pctRejeit)} pct={d.pctRejeit} accent="#ef4444" />
              <EffRing index={2} title="Aguardando" value={fmtPct(d.pctAguar)} pct={d.pctAguar} accent="#eab308" />
              <EffRing index={3} title="Cresc. Semanal" value={`${d.crescimentoSemanal}%`} pct={Math.min(100, Math.abs(d.crescimentoSemanal))} accent="#3b82f6" />
              <EffRing index={4} title="Cresc. Mensal" value={`${d.crescimentoMensal}%`} pct={Math.min(100, Math.abs(d.crescimentoMensal))} accent="#8b5cf6" />
              <EffRing index={5} title="Eficiência" value={`${d.performance?.eficienciaMedia || 0}`} pct={(d.performance?.eficienciaMedia || 0) * 10} accent="#F97316" />
            </motion.div>
          </motion.div>

          {/* System Health */}
          <motion.div variants={fadeUp} className="rounded-xl p-3 backdrop-blur-md"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #22d3ee)' }}>
                <Server className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs font-bold text-white">Sistema</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat icon={<Database className="w-3 h-3" />} label="Total Registros" value={fmtNum(systemStats?.totalRegistros || 0)} accent="#3b82f6" />
              <MiniStat icon={<Users className="w-3 h-3" />} label="Total Usuários" value={fmtNum(systemStats?.totalUsuarios || 0)} accent="#F97316" />
              <MiniStat icon={<Activity className="w-3 h-3" />} label="Atividade 24h" value={fmtNum(systemStats?.atividadeRecente || 0)} accent="#10b981" />
              <MiniStat icon={<Signal className="w-3 h-3" />} label="Online 24h" value={fmtNum(systemStats?.usuariosRecentes || 0)} accent="#06b6d4" />
              <MiniStat icon={<Zap className="w-3 h-3" />} label="Efic. Geral" value={activityMetrics?.eficienciaGeral?.toFixed(1) || '0'} accent="#8b5cf6" />
              <MiniStat icon={<Monitor className="w-3 h-3" />} label="Online Agora" value={fmtNum(activityMetrics?.usuariosOnline || 0)} accent="#ec4899" />
            </div>
          </motion.div>
        </div>

        {/* ═══ GRÁFICOS — 4 cards ═══ */}
        <SectionHeader icon={<TrendingUp className="w-3.5 h-3.5" />} title="Gráficos"
          subtitle="Tendências, comparativos e distribuição" />

        <motion.div variants={stagger} className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* Monthly trend area */}
          <ChartCard index={0} title="Evolução Mensal" sub={`Total no ano: ${fmtNum(chartData.totalYear)} · Média: ${chartData.averageMonth}/mês`}
            icon={<TrendingUp className="w-3 h-3" />}>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.monthly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="adMonthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316" stopOpacity={0.35} />
                      <stop offset="60%" stopColor="#F97316" stopOpacity={0.05} />
                      <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="adGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={TICK} stroke="transparent" tickLine={false} />
                  <YAxis tick={TICK} stroke="transparent" tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', paddingTop: 4 }} />
                  <Area type="monotone" dataKey="clientes" name="Clientes" stroke="#F97316" fill="url(#adMonthGrad)"
                    strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#F97316', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Weekly comparison bar */}
          <ChartCard index={1} title="Comparativo Semanal" sub={`Total semana: ${fmtNum(chartData.totalWeek)} · Cresc: ${chartData.weeklyGrowth}%`}
            icon={<BarChart3 className="w-3 h-3" />}>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.weekly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={TICK} stroke="transparent" tickLine={false} />
                  <YAxis tick={TICK} stroke="transparent" tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)', rx: 4 }} />
                  <Legend wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', paddingTop: 4 }} />
                  <Bar dataKey="atual" name="Esta Semana" fill="#F97316" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="anterior" name="Semana Anterior" fill="rgba(59,130,246,0.5)" radius={[4, 4, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Approval donut */}
          <ChartCard index={2} title="Status dos Clientes" sub="Distribuição por status de aprovação"
            icon={<PieChartIcon className="w-3 h-3" />}>
            <div className="h-52 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {['#10b981', '#eab308', '#ef4444', '#8b5cf6'].map((c, i) => (
                      <linearGradient key={i} id={`adPie-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={1} />
                        <stop offset="100%" stopColor={c} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie data={d.pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}
                    cornerRadius={4} strokeWidth={0}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {d.pieData.map((_, i) => (
                      <Cell key={i} fill={`url(#adPie-${i})`} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Clients by day mini bars */}
          <ChartCard index={3} title="Atividade por Dia" sub="Clientes cadastrados por dia da semana"
            icon={<Calendar className="w-3 h-3" />}>
            <div className="h-52 px-1">
              <div className="flex items-end gap-2 h-40 pt-2">
                {chartData.weekly.map((day, i) => {
                  const max = Math.max(...chartData.weekly.map(x => x.atual), 1);
                  const isToday = new Date().getDay() === i;
                  return (
                    <div key={day.name} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold text-white/70">{day.atual}</span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(4, (day.atual / max) * 100)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06 }}
                        className="w-full rounded-t-md"
                        style={{ backgroundColor: isToday ? '#F97316' : 'rgba(59,130,246,0.35)', minHeight: 4 }}
                      />
                      <span className="text-[9px] font-bold" style={{ color: isToday ? '#F97316' : 'rgba(255,255,255,0.5)' }}>
                        {day.name}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 pt-2 border-t flex items-center justify-between" style={{ borderColor: BORDER }}>
                <span className="text-[9px] text-white/40">Dia mais ativo</span>
                <span className="text-[10px] font-bold text-white/70">
                  {chartData.weekly.reduce((best, d, i) => d.atual > chartData.weekly[best].atual ? i : best, 0) >= 0
                    ? chartData.weekly[chartData.weekly.reduce((best, d, i) => d.atual > chartData.weekly[best].atual ? i : best, 0)].name
                    : '-'}
                </span>
              </div>
            </div>
          </ChartCard>
        </motion.div>

        {/* ═══ RANKING + ALERTAS + ATIVIDADE — 3 cols ═══ */}
        <SectionHeader icon={<Trophy className="w-3.5 h-3.5" />} title="Ranking & Alertas"
          subtitle="Top performers e notificações" />

        <motion.div variants={stagger} className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* Ranking */}
          <RankingCard index={0} title="Ranking do Mês" icon={<Trophy className="w-3.5 h-3.5" />}
            items={d.rankingItems} formatValue={v => `${v} clientes`} accent="#F97316" />

          {/* Alertas */}
          <motion.div variants={fadeUp} className="rounded-xl p-4 space-y-3 backdrop-blur-md"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #ef4444, #f87171)' }}>
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-xs font-bold text-white">Atenção</p>
            </div>
            <div className="space-y-2">
              {d.aguardando.length > 0 && (
                <div className="flex items-center justify-between px-2.5 py-2 rounded-lg" style={{ backgroundColor: 'rgba(234,179,8,0.08)' }}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" style={{ color: '#eab308' }} />
                    <p className="text-[10px] font-medium text-white/70">Aguardando aprovação</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#eab308' }}>{d.aguardando.length}</span>
                </div>
              )}
              {d.clientesReprovados > 0 && (
                <div className="flex items-center justify-between px-2.5 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                    <p className="text-[10px] font-medium text-white/70">Clientes reprovados</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>{d.clientesReprovados}</span>
                </div>
              )}
              {(notifications?.notifications || []).slice(0, 3).map((n, i) => (
                <div key={i} className="flex items-center justify-between px-2.5 py-2 rounded-lg" style={{ backgroundColor: 'rgba(249,115,22,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" style={{ color: '#F97316' }} />
                    <p className="text-[10px] font-medium text-white/70 truncate max-w-[140px]">{n.title}</p>
                  </div>
                  {n.count > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#F97316' }}>{n.count}</span>
                  )}
                </div>
              ))}
              {d.aguardando.length === 0 && d.clientesReprovados === 0 && !(notifications?.notifications?.length) && (
                <div className="flex items-center gap-2 px-2.5 py-3 rounded-lg" style={{ backgroundColor: 'rgba(16,185,129,0.08)' }}>
                  <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                  <p className="text-[10px] font-medium" style={{ color: '#10b981' }}>Tudo em dia!</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Resumo rápido */}
          <motion.div variants={fadeUp} className="rounded-xl p-4 space-y-3 backdrop-blur-md"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #60a5fa)' }}>
                <Activity className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-xs font-bold text-white">Resumo do Período</p>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Cadastros hoje', value: d.clientesHoje, accent: '#3b82f6' },
                { label: 'Cadastros na semana', value: d.clientesSemana, accent: '#8b5cf6' },
                { label: 'Cadastros no mês', value: d.clientesEsteMes, accent: '#F97316' },
                { label: 'Mês anterior', value: d.clientesMesAnterior, accent: '#06b6d4' },
                { label: 'Total no ano', value: chartData.totalYear, accent: '#10b981' },
                { label: 'Média mensal', value: chartData.averageMonth, accent: '#eab308' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-md"
                  style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <span className="text-[10px] font-medium text-white/50">{item.label}</span>
                  <span className="text-[11px] font-bold" style={{ color: item.accent }}>{fmtNum(item.value)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* ═══ TABELA AGUARDANDO ═══ */}
        <SectionHeader icon={<Database className="w-3.5 h-3.5" />} title="Clientes Aguardando Aprovação"
          subtitle={`${d.aguardando.length} pendentes`} />

        <motion.div variants={fadeUp} className="rounded-2xl overflow-hidden backdrop-blur-md"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-white/70">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  {['#', 'Cliente', 'Status', 'Data Cadastro', 'Dias'].map(h => (
                    <th key={h} className="py-2.5 px-4 text-left font-semibold text-[11px] text-white/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.aguardando.length > 0 ? (
                  d.aguardando.slice(0, 10).map((cliente, idx) => {
                    const sc = getStatusColors(cliente.status);
                    const dias = Math.floor((new Date() - new Date(cliente.created_at)) / (1000 * 60 * 60 * 24));
                    const urgencia = dias > 7 ? '#ef4444' : dias > 3 ? '#eab308' : '#10b981';
                    return (
                      <motion.tr key={cliente.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ borderBottom: `1px solid ${BORDER}` }} className="transition-colors hover:bg-white/[0.03]">
                        <td className="py-2.5 px-4 text-[11px] text-white/40">{idx + 1}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                              style={{ background: ACCENT_GRADIENT }}>{cliente.nome?.charAt(0) || 'C'}</div>
                            <div>
                              <span className="font-medium text-[11px] text-white">{cliente.nome || 'Cliente'}</span>
                              <p className="text-[9px] text-white/40">ID: {cliente.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: sc.bg, color: sc.color }}>{getStatusDisplay(cliente.status)}</span>
                        </td>
                        <td className="py-2.5 px-4 text-[11px] text-white/50">
                          {cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: `${urgencia}15`, color: urgencia }}>
                            {dias}d
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-xs text-white/40">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(16,185,129,0.3)' }} />
                      Nenhum cliente aguardando aprovação
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div variants={fadeUp} className="text-center py-3">
          <span className="text-[11px] font-medium text-white/40">Atualização automática a cada 30 segundos</span>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default DashboardAdministrador;
