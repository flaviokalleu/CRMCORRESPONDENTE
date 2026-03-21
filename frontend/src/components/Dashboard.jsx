import React, { Suspense } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  UserCog,
  Building2,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Lock,
  Users,
} from "lucide-react";

const DashboardCorretor = React.lazy(() => import("./Dashboard/DashboardCorretor"));
const DashboardCorrespondente = React.lazy(() => import("./Dashboard/DashboardCorrespondente"));
const DashboardAdministrador = React.lazy(() => import("./Dashboard/DashboardAdministrador"));

const Dashboard = () => {
  const { user, loading, error } = useAuth();

  const getUserRole = (u) => {
    if (!u) return null;
    if (u.is_administrador) return "administrador";
    if (u.is_corretor) return "corretor";
    if (u.is_correspondente) return "correspondente";
    return null;
  };

  const hasMultipleRoles = (u) => {
    if (!u) return false;
    return [u.is_administrador, u.is_corretor, u.is_correspondente].filter(Boolean).length > 1;
  };

  // Loading
  const LoadingState = () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[#F97316]" />
        <p className="text-sm text-gray-400">Carregando dashboard...</p>
      </div>
    </div>
  );

  // Error
  const ErrorState = ({ message }) => (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
        <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-red-400" />
        <h2 className="mb-2 text-lg font-semibold text-gray-800">Erro de autenticação</h2>
        <p className="mb-6 text-sm text-gray-500">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-[#0B1426] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#162a4a]"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );

  // Unauthorized
  const UnauthorizedState = () => (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-amber-100 bg-amber-50 p-8 text-center">
        <Lock className="mx-auto mb-4 h-8 w-8 text-amber-500" />
        <h2 className="mb-2 text-lg font-semibold text-gray-800">Acesso restrito</h2>
        <p className="mb-6 text-sm text-gray-500">
          Você não tem permissão para acessar este dashboard. Contate o administrador.
        </p>
        <div className="mb-6 rounded-lg bg-amber-100/60 px-4 py-3 text-xs text-gray-600">
          <strong>Usuário:</strong> {user?.first_name} {user?.last_name}<br />
          <strong>Email:</strong> {user?.email}
        </div>
        <button
          onClick={() => window.history.back()}
          className="rounded-lg bg-[#0B1426] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#162a4a]"
        >
          Voltar
        </button>
      </div>
    </div>
  );

  // Role selection
  const RoleSelection = () => {
    const [selected, setSelected] = React.useState(null);

    const roles = [
      { key: "administrador", flag: user.is_administrador, icon: ShieldCheck, name: "Administrador", desc: "Acesso total ao sistema", color: "emerald" },
      { key: "corretor", flag: user.is_corretor, icon: UserCog, name: "Corretor", desc: "Gestão de imóveis e clientes", color: "blue" },
      { key: "correspondente", flag: user.is_correspondente, icon: Building2, name: "Correspondente", desc: "Parcerias e representações", color: "violet" },
    ].filter((r) => r.flag);

    if (selected) return renderByRole(selected);

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-[#F97316]" />
            <h2 className="text-xl font-semibold text-gray-800">Selecione seu perfil</h2>
            <p className="mt-1 text-sm text-gray-400">Você possui múltiplos acessos</p>
          </div>

          <div className="space-y-3">
            {roles.map((role) => (
              <motion.button
                key={role.key}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(role.key)}
                className="group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left transition-all duration-200 hover:border-[#F97316]/30 hover:shadow-md"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-50 transition-colors group-hover:bg-[#F97316]/10">
                  <role.icon className="h-5 w-5 text-gray-400 group-hover:text-[#F97316]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{role.name}</h3>
                  <p className="text-xs text-gray-400">{role.desc}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 transition-colors group-hover:text-[#F97316]" />
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Suspense fallback
  const SuspenseFallback = () => (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#F97316]" />
    </div>
  );

  const renderByRole = (role) => {
    switch (role) {
      case "corretor":
        return <Suspense fallback={<SuspenseFallback />}><DashboardCorretor /></Suspense>;
      case "correspondente":
        return <Suspense fallback={<SuspenseFallback />}><DashboardCorrespondente /></Suspense>;
      case "administrador":
        return <Suspense fallback={<SuspenseFallback />}><DashboardAdministrador /></Suspense>;
      default:
        return <UnauthorizedState />;
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!user) return <ErrorState message="Usuário não encontrado. Faça login novamente." />;
  if (hasMultipleRoles(user)) return <RoleSelection />;

  const role = getUserRole(user);
  if (!role) return <UnauthorizedState />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {renderByRole(role)}
    </motion.div>
  );
};

// Need to import ChevronRight for RoleSelection
const ChevronRight = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export default Dashboard;
