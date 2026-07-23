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
      className="flex h-screen overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0B1426 0%, #122240 50%, #162a4a 100%)" }}
    >

      {sidebarVisible && (
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
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

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header
          isMobile={isMobile}
          sidebarVisible={sidebarVisible}
          onToggleSidebarOpen={() => setSidebarOpen((v) => !v)}
          onShowSidebar={() => setSidebarVisible(true)}
        />
        <div className="flex-1 w-full overflow-y-auto">
          <div className="h-full w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}
