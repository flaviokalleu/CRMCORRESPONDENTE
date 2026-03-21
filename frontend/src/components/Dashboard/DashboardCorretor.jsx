import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Users, UserCheck, UserPlus, Clock, AlertTriangle,
  TrendingUp, Activity, Target, BarChart3,
  CheckCircle, XCircle, Zap, RefreshCw, Calendar,
  ArrowDownRight, DollarSign, ClipboardList, Eye,
  Award, Star
} from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import {
  KPICard, MiniStat, EffRing, ChartCard, SectionHeader,
  CustomTooltip, DashboardLoading, DashboardError,
  CARD, BORDER, ACCENT_GRADIENT, TICK,
  fadeUp, stagger, fmtNum, fmtPct, fmtR$,
  getStatusDisplay, getStatusColors,
} from "./shared/DashboardUI";

const DashboardCorretor = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setRefreshing(true);
      const authToken = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      };

      const res = await fetch(`${API_URL}/clientes?created_by=${user.id}`, { headers });
      if (!res.ok) throw new Error(`Erro ao buscar clientes: ${res.status}`);
      const data = await res.json();
      const meusClientes = data.clientes || [];

      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());

      const total = meusClientes.length;
      const aprovados = meusClientes.filter(c => c.status === 'aprovado').length;
      const reprovados = meusClientes.filter(c => c.status === 'reprovado').length;
      const aguardando = meusClientes.filter(c => c.status === 'aguardando_aprovacao' || c.status === 'pendente');
      const esteMes = meusClientes.filter(c => new Date(c.created_at) >= inicioMes).length;
      const hojeCnt = meusClientes.filter(c => new Date(c.created_at).toDateString() === hoje.toDateString()).length;
      const semanaCnt = meusClientes.filter(c => new Date(c.created_at) >= inicioSemana).length;

      const semanaPassada = new Date(inicioSemana);
      semanaPassada.setDate(semanaPassada.getDate() - 7);
      const semanaPas = meusClientes.filter(c => {
        const d = new Date(c.created_at);
        return d >= semanaPassada && d < inicioSemana;
      }).length;
      const crescSem = semanaPas > 0 ? Math.round(((semanaCnt - semanaPas) / semanaPas) * 100) : semanaCnt > 0 ? 100 : 0;

      const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesPas = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      const mesPas = meusClientes.filter(c => {
        const d = new Date(c.created_at);
        return d >= mesPassado && d <= fimMesPas;
      }).length;
      const crescMes = mesPas > 0 ? Math.round(((esteMes - mesPas) / mesPas) * 100) : esteMes > 0 ? 100 : 0;

      const txAprov = total > 0 ? Math.round((aprovados / total) * 100) : 0;
      const efic = total > 0 ? Math.round(((aprovados + aguardando.length) / total) * 10) / 10 : 0;

      const comRenda = meusClientes.filter(c => c.valor_renda && parseFloat(c.valor_renda) > 0);
      const rendas = comRenda.map(c => parseFloat(c.valor_renda));
      const rendaMedia = rendas.length > 0 ? rendas.reduce((a, b) => a + b, 0) / rendas.length : 0;
      const rendaMax = rendas.length > 0 ? Math.max(...rendas) : 0;
      const rendaMin = rendas.length > 0 ? Math.min(...rendas) : 0;

      // Chart data
      const dadosMensais = Array(12).fill(0);
      meusClientes.forEach(c => { dadosMensais[new Date(c.created_at).getMonth()]++; });
      const dadosSemanais = Array(7).fill(0);
      meusClientes.forEach(c => { dadosSemanais[new Date(c.created_at).getDay()]++; });

      const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
      const dias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

      setDashboardData({
        total, aprovados, reprovados, aguardando,
        esteMes, hojeCnt, semanaCnt, crescSem, crescMes,
        txAprov, efic, rendaMedia, rendaMax, rendaMin, comRenda: comRenda.length,
        meusClientesAprovados: meusClientes.filter(c => c.status === 'aprovado'),
        monthly: meses.map((l, i) => ({ name: l, clientes: dadosMensais[i] })),
        weekly: dias.map((l, i) => ({ name: l, clientes: dadosSemanais[i] })),
      });
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, API_URL]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const metaMensal = 50;

  if (loading) return <DashboardLoading title="suas métricas" />;
  if (error || !dashboardData) return <DashboardError error={error} onRetry={fetchDashboardData} />;

  const d = dashboardData;
  const performanceScore = Math.round((d.txAprov + d.efic * 10) / 2);
  const metaPct = Math.min(100, Math.round((d.esteMes / metaMensal) * 100));

  return (
    <div className="h-full flex flex-col overflow-hidden bg-caixa-gradient min-h-screen">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 border-b backdrop-blur-md"
        style={{ borderColor: BORDER, backgroundColor: CARD }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ background: ACCENT_GRADIENT }}>
            {user?.first_name?.charAt(0) || 'C'}
          </div>
          <div>
            <h1 className="text-base font-bold text-white">
              Meu Dashboard — {user?.first_name || 'Corretor'}
            </h1>
            <p className="text-[11px] text-white/50">Métricas pessoais de clientes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDashboardData} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}` }}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <div className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
            style={{ backgroundColor: 'rgba(249,115,22,0.12)', color: '#F97316' }}>
            {d.txAprov}% aprovação
          </div>
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <motion.div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4"
        initial="hidden" animate="show" variants={stagger}>

        {/* ═══ KPIs PESSOAIS ═══ */}
        <SectionHeader icon={<BarChart3 className="w-3.5 h-3.5" />} title="Minha Visão Geral"
          subtitle={`${d.total} clientes no total`} />

        <motion.div variants={stagger} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <KPICard index={0} title="Meus Clientes" value={fmtNum(d.total)}
            sub={`${d.hojeCnt} hoje`}
            icon={<Users className="w-4 h-4" />} accent="#3b82f6"
            trend={d.crescSem} />
          <KPICard index={1} title="Este Mês" value={fmtNum(d.esteMes)}
            sub={`meta: ${metaMensal}`}
            icon={<Calendar className="w-4 h-4" />} accent="#F97316"
            trend={d.crescMes} />
          <KPICard index={2} title="Aguardando" value={fmtNum(d.aguardando.length)}
            sub="aprovação"
            icon={<Clock className="w-4 h-4" />} accent="#eab308" />
          <KPICard index={3} title="Aprovados" value={fmtNum(d.aprovados)}
            sub={`${d.txAprov}%`}
            icon={<CheckCircle className="w-4 h-4" />} accent="#10b981" />
          <KPICard index={4} title="Reprovados" value={fmtNum(d.reprovados)}
            icon={<XCircle className="w-4 h-4" />} accent="#ef4444" />
          <KPICard index={5} title="Meta Mensal" value={`${metaPct}%`}
            sub={`${d.esteMes}/${metaMensal}`}
            icon={<Target className="w-4 h-4" />} accent="#8b5cf6" />
        </motion.div>

        {/* ═══ PERFORMANCE RINGS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <motion.div variants={fadeUp} className="rounded-xl p-3 backdrop-blur-md"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: ACCENT_GRADIENT }}>
                <Award className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs font-bold text-white">Minha Performance</p>
            </div>
            <motion.div variants={stagger} className="grid grid-cols-3 gap-2">
              <EffRing index={0} title="Aprovação" value={fmtPct(d.txAprov)} pct={d.txAprov} accent="#10b981" />
              <EffRing index={1} title="Performance" value={`${performanceScore}%`} pct={performanceScore} accent="#3b82f6" />
              <EffRing index={2} title="Meta" value={`${metaPct}%`} pct={metaPct} accent="#F97316" />
            </motion.div>
          </motion.div>

          <motion.div variants={fadeUp} className="rounded-xl p-3 backdrop-blur-md"
            style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                <DollarSign className="w-3 h-3 text-white" />
              </div>
              <p className="text-xs font-bold text-white">Análise de Renda</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat icon={<DollarSign className="w-3 h-3" />} label="Renda Média" value={fmtR$(d.rendaMedia)} accent="#10b981" />
              <MiniStat icon={<TrendingUp className="w-3 h-3" />} label="Renda Máxima" value={fmtR$(d.rendaMax)} accent="#3b82f6" />
              <MiniStat icon={<ArrowDownRight className="w-3 h-3" />} label="Renda Mínima" value={fmtR$(d.rendaMin)} accent="#eab308" />
              <MiniStat icon={<Users className="w-3 h-3" />} label="Com Renda" value={`${d.comRenda}`} accent="#8b5cf6" />
            </div>
          </motion.div>
        </div>

        {/* ═══ GRÁFICOS ═══ */}
        <SectionHeader icon={<TrendingUp className="w-3.5 h-3.5" />} title="Meus Gráficos"
          subtitle="Evolução e distribuição" />

        <motion.div variants={stagger} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard index={0} title="Minha Performance Mensal" sub="Clientes cadastrados por mês"
            icon={<TrendingUp className="w-3 h-3" />}>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.monthly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="corrMGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={TICK} stroke="transparent" tickLine={false} />
                  <YAxis tick={TICK} stroke="transparent" tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="clientes" name="Meus Clientes" stroke="#F97316" fill="url(#corrMGrad)"
                    strokeWidth={2} dot={false}
                    activeDot={{ r: 4, fill: '#F97316', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard index={1} title="Minha Atividade Semanal" sub="Clientes por dia da semana"
            icon={<BarChart3 className="w-3 h-3" />}>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.weekly} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="corrWBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97316" stopOpacity={1} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.65} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={TICK} stroke="transparent" tickLine={false} />
                  <YAxis tick={TICK} stroke="transparent" tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)', rx: 4 }} />
                  <Bar dataKey="clientes" name="Clientes" fill="url(#corrWBar)" radius={[5, 5, 1, 1]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </motion.div>

        {/* ═══ MEUS CLIENTES APROVADOS ═══ */}
        <SectionHeader icon={<CheckCircle className="w-3.5 h-3.5" />} title="Meus Clientes Aprovados"
          subtitle={`${d.aprovados} aprovados`} />

        <motion.div variants={fadeUp} className="rounded-2xl overflow-hidden backdrop-blur-md"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-white/70">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  {['Cliente', 'Renda', 'Data'].map(h => (
                    <th key={h} className="py-2.5 px-4 text-left font-semibold text-[11px] text-white/50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.meusClientesAprovados && d.meusClientesAprovados.length > 0 ? (
                  d.meusClientesAprovados.slice(0, 8).map((cliente) => (
                    <motion.tr key={cliente.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{ borderBottom: `1px solid ${BORDER}` }}
                      className="transition-colors hover:bg-white/[0.03]">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                            {cliente.nome?.charAt(0) || 'C'}
                          </div>
                          <span className="font-medium text-[11px] text-white">{cliente.nome || 'Cliente'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-[11px]">
                        <span className="font-bold" style={{ color: '#10b981' }}>
                          {cliente.valor_renda ? `R$ ${parseFloat(cliente.valor_renda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[11px] text-white/50">
                        {cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-xs text-white/40">
                      Nenhum cliente aprovado ainda
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
            Dados pessoais do corretor
          </span>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default DashboardCorretor;
