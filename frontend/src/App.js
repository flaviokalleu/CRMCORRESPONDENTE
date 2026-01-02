import React, { useState, useEffect } from 'react';
// Importação centralizada de rotas customizadas
import customRoutes from './routes';
import { socket } from './index';
import { SocketProvider } from './context/SocketContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useAuthPersistence } from './hooks/useAuthPersistence';
import AuthLoading from './components/AuthLoading';

// ✅ IMPORTAR PROTEÇÃO DOM CONTRA ERROS DE TRADUÇÃO
import { setupDOMProtection, useDOMProtection } from './utils/domUtils';
import DOMErrorBoundary from './components/DOMErrorBoundary';
import './styles/domProtection.css';

// Importar suas páginas
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AddCliente from './pages/AddCliente';
import Configuracoes from './pages/Configuracoes';
import AddCorretor from './pages/AddCorretor';
import AddCorrespondente from './pages/AddCorrespondente';
import AddImovel from './pages/AddImovel';
import ListaProprietarios from './pages/ListaProprietarios';
import ListaClientes from './pages/ListaClientes';
import ListaImoveis from './pages/ListaImoveis';
import ListaCorretores from './pages/ListaCorretores';
import ListaCorrespondentesPage from './pages/ListaCorrespondentesPage';
import LoadingScreen from './components/LoadingScreen';
import AlugueisPage from './pages/AlugueisPage';
import AddAluguelPage from './pages/AddAluguelPage';
import WhatsAppQRCodePage from './pages/WhatsAppQRCodePage';
import LandingPage from './pages/LandingPage';
import LembretesPage from './pages/Lembretes';
import AcessosList from './pages/AcessosList';
import ClientesAluguel from './pages/ClienteAluguelPage';
import RelatorioPage from './pages/RelatorioPage';
import PublicPropertyList from './pages/PublicImoveisPage';
import MoveisDetail from './pages/MoveisDetailPage';
import Busca from './components/Busca';
import EditarCliente from './pages/EditarCliente.jsx';
import LaudosPage from './pages/LaudosPage';

// ✅ NOVAS IMPORTAÇÕES - PAGAMENTOS
import CriarPagamento from './components/Pagamentos/CriarPagamento';
import ListaPagamentos from './components/Pagamentos/ListaPagamentos';



// Importando os Dashboards
import DashboardCorretor from './components/Dashboard/DashboardCorretor';
import DashboardCorrespondente from './components/Dashboard/DashboardCorrespondente';
import DashboardAdministrador from './components/Dashboard/DashboardAdministrador';

// Componente para rotas protegidas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// ✅ NOVO COMPONENTE: Rotas apenas para administradores
const AdminOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole('administrador')) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Componente para rotas públicas (redireciona para landing se já logado)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  // Se já está logado, redireciona para dashboard
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// ✅ NOVO COMPONENTE: Para rotas que funcionam tanto logado quanto não logado
const PublicOnlyRoute = ({ children }) => {
  // Sempre renderiza o componente, independente de estar logado ou não
  return children;
};
// Removido hook de exemplo, agora use o contexto em cada página/componente
// Componente interno que usa useAuth
const AppContent = () => {
  const { loading } = useAuth();
  const [loadingComplete, setLoadingComplete] = useState(false);

  // ✅ ATIVAR PROTEÇÃO DOM CONTRA ERROS DE TRADUÇÃO
  useDOMProtection();

  // Usar hook de persistência
  useAuthPersistence();

  // Para usar socket em qualquer página/componente:
  // import { useSocket } from './context/SocketContext';
  // const socket = useSocket();
  // socket.emit(...), socket.on(...)

  const handleLoadingComplete = () => {
    setLoadingComplete(true);
  };

  useEffect(() => {
    setLoadingComplete(false);
    const timer = setTimeout(() => {
      handleLoadingComplete();
    }, 1000); // Dar tempo para carregar

    return () => clearTimeout(timer);
  }, []);

  // Se ainda está verificando autenticação, mostrar loading
  if (loading) {
    return <AuthLoading />;
  }

  return (
    <div className="App">
      {!loadingComplete ? (
        <LoadingScreen onComplete={handleLoadingComplete} />
      ) : (
        <Routes>
          {/* ✅ NOVA ROTA PRINCIPAL - LANDING PAGE */}
          <Route 
            path="/" 
            element={
              <PublicOnlyRoute>
                <LandingPage />
              </PublicOnlyRoute>
            } 
          />

          {/* ✅ ROTA HOME ALTERNATIVA */}
          <Route 
            path="/home" 
            element={
              <PublicOnlyRoute>
                <LandingPage />
              </PublicOnlyRoute>
            } 
          />

          {/* Rotas públicas */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* ✅ MANTÉM ROTA LANDING ESPECÍFICA */}
          <Route 
            path="/landing" 
            element={
              <PublicOnlyRoute>
                <LandingPage />
              </PublicOnlyRoute>
            } 
          />
          
          {/* ✅ ROTAS PÚBLICAS DE IMÓVEIS */}
          <Route 
            path="/imoveis-publicos" 
            element={
              <PublicOnlyRoute>
                <PublicPropertyList />
              </PublicOnlyRoute>
            } 
          />
          <Route 
            path="/imoveis-publicos/:id" 
            element={
              <PublicOnlyRoute>
                <MoveisDetail />
              </PublicOnlyRoute>
            } 
          />
          <Route 
            path="/busca" 
            element={
              <PublicOnlyRoute>
                <Busca />
              </PublicOnlyRoute>
            } 
          />

          {/* Rotas protegidas principais */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/configuracoes"
            element={
              <ProtectedRoute>
                <Configuracoes />
              </ProtectedRoute>
            }
          />

          {/* Dashboards específicos por tipo de usuário */}
          <Route 
            path="/dashboard/corretor" 
            element={
              <ProtectedRoute>
                <DashboardCorretor />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/correspondente" 
            element={
              <ProtectedRoute>
                <DashboardCorrespondente />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/administrador" 
            element={
              <ProtectedRoute>
                <DashboardAdministrador />
              </ProtectedRoute>
            } 
          />
          
          {/* Rotas de Clientes */}
          <Route 
            path="/clientes/adicionar" 
            element={
              <ProtectedRoute>
                <AddCliente />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clientes/lista" 
            element={
              <ProtectedRoute>
                <ListaClientes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/editar-cliente/:id" 
            element={
              <ProtectedRoute>
                <EditarCliente />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/clientes-aluguel" 
            element={
              <ProtectedRoute>
                <ClientesAluguel />
              </ProtectedRoute>
            } 
          />

          {/* Rotas de Corretores */}
          <Route 
            path="/corretores/adicionar" 
            element={
              <ProtectedRoute>
                <AddCorretor />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/corretores/lista" 
            element={
              <ProtectedRoute>
                <ListaCorretores />
              </ProtectedRoute>
            } 
          />

          {/* Rotas de Correspondentes */}
          <Route 
            path="/correspondentes/adicionar" 
            element={
              <ProtectedRoute>
                <AddCorrespondente />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/correspondentes/lista" 
            element={
              <ProtectedRoute>
                <ListaCorrespondentesPage />
              </ProtectedRoute>
            } 
          />

          {/* Rotas de Imóveis PROTEGIDAS (sistema interno) */}
          <Route 
            path="/imoveis/adicionar" 
            element={
              <ProtectedRoute>
                <AddImovel />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/imoveis/lista" 
            element={
              <ProtectedRoute>
                <ListaImoveis />
              </ProtectedRoute>
            } 
          />

          /* ✅ ROTA DE IMÓVEIS GENÉRICA - REDIRECIONA PARA PÚBLICA */
          <Route 
            path="/imoveis" 
            element={<Navigate to="/imoveis-publicos" replace />} 
          />

          {/* ✅ ROTA PARA IMÓVEL ESPECÍFICO (INTERNA, PROTEGIDA) */}
          <Route 
            path="/imovel/:id" 
            element={
              <ProtectedRoute>
                <MoveisDetail />
              </ProtectedRoute>
            } 
          />

          {/* Rotas de Proprietários */}
          <Route 
            path="/proprietarios/lista" 
            element={
              <ProtectedRoute>
                <ListaProprietarios />
              </ProtectedRoute>
            } 
          />

          {/* Rota de Laudos */}
          <Route 
            path="/laudos" 
            element={
              <ProtectedRoute>
                <LaudosPage />
              </ProtectedRoute>
            } 
          />

          {/* ✅ NOVAS ROTAS DE PAGAMENTOS - APENAS PARA ADMINISTRADORES */}
          <Route 
            path="/pagamentos/criar" 
            element={
              <AdminOnlyRoute>
                <CriarPagamento />
              </AdminOnlyRoute>
            } 
          />
          <Route 
            path="/pagamentos/lista" 
            element={
              <AdminOnlyRoute>
                <ListaPagamentos />
              </AdminOnlyRoute>
            } 
          />

          {/* Rotas de Aluguéis */}
          <Route 
            path="/alugueis" 
            element={
              <ProtectedRoute>
                <AlugueisPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/alugueis/adicionar" 
            element={
              <ProtectedRoute>
                <AddAluguelPage />
              </ProtectedRoute>
            } 
          />

          {/* Outras rotas protegidas */}
          <Route 
            path="/whatsapp-qr" 
            element={
              <ProtectedRoute>
                <WhatsAppQRCodePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/lembretes" 
            element={
              <ProtectedRoute>
                <LembretesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/acessos" 
            element={
              <ProtectedRoute>
                <AcessosList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/relatorio" 
            element={
              <ProtectedRoute>
                <RelatorioPage />
              </ProtectedRoute>
            } 
          />

          {/* ✅ ROTAS DE ACESSO RÁPIDO PARA SISTEMA */}
          <Route 
            path="/sistema" 
            element={<Navigate to="/login" replace />} 
          />
          <Route 
            path="/admin" 
            element={<Navigate to="/login" replace />} 
          />
          <Route 
            path="/crm" 
            element={<Navigate to="/login" replace />} 
          />
          
          {/* Rotas customizadas (financeiro, laudos, etc) */}
          {customRoutes.map((route, idx) => (
            <Route key={route.path || idx} path={route.path} element={route.element} />
          ))}

          {/* ✅ Rota 404 - redireciona para landing page */}
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
      )}
    </div>
  );
};

// Componente principal do App

function App() {
  return (
    <DOMErrorBoundary>
      <SocketProvider>
        <Router>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </Router>
      </SocketProvider>
    </DOMErrorBoundary>
  );
}

export default App;