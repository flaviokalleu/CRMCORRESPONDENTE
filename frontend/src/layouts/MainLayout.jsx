import React, { useState, useEffect } from "react";
import { FiMenu } from "react-icons/fi"; // Using Feather Icons
import { Link, useLocation } from "react-router-dom"; // Use apenas useLocation, não Router
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

const MainLayout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true); // ✅ NOVO ESTADO PARA CONTROLAR VISIBILIDADE

  // Check if screen is mobile on mount and window resize
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // Set initial sidebar state based on screen size
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // ✅ NOVA FUNÇÃO PARA ALTERNAR VISIBILIDADE COMPLETA DO SIDEBAR
  const toggleSidebarVisibility = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-caixa-primary via-caixa-secondary to-caixa-primary">
      {/* Sidebar - Só renderiza se estiver visível */}
      {sidebarVisible && (
        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-caixa-primary/80 backdrop-blur-md 
            transition-transform duration-300 ease-in-out border-r border-caixa-light/20
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        >
          <Sidebar
            open={sidebarOpen}
            onClose={() => isMobile && setSidebarOpen(false)}
            onToggleVisibility={toggleSidebarVisibility}
          />
        </aside>
      )}

      {/* Main Content Wrapper */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-caixa-primary/80 backdrop-blur-md border-b border-caixa-light/20">
          {/* Só mostra o conteúdo do header se for mobile OU se o sidebar estiver escondido */}
          {(isMobile || !sidebarVisible) && (
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                {/* ✅ BOTÃO PARA MOBILE SIDEBAR */}
                {isMobile && (
                  <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-lg hover:bg-caixa-primary/30 transition-colors"
                  >
                    <FiMenu className="h-6 w-6 text-caixa-light" />
                  </button>
                )}
                
                {/* ✅ BOTÃO PARA MOSTRAR SIDEBAR - SÓ APARECE QUANDO SIDEBAR ESTÁ ESCONDIDO */}
                {!sidebarVisible && (
                  <button
                    onClick={toggleSidebarVisibility}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-caixa-primary/30 transition-colors"
                    title="Mostrar Sidebar"
                  >
                    <FiMenu className="h-6 w-6 text-caixa-light" />
                    <span className="text-caixa-light text-sm">Menu</span>
                  </button>
                )}
              </div>
              
              {/* ✅ TÍTULO DA PÁGINA ATUAL (OPCIONAL) */}
              <div className="text-white font-medium">
                {/* Você pode adicionar aqui o título da página atual */}
              </div>
            </div>
          )}
        </header>

        {/* Content Area - Now expands properly */}
        <div className="flex-1 w-full">
          {/* Mobile Overlay - Só aparece se sidebar estiver visível */}
          {isMobile && sidebarOpen && sidebarVisible && (
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main Content - Full width and height */}
          <div className="h-full w-full">{children}</div>
        </div>

        {/* Footer */}
        <footer className="bg-caixa-primary/80 backdrop-blur-md border-t border-caixa-light/20">
          <Footer />
        </footer>
      </main>
    </div>
  );
};

export default MainLayout;