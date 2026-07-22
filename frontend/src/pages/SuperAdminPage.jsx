import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, LayoutDashboard, Building2, Package, CreditCard } from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../context/AuthContext";
import { TabButton } from "../components/SuperAdmin/shared";
import DashboardTab from "../components/SuperAdmin/DashboardTab";
import OrganizacoesTab from "../components/SuperAdmin/OrganizacoesTab";
import PlanosTab from "../components/SuperAdmin/PlanosTab";
import AssinaturasTab from "../components/SuperAdmin/AssinaturasTab";

const tabs = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "organizacoes", label: "Empresas", icon: Building2 },
  { key: "planos", label: "Planos", icon: Package },
  { key: "assinaturas", label: "Assinaturas", icon: CreditCard },
];

const tabComponents = {
  dashboard: DashboardTab,
  organizacoes: OrganizacoesTab,
  planos: PlanosTab,
  assinaturas: AssinaturasTab,
};

const SuperAdminPage = () => {
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!isSuperAdmin) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-caixa-primary to-caixa-secondary flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-10 max-w-md">
            <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
            <p className="text-gray-400">Você não tem permissão para acessar esta página. Apenas Super Administradores podem visualizar este painel.</p>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  const ActiveComponent = tabComponents[activeTab] || DashboardTab;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-caixa-primary to-caixa-secondary p-4 md:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="text-caixa-orange" size={28} /> Painel Super Admin
          </h1>
          <p className="text-gray-400 mt-1">Gerencie tenants, planos e assinaturas da plataforma</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1.5">
          {tabs.map((tab) => (
            <TabButton key={tab.key} active={activeTab === tab.key} icon={tab.icon} label={tab.label} onClick={() => setActiveTab(tab.key)} />
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </MainLayout>
  );
};

export default SuperAdminPage;
