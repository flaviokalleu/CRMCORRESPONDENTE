import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Users, UserCheck, UserPlus, Clock, AlertTriangle,
  TrendingUp, TrendingDown, Activity, Target, BarChart3, Signal,
  CheckCircle, XCircle, Zap, Trophy, Database, Calendar,
  ArrowDownRight, DollarSign, ClipboardList, Gauge, Globe,
  Wallet, Award, Bell, Server, Monitor, Star,
  PieChart as PieChartIcon
} from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, Legend,
} from "recharts";
import {
  KPICard, MiniStat, EffRing, ChartCard, SectionHeader, RankingCard,
  CustomTooltip, DashboardLoading, DashboardError,
  CARD, BORDER, ACCENT_GRADIENT, PALETTE, TICK,
  fadeUp, stagger, fmtNum, fmtPct, fmtR$,
  getStatusDisplay, getStatusColors,
} from "./shared/DashboardUI";

const DashboardCorrespondente = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

  const fetchAll = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const headers = { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' };

      const [dashRes, clientesRes, monthlyRes, weeklyRes, sysRes] = await Promise.all([
        fetch(`${API_URL}/dashboard`, { headers }),
        fetch(`${API_URL}/clientes`, { headers }),
        fetch(`${API_URL}/dashboard/monthly`, { headers }).catch(() => null),
        fetch(`${API_URL}/dashboard/weekly`, { headers }).catch(() => null),
        fetch(`${API_URL}/dashboard/system-stats`, { headers }).catch(() => null),
      ]);

      if (!dashRes.ok) throw new Error(`Erro: ${dashRes.status}`);
      if (!clientesRes.ok) throw new Error(`Erro: ${clientesRes.status}`);

      const dashData = await dashRes.json();
      const clientesData = await clientesRes.json();
      const todosClientes = clientesData.clientes || [];

      // Monthly/weekly from API
      let monthlyApiData = null, weeklyApiData = null, sysStats = null;
      if (monthlyRes?.ok) monthlyApiData = await monthlyRes.json();
      if (weeklyRes?.ok) weeklyApiData = await weeklyRes.json();
      if (sysRes?.ok) sysStats = await sysRes.json();

      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioSemana = new Date(hoje); inicioSemana.setDate(hoje.getDate() - hoje.getDay());

      const total = todosClientes.length;
      const aprovados = todosClientes.filter(c => c.status === 'aprovado').length;
      const reprovados = todosClientes.filter(c => c.status === 'reprovado').length;
      const aguardando = todosClientes.filter(c => c.status === 'aguardando_aprovacao');
      const pendentes = todosClientes.filter(c => c.status === 'pendente').length;
      const esteMes = todosClientes.filter(c => new Date(c.created_at) >= inicioMes).length;
      const hojeCnt = todosClientes.filter(c => new Date(c.created_at).toDateString() === hoje.toDateString()).length;
      const semanaCnt = todosClientes.filter(c => new Date(c.created_at) >= inicioSemana).length;

      // Growth
      const semanaPassada = new Date(inicioSemana); semanaPassada.setDate(semanaPassada.getDate() - 7);
      const semanaPas = todosClientes.filter(c => { const d = new Date(c.created_at); return d >= semanaPassada && d < inicioSemana; }).length;
      const crescSem = semanaPas > 0 ? Math.round(((semanaCnt - semanaPas) / semanaPas) * 100) : semanaCnt > 0 ? 100 : 0;
      const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesPas = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      const mesPas = todosClientes.filter(c => { const d = new Date(c.created_at); return d >= mesPassado && d <= fimMesPas; }).length;
      const crescMes = mesPas > 0 ? Math.round(((esteMes - mesPas) / mesPas) * 100) : esteMes > 0 ? 100 : 0;

      const txAprov = total > 0 ? Math.round((aprovados / total) * 100) : 0;
      const txRejeit = total > 0 ? Math.round((reprovados / total) * 100) : 0;
      const efic = total > 0 ? Math.round(((aprovados + pendentes) / total) * 10) / 10 : 0;

      // Renda
      const comRenda = todosClientes.filter(c => c.valor_renda && parseFloat(c.valor_renda) > 0);
      const rendas = comRenda.map(c => parseFloat(c.valor_renda));
      const rendaMedia = rendas.length > 0 ? rendas.reduce((a, b) => a + b, 0) / rendas.length : 0;
      const rendaMax = rendas.length > 0 ? Math.max(...rendas) : 0;
      const rendaMin = rendas.length > 0 ? Math.min(...rendas) : 0;
      const rendaTotal = rendas.reduce((a, b) => a + b, 0);

      // Chart data — prefer API data, fallback to client-side calc
      const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      const dias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

      let monthlyArr = monthlyApiData?.monthlyData || Array(12).fill(0);
      if (!monthlyApiData) {
        todosClientes.forEach(c => { monthlyArr[new Date(c.created_at).getMonth()]++; });
      }
      const monthlyGrowth = monthlyApiData?.monthlyGrowth || Array(12).fill(0);

      let weeklyArr = weeklyApiData?.weeklyData || Array(7).fill(0);
      let prevWeekArr = weeklyApiData?.previousWeekData || Array(7).fill(0);
      if (!weeklyApiData) {
        todosClientes.forEach(c => { weeklyArr[new Date(c.created_at).getDay()]++; });
      }

      // Status breakdown
      const statusCount = {};
      todosClientes.forEach(c => { statusCount[c.status] = (statusCount[c.status] || 0) + 1; });
      const statusData = Object.entries(statusCount)
        .map(([status, count]) => ({ status, name: getStatusDisplay(status), count }))
        .sort((a, b) => b.count - a.count);

      // Ranking
      const rankingItems = (dashData.top5Usuarios || []).map(item => {
        const u = item.user || {};
        return {
          id: u.id,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Usuário',
          value: item.clientes || 0,
        };
      });

      // Pie
      const pieData = [
        { name: 'Aprovados', value: aprovados },
        { name: 'Aguardando', value: aguardando.length },
        { name: 'Reprovados', value: reprovados },
        { name: 'Outros', value: Math.max(0, total - aprovados - aguardando.length - reprovados) },
      ].filter(x => x.value > 0);

      setDashboardData({
        totalCorretores: dashData.totalCorretores || 0,
        totalCorrespondentes: dashData.totalCorrespondentes || 0,
        total, aprovados, reprovados, aguardando, pendentes,
        esteMes, hojeCnt, semanaCnt, crescSem, crescMes, mesPas,
        txAprov, txRejeit, efic,
        rendaMedia, rendaMax, rendaMin, rendaTotal, comRenda: comRenda.length,
        usuariosAtivosHoje: dashData.usuariosAtivosHoje || 0,
        performance: dashData.performance || {},
        rankingItems, pieData, statusData,
        sysStats: sysStats || {},
        monthly: meses.map((l, i) => ({ name: l, clientes: monthlyArr[i] || 0 })),
        weekly: dias.map((l, i) => ({ name: l, atual: weeklyArr[i] || 0, anterior: prevWeekArr[i] || 0 })),
        totalYear: monthlyApiData?.totalYear || monthlyArr.reduce((a, b) => a + b, 0),
        averageMonth: monthlyApiData?.averageMonth || Math.round(monthlyArr.reduce((a, b) => a + b, 0) / 12),
        totalWeek: weeklyApiData?.totalWeek || weeklyArr.reduce((a, b) => a + b, 0),
        weeklyGrowth: weeklyApiData?.weeklyGrowth || crescSem,
      });
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }, [API_URL]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) return <DashboardLoading title="Dashboard Correspondente" />;
  if (error || !dashboardData) return <DashboardError error={error} onRetry={() => { setLoading(true); fetchAll(); }} />;

  const d = dashboardData;
  const total3 = d.aprovados + d.reprovados + d.aguardando.length;
  const pctAprov = total3 > 0 ? Math.round((d.aprovados / total3) * 100) : 0;
  const pctRejeit = total3 > 0 ? Math.round((d.reprovados / total3) * 100) : 0;
  const pctAguar = total3 > 0 ? Math.round((d.aguardando.length / total3) * 100) : 0;
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-caixa-gradient min-h-screen">

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 border-b backdrop-blur-md"
        style={{ borderColor: BORDER, backgroundColor: CARD }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: ACCENT_GRADIENT }}>
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Dashboard Correspondente</h1>
            <p className="text-[11px] text-white/50">{today}</p>
          </div>
        </div>
        <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 2.5 }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
          style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
          <Signal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ao vivo</span>
        </motion.div>
      </div>

      {/* Content */}
      <motion.div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4" initial="hidden" animate="show" variants={stagger}>

        {/* --- VISÃO GERAL — 6 KPIs --- */}
        <SectionHeader icon={<BarChart3 className="w-3.5 h-3.5" />} title="Visão Geral"
          subtitle={new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} />

        <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <KPICard index={0} title="Total Clientes" value={fmtNum(d.total)} sub={`${d.hojeCnt} hoje`}
            icon={<Users className="w-4 h-4" />} accent="#3b82f6" trend={d.crescMes} />
          <KPICard index={1} title="Correspondentes" value={fmtNum(d.totalCorretores)} sub="cadastrados"
            icon={<ClipboardList className="w-4 h-4" />} accent="#F97316" />
          <KPICard index={2} title="Aguardando" value={fmtNum(d.aguardando.length)} sub="aprovação"
            icon={<Clock className="w-4 h-4" />} accent="#eab308" />
          <KPICard index={3} title="Aprovados" value={fmtNum(d.aprovados)} sub={`${pctAprov}%`}
            icon={<CheckCircle className="w-4 h-4" />} accent="#10b981" />
          <KPICard index={4} title="Reprovados" value={fmtNum(d.reprovados)} sub={`${pctRejeit}%`}
            icon={<XCircle className="w-4 h-4" />} accent="#ef4444" />
          <KPICard index={5} title="Online" value={fmtNum(d.usuariosAtivosHoje)} sub="ativos agora"
            icon={<Signal className="w-4 h-4" />} accent="#06b6d4" />
        </motion.div>

        {/* --- MÉTRICAS DETALHADAS — 8 KPIs --- */}
        <SectionHeader icon={<Activity className="w-3.5 h-3.5" />} title="Métricas Detalhadas"
          subtitle="Crescimento, performance e atividade" />

        <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <KPICard index={0} title="Hoje" value={fmtNum(d.hojeCnt)} sub="cadastros"
            icon={<UserPlus className="w-4 h-4" />} accent="#3b82f6" />
          <KPICard index={1} title="Semana" value={fmtNum(d.semanaCnt)}
            icon={<Calendar className="w-4 h-4" />} accent="#8b5cf6" trend={d.crescSem} />
          <KPICard index={2} title="Este Mês" value={fmtNum(d.esteMes)} sub={`ant: ${d.mesPas}`}
            icon={<Activity className="w-4 h-4" />} accent="#06b6d4" trend={d.crescMes} />
          <KPICard index={3} title="No Ano" value={fmtNum(d.totalYear)} sub={`média: ${d.averageMonth}/mês`}
            icon={<Globe className="w-4 h-4" />} accent="#10b981" />
          <KPICard index={4} title="Aprovação" value={fmtPct(d.txAprov)}
            icon={<Target className="w-4 h-4" />} accent="#10b981" />
          <KPICard index={5} title="Rejeição" value={fmtPct(d.txRejeit)}
            icon={<TrendingDown className="w-4 h-4" />} accent="#ef4444" />
          <KPICard index={6} title="Eficiência" value={`${d.efic}`}
            icon={<Zap className="w-4 h-4" />} accent="#F97316" />
          <KPICard index={7} title="Usuários" value={fmtNum(d.performance?.totalUsuarios || d.sysStats?.totalUsuarios || 0)}
            sub="no sistema" icon={<UserCheck className="w-4 h-4" />} accent="#ec4899" />
        </motion.div>

        {/* --- RENDA — 4 KPIs --- */}
        <SectionHeader icon={<DollarSign className="w-3.5 h-3.5" />} title="Análise Financeira"
          subtitle="Perfil de renda dos clientes" />

        <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <KPICard index={0} title="Renda Média" value={fmtR$(d.rendaMedia)} icon={<DollarSign className="w-4 h-4" />} accent="#10b981" />
          <KPICard index={1} title="Renda Máxima" value={fmtR$(d.rendaMax)} icon={<TrendingUp className="w-4 h-4" />} accent="#3b82f6" />
          <KPICard index={2} title="Renda Mínima" value={fmtR$(d.rendaMin)} icon={<TrendingDown className="w-4 h-4" />} accent="#eab308" />
          <KPICard index={3} title="Renda Total" value={fmtR$(d.rendaTotal)} sub={`${d.comRenda} informaram`}
            icon={<Wallet className="w-4 h-4" />} accent="#8b5cf6" />
        </motion.div>

        {/* --- PERFORMANCE + SISTEMA — 2 cols --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <motion.div variants={fadeUp} className="rounded-xl p-3 backdrop-blur-md"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: ACCENT_GRADIENT }}>
                <Gauge className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs font-bold text-white">Performance</p>
            </div>
            <motion.div variants={stagger} className="grid grid-cols-3 gap-2">
              <EffRing index={0} title="Aprovação" value={fmtPct(pctAprov)} pct={pctAprov} accent="#10b981" />
              <EffRing index={1} title="Rejeição" value={fmtPct(pctRejeit)} pct={pctRejeit} accent="#ef4444" />
              <EffRing index={2} title="Aguardando" value={fmtPct(pctAguar)} pct={pctAguar} accent="#eab308" />
              <EffRing index={3} title="Cresc. Semanal" value={`${d.crescSem}%`} pct={Math.min(100, Math.abs(d.crescSem))} accent="#3b82f6" />
              <EffRing index={4} title="Cresc. Mensal" value={`${d.crescMes}%`} pct={Math.min(100, Math.abs(d.crescMes))} accent="#8b5cf6" />
              <EffRing index={5} title="Eficiência" value={`${d.efic}`} pct={d.efic * 10} accent="#F97316" />
            </motion.div>
          </motion.div>

          {/* Status breakdown bars */}
          <motion.div variants={fadeUp} className="rounded-xl p-3 backdrop-blur-md"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                <BarChart3 className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs font-bold text-white">Distribuição por Status</p>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {d.statusData.map((s, i) => {
                const max = Math.max(...d.statusData.map(x => x.count), 1);
                const sc = getStatusColors(s.status);
                return (
                  <div key={s.status} className="flex items-center gap-2">
                    <span className="text-[9px] font-medium w-28 text-right flex-shrink-0 truncate text-white/50">{s.name}</span>
                    <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(s.count / max) * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06 }}
                        className="h-full rounded-full flex items-center justify-end pr-1.5"
                        style={{ backgroundColor: sc.color, minWidth: s.count > 0 ? 20 : 0 }}>
                        {s.count > 0 && <span className="text-[8px] font-bold text-white">{s.count}</span>}
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* --- GRÁFICOS — 4 --- */}
        <SectionHeader icon={<TrendingUp className="w-3.5 h-3.5" />} title="Gráficos"
          subtitle="Tendências, comparativos e distribuição" />

        <motion.div variants={stagger} className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* Monthly area */}
          <ChartCard index={0} title="Evolução Mensal" sub={`Total no ano: ${fmtNum(d.totalYear)} · Média: ${d.averageMonth}/mês`}
            icon={<TrendingUp className="w-3 h-3" />}>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.monthly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="corrpMonthG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={TICK} stroke="transparent" tickLine={false} />
                  <YAxis tick={TICK} stroke="transparent" tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="clientes" name="Clientes" stroke="#F97316" fill="url(#corrpMonthG)"
                    strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#F97316', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Weekly comparison */}
          <ChartCard index={1} title="Comparativo Semanal" sub={`Total semana: ${fmtNum(d.totalWeek)} · Cresc: ${d.weeklyGrowth}%`}
            icon={<BarChart3 className="w-3 h-3" />}>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.weekly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
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

          {/* Pie chart */}
          <ChartCard index={2} title="Status dos Clientes" sub="Distribuição por status de aprovação"
            icon={<PieChartIcon className="w-3 h-3" />}>
            <div className="h-52 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {['#10b981', '#eab308', '#ef4444', '#8b5cf6'].map((c, i) => (
                      <linearGradient key={i} id={`corrpPie-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={1} />
                        <stop offset="100%" stopColor={c} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie data={d.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={80} innerRadius={45} paddingAngle={3} cornerRadius={4} strokeWidth={0}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {d.pieData.map((_, i) => <Cell key={i} fill={`url(#corrpPie-${i})`} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Day activity mini bars */}
          <ChartCard index={3} title="Atividade por Dia" sub="Clientes cadastrados por dia da semana"
            icon={<Calendar className="w-3 h-3" />}>
            <div className="h-52 px-1">
              <div className="flex items-end gap-2 h-40 pt-2">
                {d.weekly.map((day, i) => {
                  const max = Math.max(...d.weekly.map(x => x.atual), 1);
                  const isToday = new Date().getDay() === i;
                  return (
                    <div key={day.name} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] font-bold text-white/70">{day.atual}</span>
                      <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(4, (day.atual / max) * 100)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06 }}
                        className="w-full rounded-t-md"
                        style={{ backgroundColor: isToday ? '#F97316' : 'rgba(59,130,246,0.35)', minHeight: 4 }} />
                      <span className="text-[9px] font-bold" style={{ color: isToday ? '#F97316' : 'rgba(255,255,255,0.5)' }}>{day.name}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 pt-2 border-t flex items-center justify-between" style={{ borderColor: BORDER }}>
                <span className="text-[9px] text-white/40">Dia mais ativo</span>
                <span className="text-[10px] font-bold text-white/70">
                  {d.weekly[d.weekly.reduce((best, x, i) => x.atual > d.weekly[best].atual ? i : best, 0)]?.name || '-'}
                </span>
              </div>
            </div>
          </ChartCard>
        </motion.div>

        {/* --- RANKING + ALERTAS + RESUMO — 3 cols --- */}
        <SectionHeader icon={<Trophy className="w-3.5 h-3.5" />} title="Ranking & Resumo"
          subtitle="Top performers e indicadores" />

        <motion.div variants={stagger} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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
              {d.reprovados > 0 && (
                <div className="flex items-center justify-between px-2.5 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                    <p className="text-[10px] font-medium text-white/70">Clientes reprovados</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>{d.reprovados}</span>
                </div>
              )}
              {d.aguardando.length === 0 && d.reprovados === 0 && (
                <div className="flex items-center gap-2 px-2.5 py-3 rounded-lg" style={{ backgroundColor: 'rgba(16,185,129,0.08)' }}>
                  <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                  <p className="text-[10px] font-medium" style={{ color: '#10b981' }}>Tudo em dia!</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Resumo */}
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
                { label: 'Cadastros hoje', value: d.hojeCnt, accent: '#3b82f6' },
                { label: 'Cadastros na semana', value: d.semanaCnt, accent: '#8b5cf6' },
                { label: 'Cadastros no mês', value: d.esteMes, accent: '#F97316' },
                { label: 'Mês anterior', value: d.mesPas, accent: '#06b6d4' },
                { label: 'Total no ano', value: d.totalYear, accent: '#10b981' },
                { label: 'Média mensal', value: d.averageMonth, accent: '#eab308' },
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

        {/* --- TABELA AGUARDANDO --- */}
        <SectionHeader icon={<Database className="w-3.5 h-3.5" />} title="Clientes Aguardando Aprovação"
          subtitle={`${d.aguardando.length} pendentes`} />

        <motion.div variants={fadeUp} className="rounded-2xl overflow-hidden backdrop-blur-md"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-white/70">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  {['#', 'Cliente', 'Status', 'Data', 'Dias'].map(h => (
                    <th key={h} className="py-2.5 px-4 text-left font-semibold text-[11px] text-white/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.aguardando.length > 0 ? (
                  d.aguardando.slice(0, 10).map((cliente, idx) => {
                    const sc = getStatusColors(cliente.status);
                    const dias = Math.floor((new Date() - new Date(cliente.created_at)) / (1000 * 60 * 60 * 24));
                    const urg = dias > 7 ? '#ef4444' : dias > 3 ? '#eab308' : '#10b981';
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
                            style={{ backgroundColor: `${urg}15`, color: urg }}>{dias}d</span>
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

        <motion.div variants={fadeUp} className="text-center py-3">
          <span className="text-[11px] font-medium text-white/40">Atualização automática a cada 30 segundos</span>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default DashboardCorrespondente;
