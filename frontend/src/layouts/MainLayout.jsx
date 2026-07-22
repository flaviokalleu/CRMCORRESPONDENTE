import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, PanelLeft } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import NotificationBell from "../components/NotificationBell";
import { useAuth } from "../context/AuthContext";

const MainLayout = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Fechar sidebar mobile ao navegar
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  return (
    <div className="flex h-screen overflow-hidden bg-caixa-gradient">
      {/* Sidebar */}
      {sidebarVisible && (
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar
            open={sidebarOpen}
            onClose={() => isMobile && setSidebarOpen(false)}
            onToggleVisibility={() => setSidebarVisible(false)}
          />
        </aside>
      )}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && sidebarVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 bg-caixa-primary/80 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              {isMobile && sidebarVisible && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Menu className="h-6 w-6 text-white/70" />
                </button>
              )}
              {!sidebarVisible && (
                <button
                  onClick={() => setSidebarVisible(true)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Mostrar Menu"
                >
                  <PanelLeft className="h-6 w-6 text-white/70" />
                  <span className="text-white/70 text-sm">Menu</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 w-full overflow-y-auto">
          <div className="h-full w-full">{children}</div>
        </div>

        {/* Footer */}
        <footer className="bg-caixa-primary/50 border-t border-white/10">
          <Footer />
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
