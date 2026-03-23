import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Crown, Users, Home, Key, FileText, Check, X,
  ArrowUpRight, RefreshCw, Calendar, Clock, Shield,
  Zap, Star, AlertCircle, Loader2,
} from "lucide-react";
import axios from "axios";
import MainLayout from "../layouts/MainLayout";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  "Content-Type": "application/json",
});

// --- Animation variants ---
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

// --- Status helpers ---
const STATUS_MAP = {
  active: { label: "Ativo", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  trialing: { label: "Período de Teste", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  past_due: { label: "Pagamento Pendente", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  canceled: { label: "Cancelado", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const getStatus = (status) => STATUS_MAP[status] || STATUS_MAP.active;

// --- Resource config ---
const RESOURCE_CONFIG = {
  clientes: { label: "Clientes", icon: Users, color: "from-blue-500 to-blue-600" },
  usuarios: { label: "Usuários", icon: Key, color: "from-violet-500 to-violet-600" },
  imoveis: { label: "Imóveis", icon: Home, color: "from-emerald-500 to-emerald-600" },
  alugueis: { label: "Aluguéis", icon: FileText, color: "from-orange-500 to-orange-600" },
};

// --- Sub-components ---

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-caixa-secondary/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl ${className}`}
  >
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="p-2 rounded-xl bg-gradient-to-br from-caixa-orange/20 to-caixa-orange/5 border border-caixa-orange/20">
      <Icon className="w-5 h-5 text-caixa-orange" />
    </div>
    <h2 className="text-lg font-bold text-white">{title}</h2>
  </div>
);

const ResourceBar = ({ resourceKey, current, max }) => {
  const cfg = RESOURCE_CONFIG[resourceKey];
  if (!cfg) return null;

  const Icon = cfg.icon;
  const isUnlimited = max === "Ilimitado" || max === null || max === undefined;
  const pct = isUnlimited ? 30 : Math.min((current / max) * 100, 100);
  const atLimit = !isUnlimited && current >= max;
  const nearLimit = !isUnlimited && pct >= 80;

  return (
    <motion.div variants={fadeUp} className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">{cfg.label}</span>
        </div>
        <span
          className={`text-sm font-bold ${
            atLimit ? "text-red-400" : nearLimit ? "text-yellow-400" : "text-white"
          }`}
        >
          {current} / {isUnlimited ? "Ilimitado" : max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${
            atLimit
              ? "bg-red-500"
              : nearLimit
              ? "bg-yellow-500"
              : `bg-gradient-to-r ${cfg.color}`
          }`}
        />
      </div>
    </motion.div>
  );
};

const FeatureCard = ({ name, available }) => (
  <motion.div
    variants={fadeUp}
    className={`flex items-center gap-3 p-3 rounded-xl border ${
      available
        ? "bg-emerald-500/5 border-emerald-500/20"
        : "bg-white/[0.02] border-white/[0.06] opacity-50"
    }`}
  >
    {available ? (
      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
    ) : (
      <X className="w-4 h-4 text-gray-500 flex-shrink-0" />
    )}
    <span className={`text-sm ${available ? "text-gray-200" : "text-gray-500"}`}>
      {name}
    </span>
  </motion.div>
);

const PlanCard = ({ plan, isCurrent, onSelect }) => (
  <motion.div
    variants={fadeUp}
    className={`relative p-6 rounded-2xl border transition-all ${
      isCurrent
        ? "bg-caixa-orange/10 border-caixa-orange/30"
        : "bg-white/[0.03] border-white/[0.08] hover:border-caixa-orange/20"
    }`}
  >
    {isCurrent && (
      <div className="absolute -top-3 left-4 px-3 py-0.5 rounded-full bg-caixa-orange text-xs font-bold text-white">
        Plano Atual
      </div>
    )}

    <div className="flex items-center gap-2 mb-2">
      <Star className={`w-5 h-5 ${isCurrent ? "text-caixa-orange" : "text-gray-500"}`} />
      <h3 className="text-lg font-bold text-white">{plan.name}</h3>
    </div>

    {plan.price !== undefined && (
      <p className="text-2xl font-extrabold text-white mb-1">
        R$ {Number(plan.price).toFixed(2).replace(".", ",")}
        <span className="text-sm font-normal text-gray-400">
          /{plan.billing_cycle === "yearly" ? "ano" : "mês"}
        </span>
      </p>
    )}

    {plan.description && (
      <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
    )}

    <ul className="space-y-1.5 mb-5">
      {plan.limits &&
        Object.entries(plan.limits).map(([key, val]) => {
          const cfg = RESOURCE_CONFIG[key];
          if (!cfg) return null;
          return (
            <li key={key} className="flex items-center gap-2 text-sm text-gray-300">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              {val === "Ilimitado" || val === null ? "Ilimitado" : val} {cfg.label}
            </li>
          );
        })}
    </ul>

    {isCurrent ? (
      <button
        disabled
        className="w-full py-2.5 rounded-xl bg-white/[0.06] text-gray-500 text-sm font-semibold cursor-not-allowed"
      >
        Plano Atual
      </button>
    ) : (
      <button
        onClick={() => onSelect(plan)}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-caixa-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
      >
        Mudar para {plan.name}
        <ArrowUpRight className="w-4 h-4" />
      </button>
    )}
  </motion.div>
);

// --- Main page ---

const MinhaAssinaturaPage = () => {
  const [usage, setUsage] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const headers = getAuthHeaders();

      const [usageRes, plansRes] = await Promise.all([
        axios.get(`${API_URL}/plan-usage`, { headers }),
        axios.get(`${API_URL}/tenant/plans`, { headers }),
      ]);

      setUsage(usageRes.data);
      setPlans(plansRes.data?.plans || plansRes.data || []);
      setError(null);
    } catch (err) {
      console.error("Erro ao carregar dados da assinatura:", err);
      setError("Não foi possível carregar os dados da assinatura.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePlanChange = async (plan) => {
    try {
      const headers = getAuthHeaders();
      await axios.post(`${API_URL}/tenant/change-plan`, { planId: plan.id }, { headers });
      fetchData();
    } catch (err) {
      console.error("Erro ao alterar plano:", err);
      alert("Erro ao alterar plano. Tente novamente.");
    }
  };

  // --- Loading state ---
  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-primary flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="w-8 h-8 text-caixa-orange animate-spin" />
            <p className="text-gray-400 text-sm">Carregando assinatura...</p>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-primary flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-6 py-2.5 rounded-xl bg-caixa-orange text-white font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  const plan = usage?.plan || {};
  const resources = usage?.usage || {};
  const limits = usage?.limits || plan.limits || {};
  const features = usage?.features || plan.features || [];
  const statusInfo = getStatus(usage?.status);

  const daysRemaining = usage?.days_remaining ?? null;
  const billingCycle = usage?.billing_cycle || plan.billing_cycle;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-primary">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8"
        >
          {/* Header */}
          <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
                <Crown className="w-7 h-7 text-caixa-orange" />
                Minha Assinatura
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Gerencie seu plano e acompanhe o uso dos recursos
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-gray-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </motion.div>

          {/* Section 1: Plano Atual */}
          <motion.div variants={fadeUp}>
            <Card className="p-6">
              <SectionTitle icon={Shield} title="Plano Atual" />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Plan name */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Plano</p>
                  <p className="text-xl font-bold text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-caixa-orange" />
                    {plan.name || "—"}
                  </p>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${statusInfo.color}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {statusInfo.label}
                  </span>
                </div>

                {/* Billing cycle */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Ciclo</p>
                  <p className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {billingCycle === "yearly" ? "Anual" : "Mensal"}
                  </p>
                </div>

                {/* Days remaining */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Dias Restantes</p>
                  <p className="text-lg font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {daysRemaining !== null ? `${daysRemaining} dias` : "—"}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Section 2: Uso de Recursos */}
          <motion.div variants={fadeUp}>
            <Card className="p-6">
              <SectionTitle icon={Zap} title="Uso de Recursos" />

              <motion.div variants={stagger} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(RESOURCE_CONFIG).map((key) => (
                  <ResourceBar
                    key={key}
                    resourceKey={key}
                    current={resources[key] ?? 0}
                    max={limits[key] ?? "Ilimitado"}
                  />
                ))}
              </motion.div>
            </Card>
          </motion.div>

          {/* Section 3: Features Disponíveis */}
          {features.length > 0 && (
            <motion.div variants={fadeUp}>
              <Card className="p-6">
                <SectionTitle icon={Check} title="Features Disponíveis" />

                <motion.div
                  variants={stagger}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                >
                  {features.map((feat, idx) => {
                    const featureName = typeof feat === "string" ? feat : feat.name;
                    const available = typeof feat === "string" ? true : feat.available !== false;
                    return (
                      <FeatureCard key={idx} name={featureName} available={available} />
                    );
                  })}
                </motion.div>
              </Card>
            </motion.div>
          )}

          {/* Section 4: Alterar Plano */}
          {plans.length > 0 && (
            <motion.div variants={fadeUp}>
              <Card className="p-6">
                <SectionTitle icon={ArrowUpRight} title="Alterar Plano" />

                <motion.div
                  variants={stagger}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {plans.map((p) => (
                    <PlanCard
                      key={p.id}
                      plan={p}
                      isCurrent={p.id === plan.id || p.name === plan.name}
                      onSelect={handlePlanChange}
                    />
                  ))}
                </motion.div>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default MinhaAssinaturaPage;
