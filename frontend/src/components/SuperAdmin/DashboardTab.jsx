import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Building2, Users, DollarSign, TrendingUp, TrendingDown, Activity, CheckCircle, Building } from "lucide-react";
import { fetchMetrics } from "../../services/superAdminApi";
import { MetricCard, LoadingSpinner, ErrorMessage, COLORS, formatCurrency } from "./shared";

const DashboardTab = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMetrics = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchMetrics();
      setMetrics(data);
    } catch (err) {
      console.error("Erro ao carregar métricas:", err);
      setError("Não foi possível carregar as métricas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={loadMetrics} />;
  if (!metrics) return null;

  const cards = [
    { icon: Building2, label: "Total Tenants", value: metrics.tenants?.total ?? metrics.total_tenants ?? 0 },
    { icon: CheckCircle, label: "Tenants Ativos", value: metrics.tenants?.ativos ?? metrics.tenants_ativos ?? 0, color: "text-green-400" },
    { icon: DollarSign, label: "MRR", value: formatCurrency(metrics.financeiro?.mrr ?? metrics.mrr), color: "text-emerald-400" },
    { icon: TrendingUp, label: "ARR", value: formatCurrency(metrics.financeiro?.arr ?? metrics.arr), color: "text-blue-400" },
    { icon: TrendingDown, label: "Churn Mês", value: `${metrics.financeiro?.churn_mes ?? metrics.churn_mes ?? 0}%`, color: "text-red-400" },
    { icon: Activity, label: "Novos este Mês", value: metrics.tenants?.novos_mes ?? metrics.novos_mes ?? 0, color: "text-purple-400" },
  ];

  const planData = (metrics.planos || metrics.tenants_por_plano || []).map((p) => ({
    name: p.plan?.nome || p.plano || p.name || "Sem plano",
    value: parseInt(p.total) || p.count || 0,
  }));

  const resourceCards = [
    { icon: Users, label: "Total Clientes", value: metrics.recursos?.clientes ?? metrics.total_clientes ?? 0 },
    { icon: Users, label: "Total Usuários", value: metrics.recursos?.usuarios ?? metrics.total_usuarios ?? 0 },
    { icon: Building, label: "Total Imóveis", value: metrics.recursos?.imoveis ?? metrics.total_imoveis ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((c, i) => <MetricCard key={i} {...c} delay={i * 0.05} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Tenants por Plano</h3>
          {planData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={planData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {planData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#162a4a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                <Legend wrapperStyle={{ color: "#9ca3af" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center py-10">Sem dados de planos</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Distribuição por Plano</h3>
          {planData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={planData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "#162a4a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                <Bar dataKey="value" name="Tenants" radius={[6, 6, 0, 0]}>
                  {planData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center py-10">Sem dados de planos</p>}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {resourceCards.map((c, i) => <MetricCard key={i} {...c} delay={0.5 + i * 0.05} color="text-sky-400" />)}
      </div>
    </div>
  );
};

export default DashboardTab;
