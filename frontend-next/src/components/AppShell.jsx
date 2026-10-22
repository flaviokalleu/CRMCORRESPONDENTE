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

  useEffect(() => {
    const check = () => {
      // Abaixo de 1024px a sidebar vira drawer (padrão do shell InnLex).
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    const frame = window.requestAnimationFrame(check);
    window.addEventListener("resize", check);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", check);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) return undefined;
    const frame = window.requestAnimationFrame(() => setSidebarOpen(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, isMobile]);

  return (
    <div
      className="app-shell-root flex h-screen overflow-hidden"
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-cx-blue focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Pular para o conteúdo
      </a>

      {(
        <aside
          className={`app-shell-aside fixed inset-y-0 left-0 z-50 shrink-0 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 print:hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </aside>
      )}

      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="app-shell-main flex flex-1 flex-col min-w-0 overflow-hidden">
        <div className="print:hidden">
          <Header isMobile={isMobile} onToggleSidebarOpen={() => setSidebarOpen((v) => !v)} />
        </div>
        {/* Superfície clara "cx": vale para toda página renderizada no shell.
            A moldura (sidebar/header) fica no azul institucional escuro e o
            conteúdo em cinza levíssimo, com os cartões em branco — o mesmo
            arranjo dos portais da Caixa. */}
        {/* <main> é o landmark que o leitor de tela usa para pular direto ao
            conteúdo — sem ele o usuário precisa tabular por todo o menu a
            cada página. `id` para o link de pular navegação. */}
        <main id="conteudo" className="app-shell-scroll cx-page flex-1 w-full overflow-y-auto">
          <div className="crm-content min-h-full w-full" data-page={pathname}>{children}</div>
        </main>
      </div>
    </div>
  );
}
