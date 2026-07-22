import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import Header from "../components/Header";

const MainLayout = ({ children }) => {
  const location = useLocation();
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
          className={`fixed inset-y-0 left-0 z-50 w-64 p-2 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-full overflow-hidden rounded-2xl shadow-xl">
            <Sidebar
              open={sidebarOpen}
              onClose={() => isMobile && setSidebarOpen(false)}
              onToggleVisibility={() => setSidebarVisible(false)}
            />
          </div>
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
        <Header
          isMobile={isMobile}
          sidebarVisible={sidebarVisible}
          sidebarOpen={sidebarOpen}
          onToggleSidebarOpen={() => setSidebarOpen((v) => !v)}
          onShowSidebar={() => setSidebarVisible(true)}
        />

        {/* Content Area */}
        <div className="flex-1 w-full overflow-y-auto">
          <div className="h-full w-full">{children}</div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-caixa-primary/50">
          <Footer />
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
