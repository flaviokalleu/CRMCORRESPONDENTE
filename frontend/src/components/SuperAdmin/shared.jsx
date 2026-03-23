import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, AlertTriangle, ToggleLeft, ToggleRight,
  MessageCircle, Wallet, Brain, BarChart3, UsersRound, Key,
  Headphones, Globe, Settings
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────
export const COLORS = ["#F97316", "#3B82F6", "#22C55E", "#EAB308", "#A855F7", "#EC4899", "#14B8A6"];

export const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export const statusBadge = (status) => {
  const map = {
    ativo: "bg-green-500/20 text-green-400 border-green-500/30",
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    inativo: "bg-red-500/20 text-red-400 border-red-500/30",
    inactive: "bg-red-500/20 text-red-400 border-red-500/30",
    suspenso: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    suspended: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    trial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    trialing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    cancelado: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    pendente: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  const label = status || "—";
  const cls = map[label.toLowerCase()] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cls} capitalize`}>
      {label}
    </span>
  );
};

export const inputCls = "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-caixa-orange/50 transition-colors";

// ─── Tab button ──────────────────────────────────────────────
export const TabButton = ({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
      active
        ? "bg-caixa-orange text-white shadow-lg shadow-orange-500/25"
        : "text-gray-400 hover:text-white hover:bg-white/5"
    }`}
  >
    <Icon size={18} />
    {label}
  </button>
);

// ─── Metric card ─────────────────────────────────────────────
export const MetricCard = ({ icon: Icon, label, value, sub, color = "text-caixa-orange", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-caixa-orange/30 transition-colors"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-gray-400 text-sm">{label}</span>
      <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
        <Icon size={20} />
      </div>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </motion.div>
);

// ─── Modal wrapper ───────────────────────────────────────────
export const Modal = ({ open, onClose, title, children, wide }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-caixa-secondary border border-white/10 rounded-2xl shadow-2xl w-full ${
            wide ? "max-w-3xl" : "max-w-lg"
          } max-h-[90vh] overflow-y-auto`}
        >
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Loading & Error ─────────────────────────────────────────
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
      <Loader2 className="w-10 h-10 text-caixa-orange animate-spin mx-auto mb-3" />
      <p className="text-gray-400">Carregando...</p>
    </motion.div>
  </div>
);

export const ErrorMessage = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <AlertTriangle className="w-10 h-10 text-red-400" />
    <p className="text-gray-400">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-caixa-orange text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
      >
        Tentar novamente
      </button>
    )}
  </div>
);

// ─── Module metadata & toggle ────────────────────────────────
export const MODULE_META = {
  has_whatsapp: { label: "WhatsApp", icon: MessageCircle, desc: "Integração com WhatsApp via Baileys" },
  has_pagamentos: { label: "Pagamentos", icon: Wallet, desc: "Mercado Pago, Asaas, boletos e PIX" },
  has_ai_analysis: { label: "Análise IA", icon: Brain, desc: "Análise de clientes com Gemini AI" },
  has_relatorios_avancados: { label: "Relatórios Avançados", icon: BarChart3, desc: "Dashboards e relatórios detalhados" },
  has_multi_usuarios: { label: "Multi Usuários", icon: UsersRound, desc: "Múltiplos usuários por empresa" },
  has_api_access: { label: "Acesso API", icon: Key, desc: "Acesso à API REST do sistema" },
  has_suporte_prioritario: { label: "Suporte Prioritário", icon: Headphones, desc: "Atendimento prioritário" },
  has_dominio_customizado: { label: "Domínio Customizado", icon: Globe, desc: "Domínio personalizado (crm.empresa.com)" },
};

export const ModuleToggle = ({ field, value, planValue, useCustom, onChange }) => {
  const meta = MODULE_META[field] || { label: field, icon: Settings, desc: "" };
  const Icon = meta.icon;
  const effectiveValue = useCustom ? (value ?? planValue ?? false) : (planValue ?? false);
  const isOverridden = useCustom && value !== null && value !== undefined;

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
        effectiveValue
          ? "bg-green-500/5 border-green-500/20"
          : "bg-white/5 border-white/10"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${effectiveValue ? "bg-green-500/10 text-green-400" : "bg-white/5 text-gray-500"}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{meta.label}</p>
          <p className="text-xs text-gray-500">{meta.desc}</p>
          {!useCustom && (
            <p className="text-xs text-gray-600 italic mt-0.5">Herdado do plano</p>
          )}
          {isOverridden && (
            <p className="text-xs text-caixa-orange italic mt-0.5">Customizado</p>
          )}
        </div>
      </div>
      <button
        onClick={() => onChange(field, !effectiveValue)}
        disabled={!useCustom}
        className={`transition-colors ${!useCustom ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {effectiveValue ? (
          <ToggleRight size={32} className="text-green-400" />
        ) : (
          <ToggleLeft size={32} className="text-gray-600" />
        )}
      </button>
    </div>
  );
};
