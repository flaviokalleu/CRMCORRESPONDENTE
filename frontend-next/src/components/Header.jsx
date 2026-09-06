"use client";

import { useMemo, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, PanelLeft, Settings, LogOut, ChevronDown, Bell, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/visitas": "Visitas",
  "/propostas": "Propostas",
  "/clientes/lista": "Clientes",
  "/clientes/adicionar": "Adicionar Cliente",
  "/imoveis/lista": "Imóveis",
  "/imoveis/adicionar": "Adicionar Imóvel",
  "/corretores/lista": "Corretores",
  "/correspondentes/lista": "Correspondentes",
  "/proprietarios/lista": "Proprietários",
  "/alugueis": "Imóveis em Locação",
  "/clientes-aluguel": "Inquilinos",
  "/contratos/lista": "Contratos",
  "/pagamentos/lista": "Pagamentos",
  "/lembretes": "Lembretes",
  "/whatsapp-qr": "QR Code WhatsApp",
  "/super-admin": "Super Admin",
  "/configuracoes-empresa": "Minha Empresa",
  "/configuracoes": "Configurações",
};

const initialsOf = (name) =>
  (name || "U").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

export function Header({ isMobile, sidebarVisible, onToggleSidebarOpen, onShowSidebar }) {
  const searchRef = useRef(null);
  useEffect(() => {
    const shortcut = (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasRole } = useAuth();

  const pageTitle = useMemo(() => PAGE_TITLES[pathname] || "CRM IMOB", [pathname]);
  const displayRole = useMemo(() => {
    if (hasRole("administrador")) return "Administrador";
    if (hasRole("correspondente")) return "Correspondente";
    if (hasRole("corretor")) return "Corretor";
    return "Usuário";
  }, [hasRole]);

  const fullName = `${user?.first_name || "Usuário"} ${user?.last_name || ""}`.trim();

  return (
    <header className="ref-header sticky top-0 z-40">
      <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-caixa-orange/50 to-transparent" />
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {isMobile && sidebarVisible && (
            <button onClick={onToggleSidebarOpen} aria-label="Abrir menu" title="Abrir menu" className="flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <Menu className="h-5 w-5" strokeWidth={1.8} />
            </button>
          )}
          {!sidebarVisible && (
            <button onClick={onShowSidebar} className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white" title="Mostrar menu">
              <PanelLeft className="h-4 w-4" strokeWidth={1.8} />
              <span className="text-sm">Menu</span>
            </button>
          )}
          <form action="/clientes/lista" className="ref-search" role="search"><Search size={21} /><input ref={searchRef} name="search" aria-label="Buscar clientes por nome ou CPF" placeholder="Buscar leads, clientes, CPF..." /><kbd>Ctrl + K</kbd></form>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => router.push("/lembretes")} aria-label="Notificações" title="Notificações" className="flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <Bell className="h-4 w-4" strokeWidth={1.8} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl px-2 py-1.5 outline-none transition-colors hover:bg-white/10 data-[state=open]:bg-white/10">
              <Avatar className="h-7 w-7 border border-white/10">
                <AvatarFallback className="bg-white text-[11px] font-semibold text-cx-blue">{initialsOf(fullName)}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left lg:block">
                <p className="text-xs font-medium leading-none text-white">{fullName}</p>
                <p className="mt-0.5 text-[10px] leading-none text-white/70">{displayRole}</p>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-white/70 lg:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <p className="text-caixa-gray-700">{fullName}</p>
                  <p className="mt-0.5 font-normal text-caixa-gray-400">{user?.email}</p>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/configuracoes">
                  <Settings className="h-4 w-4 text-caixa-gray-400" strokeWidth={1.8} />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                <LogOut className="h-4 w-4" strokeWidth={1.8} />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
