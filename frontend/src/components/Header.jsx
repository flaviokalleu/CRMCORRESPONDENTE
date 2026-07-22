import React, { useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Menu, PanelLeft, Settings, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/visitas": "Visitas",
  "/propostas": "Propostas",
  "/clientes/lista": "Clientes",
  "/clientes/adicionar": "Adicionar Cliente",
  "/imoveis/lista": "Imóveis",
  "/imoveis/adicionar": "Adicionar Imóvel",
  "/corretores/lista": "Corretores",
  "/corretores/adicionar": "Adicionar Corretor",
  "/correspondentes/lista": "Correspondentes",
  "/correspondentes/adicionar": "Adicionar Correspondente",
  "/proprietarios/lista": "Proprietários",
  "/alugueis": "Imóveis em Locação",
  "/alugueis/adicionar": "Adicionar Imóvel p/ Locação",
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
  (name || "U")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Header = ({ isMobile, sidebarVisible, sidebarOpen, onToggleSidebarOpen, onShowSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();

  const pageTitle = useMemo(() => PAGE_TITLES[location.pathname] || "CRM IMOB", [location.pathname]);

  const displayRole = useMemo(() => {
    if (hasRole("administrador")) return "Administrador";
    if (hasRole("correspondente")) return "Correspondente";
    if (hasRole("corretor")) return "Corretor";
    return "Usuário";
  }, [hasRole]);

  const fullName = `${user?.first_name || "Usuário"} ${user?.last_name || ""}`.trim();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-caixa-primary/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {isMobile && sidebarVisible && (
            <button
              onClick={onToggleSidebarOpen}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Menu className="h-5 w-5" strokeWidth={1.8} />
            </button>
          )}
          {!sidebarVisible && (
            <button
              onClick={onShowSidebar}
              className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              title="Mostrar menu"
            >
              <PanelLeft className="h-4 w-4" strokeWidth={1.8} />
              <span className="text-sm">Menu</span>
            </button>
          )}
          <h1 className="hidden text-sm font-semibold text-white/90 sm:block">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl px-2 py-1.5 outline-none transition-colors hover:bg-white/10 data-[state=open]:bg-white/10">
              <Avatar className="h-7 w-7 border border-white/10">
                <AvatarFallback className="bg-caixa-orange text-[11px]">{initialsOf(fullName)}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left lg:block">
                <p className="text-xs font-medium leading-none text-white">{fullName}</p>
                <p className="mt-0.5 text-[10px] leading-none text-white/40">{displayRole}</p>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-white/40 lg:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>
                <p className="text-caixa-gray-700">{fullName}</p>
                <p className="mt-0.5 font-normal text-caixa-gray-400">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/configuracoes">
                  <Settings className="h-4 w-4 text-caixa-gray-400" strokeWidth={1.8} />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                <LogOut className="h-4 w-4" strokeWidth={1.8} />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
