import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Users, UserCheck, UserPlus, Clock, AlertTriangle,
  TrendingUp, Activity, Target, BarChart3, Signal,
  CheckCircle, XCircle, Zap, Trophy, Database,
  ArrowDownRight, DollarSign, ClipboardList, Search
} from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, CartesianGrid,
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

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  const fetchAll = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      };

      const [dashRes, clientesRes] = await Promise.all([
        fetch(`${API_URL}/dashboard`, { headers }),
        fetch(`${API_URL}/clientes`, { headers }),
      ]);

      if (!dashRes.ok) throw new Error(`Erro: ${dashRes.status}`);
      if (!clientesRes.ok) throw new Error(`Erro: ${clientesRes.status}`);

      const dashData = await dashRes.json();
      const clientesData = await clientesRes.json();
      const todosClientes = clientesData.clientes || [];

      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());

      const total = todosClientes.length;
      const aprovados = todosClientes.filter(c => c.status === 'aprovado').length;
      const reprovados = todosClientes.filter(c => c.status === 'reprovado').length;
      const aguardando = todosClientes.filter(c => c.status === 'aguardando_aprovacao');
      const esteMes = todosClientes.filter(c => new Date(c.created_at) >= inicioMes).length;
      const hojeCnt = todosClientes.filter(c => new Date(c.created_at).toDateString() === hoje.toDateString()).length;
      const semanaCnt = todosClientes.filter(c => new Date(c.created_at) >= inicioSemana).length;

      const semanaPassada = new Date(inicioSemana);
      semanaPassada.setDate(semanaPassada.getDate() - 7);
      const semanaPas = todosClientes.filter(c => {
        const d = new Date(c.created_at);
        return d >= semanaPassada && d < inicioSemana;
      }).length;
      const crescSem = semanaPas > 0 ? Math.round(((semanaCnt - semanaPas) / semanaPas) * 100) : semanaCnt > 0 ? 100 : 0;

      const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesPas = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      const mesPas = todosClientes.filter(c => {
        const d = new Date(c.created_at);
        return d >= mesPassado && d <= fimMesPas;
      }).length;
      const crescMes = mesPas > 0 ? Math.round(((esteMes - mesPas) / mesPas) * 100) : esteMes > 0 ? 100 : 0;

      const txAprov = total > 0 ? Math.round((aprovados / total) * 100) : 0;
      const efic = total > 0 ? Math.round(((aprovados + aguardando.length) / total) * 10) / 10 : 0;

      const comRenda = todosClientes.filter(c => c.valor_renda && parseFloat(c.valor_renda) > 0);
      const rendas = comRenda.map(c => parseFloat(c.valor_renda));
      const rendaMedia = rendas.length > 0 ? rendas.reduce((a, b) => a + b, 0) / rendas.length : 0;
      const rendaMax = rendas.length > 0 ? Math.max(...rendas) : 0;
      const rendaMin = rendas.length > 0 ? Math.min(...rendas) : 0;

      // Chart data
      const dadosMensais = Array(12).fill(0);
      todosClientes.forEach(c => { dadosMensais[new Date(c.created_at).getMonth()]++; });
      const dadosSemanais = Array(7).fill(0);
      todosClientes.forEach(c => { dadosSemanais[new Date(c.created_at).getDay()]++; });

      const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      const dias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

      // Ranking
      const rankingItems = (dashData.top5Usuarios || []).map(item => {
        const u = item.user || {};
        const first = u.first_name || '';
        const last = u.last_name || '';
        return {
          id: u.id,
          name: first && last ? `${first} ${last}` : first || last || 'Usuário',
          value: item.clientes || 0,
        };
      });

      // Pie data
      const pieData = [
        { name: 'Aprovados', value: aprovados },
        { name: 'Aguardando', value: aguardando.length },
        { name: 'Reprovados', value: reprovados },
      ].filter(x => x.value > 0);

      setDashboardData({
        totalCorretores: dashData.totalCorretores || 0,
        totalCorrespondentes: dashData.totalCorrespondentes || 0,
        total, aprovados, reprovados, aguardando,
        esteMes, hojeCnt, semanaCnt, crescSem, crescMes,
        txAprov, efic, rendaMedia, rendaMax, rendaMin, comRenda: comRenda.length,
        usuariosAtivosHoje: dashData.usuariosAtivosHoje || 0,
        rankingItems, pieData,
        monthly: meses.map((l, i) => ({ name: l, clientes: dadosMensais[i] })),
        weekly: dias.map((l, i) => ({ name: l, clientes: dadosSemanais[i] })),
      });
      setError(null);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

      {/* ── Header ──────────────────────────────────────────────────────── */}
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

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <motion.div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4"
        initial="hidden" animate="show" variants={stagger}>

        {/* ═══ VISÃO GERAL ═══ */}
        <SectionHeader icon={<BarChart3 className="w-3.5 h-3.5" />} title="Visão Geral"
          subtitle={new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} />

        <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <KPICard index={0} title="Total Clientes" value={fmtNum(d.total)}
            sub={`${d.hojeCnt} hoje`}
            icon={<Users className="w-4 h-4" />} accent="#3b82f6"
            trend={d.crescMes} />
          <KPICard index={1} title="Correspondentes"
            value={fmtNum(d.totalCorretores)}
            sub="cadastrados"
            icon={<ClipboardList className="w-4 h-4" />} accent="#F97316" />
          <KPICard index={2} title="Aguardando" value={fmtNum(d.aguardando.length)}
            sub="aprovação"
            icon={<Clock className="w-4 h-4" />} accent="#eab308" />
          <KPICard index={3} title="Aprovados" value={fmtNum(d.aprovados)}
            sub={`${pctAprov}%`}
            icon={<CheckCircle className="w-4 h-4" />} accent="#10b981" />
          <KPICard index={4} title="Reprovados" value={fmtNum(d.reprovados)}
            sub={`${pctRejeit}%`}
            icon={<XCircle className="w-4 h-4" />} accent="#ef4444" />
          <KPICard index={5} title="Online"
            value={fmtNum(d.usuariosAtivosHoje)}
            sub="ativos agora"
            icon={<Signal className="w-4 h-4" />} accent="#06b6d4" />
        </motion.div>

        {/* ═══ MÉTRICAS ═══ */}
        <SectionHeader icon={<Activity className="w-3.5 h-3.5" />} title="Métricas"
          subtitle="Performance e renda" />

        <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <KPICard index={0} title="Este Mês" value={fmtNum(d.esteMes)}
            icon={<UserPlus className="w-4 h-4" />} accent="#3b82f6"
            trend={d.crescMes} />
          <KPICard index={1} title="Semana" value={fmtNum(d.semanaCnt)}
            icon={<Activity className="w-4 h-4" />} accent="#8b5cf6"
            trend={d.crescSem} />
          <KPICard index={2} title="Aprovação" value={fmtPct(d.txAprov)}
            icon={<Target className="w-4 h-4" />} accent="#10b981" />
          <KPICard index={3} title="Eficiência" value={`${d.efic}`}
            icon={<Zap className="w-4 h-4" />} accent="#06b6d4" />
          <KPICard index={4} title="Renda Média" value={fmtR$(d.rendaMedia)}
            icon={<DollarSign className="w-4 h-4" />} accent="#F97316" />
          <KPICard index={5} title="Renda Máxima" value={fmtR$(d.rendaMax)}
            icon={<TrendingUp className="w-4 h-4" />} accent="#eab308" />
          <KPICard index={6} title="Renda Mínima" value={fmtR$(d.rendaMin)}
            icon={<ArrowDownRight className="w-4 h-4" />} accent="#ec4899" />
          <KPICard index={7} title="Com Renda" value={fmtNum(d.comRenda)}
            sub="clientes"
            icon={<UserCheck className="w-4 h-4" />} accent="#8b5cf6" />
        </motion.div>

        {/* ═══ PERFORMANCE + RESUMO ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <motion.div variants={fadeUp} className="rounded-xl p-3 backdrop-blur-md"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: ACCENT_GRADIENT }}>
                <Target className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs font-bold text-white">Performance</p>
            </div>
            <motion.div variants={stagger} className="grid grid-cols-3 gap-2">
              <EffRing index={0} title="Aprovação" value={fmtPct(pctAprov)} pct={pctAprov} accent="#10b981" />
              <EffRing index={1} title="Rejeição" value={fmtPct(pctRejeit)} pct={pctRejeit} accent="#ef4444" />
              <EffRing index={2} title="Aguardando" value={fmtPct(pctAguar)} pct={pctAguar} accent="#eab308" />
              <EffRing index={3} title="Cresc. Semanal" value={`${d.crescSem}%`} pct={Math.abs(d.crescSem)} accent="#3b82f6" />
              <EffRing index={4} title="Cresc. Mensal" value={`${d.crescMes}%`} pct={Math.abs(d.crescMes)} accent="#8b5cf6" />
              <EffRing index={5} title="Eficiência" value={`${d.efic}`} pct={d.efic * 10} accent="#F97316" />
            </motion.div>
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-xl p-3 backdrop-blur-md"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
                <BarChart3 className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs font-bold text-white">Resumo</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat icon={<Users className="w-3 h-3" />} label="Total Clientes" value={fmtNum(d.total)} accent="#3b82f6" />
              <MiniStat icon={<ClipboardList className="w-3 h-3" />} label="Correspondentes" value={fmtNum(d.totalCorretores)} accent="#F97316" />
              <MiniStat icon={<Signal className="w-3 h-3" />} label="Online Hoje" value={fmtNum(d.usuariosAtivosHoje)} accent="#06b6d4" />
              <MiniStat icon={<CheckCircle className="w-3 h-3" />} label="Aprovados" value={fmtNum(d.aprovados)} accent="#10b981" />
              <MiniStat icon={<Clock className="w-3 h-3" />} label="Aguardando" value={fmtNum(d.aguardando.length)} accent="#eab308" />
              <MiniStat icon={<XCircle className="w-3 h-3" />} label="Reprovados" value={fmtNum(d.reprovados)} accent="#ef4444" />
            </div>
          </motion.div>
        </div>

        {/* ═══ GRÁFICOS ═══ */}
        <SectionHeader icon={<TrendingUp className="w-3.5 h-3.5" />} title="Gráficos"
          subtitle="Tendências e distribuição" />

        <motion.div variants={stagger} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard index={0} title="Evolução Mensal" sub="Todos os clientes por mês"
            icon={<TrendingUp className="w-3 h-3" />}>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.monthly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="corrpMGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={TICK} stroke="transparent" tickLine={false} />
                  <YAxis tick={TICK} stroke="transparent" tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="clientes" name="Clientes" stroke="#F97316" fill="url(#corrpMGrad)"
                    strokeWidth={2} dot={false}
                    activeDot={{ r: 4, fill: '#F97316', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard index={1} title="Distribuição Semanal" sub="Clientes por dia da semana"
            icon={<BarChart3 className="w-3 h-3" />}>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.weekly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="corrpWBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316" stopOpacity={1} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.65} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={TICK} stroke="transparent" tickLine={false} />
                  <YAxis tick={TICK} stroke="transparent" tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)', rx: 4 }} />
                  <Bar dataKey="clientes" name="Clientes" fill="url(#corrpWBar)" radius={[5, 5, 1, 1]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Pie chart */}
          <ChartCard index={2} title="Status dos Clientes" sub="Distribuição por status"
            icon={<Target className="w-3 h-3" />}>
            <div className="h-48 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={72} innerRadius={40} paddingAngle={2}
                    cornerRadius={3} strokeWidth={0}
                    label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {d.pieData.map((_, i) => {
                      const colors = ['#10b981', '#eab308', '#ef4444'];
                      return <Cell key={i} fill={colors[i] || PALETTE[i % PALETTE.length]} />;
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Ranking */}
          <RankingCard index={0} title="Ranking do Mês" icon={<Trophy className="w-3.5 h-3.5" />}
            items={d.rankingItems} formatValue={v => `${v} clientes`} accent="#F97316" />
        </motion.div>

        {/* ═══ CLIENTES AGUARDANDO ═══ */}
        <SectionHeader icon={<Database className="w-3.5 h-3.5" />} title="Clientes Aguardando Aprovação"
          subtitle={`${d.aguardando.length} pendentes`} />

        <motion.div variants={fadeUp} className="rounded-2xl overflow-hidden backdrop-blur-md"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-white/70">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  {['Cliente', 'Status', 'Data'].map(h => (
                    <th key={h} className="py-2.5 px-4 text-left font-semibold text-[11px] text-white/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.aguardando.length > 0 ? (
                  d.aguardando.slice(0, 8).map((cliente) => {
                    const sc = getStatusColors(cliente.status);
                    return (
                      <motion.tr key={cliente.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ borderBottom: `1px solid ${BORDER}` }}
                        className="transition-colors hover:bg-white/[0.03]">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                              style={{ background: ACCENT_GRADIENT }}>
                              {cliente.nome?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <span className="font-medium text-[11px] text-white">{cliente.nome || 'Cliente'}</span>
                              <p className="text-[9px] text-white/40">ID: {cliente.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: sc.bg, color: sc.color }}>
                            {getStatusDisplay(cliente.status)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[11px] text-white/50">
                          {cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('pt-BR') : '-'}
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-xs text-white/40">
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
          <span className="text-[11px] font-medium text-white/40">
            Atualização automática a cada 30 segundos
          </span>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default DashboardCorrespondente;
