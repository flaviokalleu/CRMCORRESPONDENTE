"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

// Equivalente ao MainLayout.jsx da SPA — porta 1:1 a lógica de
// responsivo/toggle, só trocando o roteamento para next/navigation.
export function AppShell({ children }) {
  const pathname = usePathname();
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

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  return (
    <div
      className="app-shell-root bg-aqua-frame flex h-screen overflow-hidden"
    >

      {sidebarVisible && (
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/20 transition-transform duration-300 ease-in-out md:static md:translate-x-0 print:hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar
            onClose={() => isMobile && setSidebarOpen(false)}
            onToggleVisibility={() => setSidebarVisible(false)}
          />
        </aside>
      )}

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

      <div className="app-shell-main flex flex-1 flex-col min-w-0 overflow-hidden">
        <div className="print:hidden">
          <Header
            isMobile={isMobile}
            sidebarVisible={sidebarVisible}
            onToggleSidebarOpen={() => setSidebarOpen((v) => !v)}
            onShowSidebar={() => setSidebarVisible(true)}
          />
        </div>
        {/* Superfície clara "cx": vale para toda página renderizada no shell.
            A moldura (sidebar/header) fica no azul institucional escuro e o
            conteúdo em cinza levíssimo, com os cartões em branco — o mesmo
            arranjo dos portais da Caixa. */}
        <div className="app-shell-scroll cx-page flex-1 w-full overflow-y-auto">
          <div className="h-full w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}
