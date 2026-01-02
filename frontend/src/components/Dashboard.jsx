import React, { Suspense } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { 
  FaUserTie, 
  FaBuilding, 
  FaUserShield, 
  FaSpinner,
  FaExclamationTriangle,
  FaLock,
  FaUsers
} from "react-icons/fa";

// Lazy loading dos componentes de dashboard
const DashboardCorretor = React.lazy(() => import("./Dashboard/DashboardCorretor"));
const DashboardCorrespondente = React.lazy(() => import("./Dashboard/DashboardCorrespondente"));
const DashboardAdministrador = React.lazy(() => import("./Dashboard/DashboardAdministrador"));

const Dashboard = () => {
  const { user, loading, error } = useAuth();

  // Função para determinar o papel do usuário baseado nas flags
  const getUserRole = (user) => {
    if (!user) return null;
    
    if (user.is_administrador) return "administrador";
    if (user.is_corretor) return "corretor";
    if (user.is_correspondente) return "correspondente";
    
    return null; // Usuário sem papel definido
  };

  // Função para verificar se o usuário tem múltiplos papéis
  const hasMultipleRoles = (user) => {
    if (!user) return false;
    
    const roles = [user.is_administrador, user.is_corretor, user.is_correspondente];
    return roles.filter(Boolean).length > 1;
  };

  // Loading Component
  const LoadingDashboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full mx-auto mb-4"
        />
        <h2 className="text-2xl font-bold text-white mb-2">Carregando Dashboard</h2>
        <p className="text-blue-200">Aguarde enquanto verificamos suas credenciais...</p>
      </motion.div>
    </div>
  );

  // Error Component
  const ErrorDashboard = ({ error }) => (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-8 max-w-md mx-4 text-center"
      >
        <FaExclamationTriangle className="text-4xl text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Erro de Autenticação</h2>
        <p className="text-red-200 mb-6">{error}</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.reload()}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-300"
        >
          Tentar Novamente
        </motion.button>
      </motion.div>
    </div>
  );

  // Unauthorized Component
  const UnauthorizedDashboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-yellow-500/10 backdrop-blur-md border border-yellow-500/20 rounded-2xl p-8 max-w-lg mx-4 text-center"
      >
        <FaLock className="text-4xl text-yellow-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Acesso Não Autorizado</h2>
        <p className="text-yellow-200 mb-6">
          Você não tem permissão para acessar este dashboard. Entre em contato com o administrador do sistema para obter as permissões necessárias.
        </p>
        <div className="bg-yellow-500/10 rounded-lg p-4 mb-6">
          <p className="text-yellow-100 text-sm">
            <strong>Usuário:</strong> {user?.first_name} {user?.last_name}<br />
            <strong>Email:</strong> {user?.email}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.history.back()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-300"
          >
            Voltar
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/contato'}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-300"
          >
            Contatar Suporte
          </motion.button>
        </div>
      </motion.div>
    </div>
  );

  // Multiple Roles Selection Component
  const MultipleRolesSelection = () => {
    const [selectedRole, setSelectedRole] = React.useState(null);

    const availableRoles = [
      { key: 'administrador', flag: user.is_administrador, icon: FaUserShield, name: 'Administrador', color: 'green', description: 'Acesso total ao sistema' },
      { key: 'corretor', flag: user.is_corretor, icon: FaUserTie, name: 'Corretor', color: 'blue', description: 'Gestão de imóveis e clientes' },
      { key: 'correspondente', flag: user.is_correspondente, icon: FaBuilding, name: 'Correspondente', color: 'purple', description: 'Parcerias e representações' }
    ].filter(role => role.flag);

    const handleRoleSelection = (role) => {
      setSelectedRole(role);
      // Aqui você pode salvar a preferência do usuário ou redirecionar
      // Por enquanto, vamos renderizar o dashboard baseado na seleção
    };

    if (selectedRole) {
      return renderDashboardByRole(selectedRole);
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-2xl mx-4"
        >
          <div className="text-center mb-8">
            <FaUsers className="text-4xl text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Múltiplos Acessos Detectados</h2>
            <p className="text-blue-200">
              Você tem acesso a múltiplos dashboards. Selecione qual você deseja acessar:
            </p>
          </div>

          <div className="grid gap-4">
            {availableRoles.map((role) => (
              <motion.button
                key={role.key}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleSelection(role.key)}
                className={`p-6 bg-${role.color}-500/10 hover:bg-${role.color}-500/20 border border-${role.color}-500/30 hover:border-${role.color}-500/50 rounded-xl transition-all duration-300 text-left group`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-16 h-16 bg-${role.color}-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <role.icon className={`text-2xl text-${role.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{role.name}</h3>
                    <p className="text-blue-200 text-sm">{role.description}</p>
                  </div>
                  <div className="text-blue-400 group-hover:text-blue-300 transition-colors">
                    →
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 rounded-lg">
            <p className="text-blue-200 text-sm text-center">
              <strong>Dica:</strong> Você pode alternar entre os dashboards a qualquer momento através do menu de usuário.
            </p>
          </div>
        </motion.div>
      </div>
    );
  };

  // Component Loading Fallback
  const ComponentLoading = ({ role }) => {
    const roleConfig = {
      corretor: { icon: FaUserTie, name: "Corretor", color: "blue" },
      correspondente: { icon: FaBuilding, name: "Correspondente", color: "purple" },
      administrador: { icon: FaUserShield, name: "Administrador", color: "green" }
    };

    const config = roleConfig[role] || { icon: FaSpinner, name: "Usuário", color: "gray" };

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`w-20 h-20 bg-${config.color}-500/20 backdrop-blur-md border border-${config.color}-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4`}
          >
            <config.icon className={`text-3xl text-${config.color}-400`} />
          </motion.div>
          <h2 className="text-xl font-bold text-white mb-2">
            Carregando Dashboard {config.name}
          </h2>
          <div className="flex items-center justify-center space-x-1">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              className="w-2 h-2 bg-blue-400 rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              className="w-2 h-2 bg-blue-400 rounded-full"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
              className="w-2 h-2 bg-blue-400 rounded-full"
            />
          </div>
        </motion.div>
      </div>
    );
  };

  // Dashboard component selection baseado no papel
  const renderDashboardByRole = (selectedRole = null) => {
    const role = selectedRole || getUserRole(user);
    
    switch (role) {
      case "corretor":
        return (
          <Suspense fallback={<ComponentLoading role="corretor" />}>
            <DashboardCorretor />
          </Suspense>
        );
      case "correspondente":
        return (
          <Suspense fallback={<ComponentLoading role="correspondente" />}>
            <DashboardCorrespondente />
          </Suspense>
        );
      case "administrador":
        return (
          <Suspense fallback={<ComponentLoading role="administrador" />}>
            <DashboardAdministrador />
          </Suspense>
        );
      default:
        return <UnauthorizedDashboard />;
    }
  };

  // Handle loading state
  if (loading) {
    return <LoadingDashboard />;
  }

  // Handle error state
  if (error) {
    return <ErrorDashboard error={error} />;
  }

  // Handle no user
  if (!user) {
    return <ErrorDashboard error="Usuário não encontrado. Faça login novamente." />;
  }

  // Handle multiple roles
  if (hasMultipleRoles(user)) {
    return <MultipleRolesSelection />;
  }

  // Handle single role or no role
  const userRole = getUserRole(user);
  if (!userRole) {
    return <UnauthorizedDashboard />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="dashboard-container"
    >
      {renderDashboardByRole(userRole)}
    </motion.div>
  );
};

export default Dashboard;
