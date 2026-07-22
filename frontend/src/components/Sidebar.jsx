import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  LogOut,
  Settings,
  LayoutDashboard,
  UserPlus,
  UserCog,
  ShieldCheck,
  Building2,
  List,
  Bell,
  Users,
  ClipboardList,
  Banknote,
  QrCode,
  PanelLeftClose,
  X,
  Crown,
  Building,
  CalendarCheck,
  FileText,
  Handshake,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { cn } from "../lib/utils";

// ─── Componentes FORA do Sidebar (estáveis, não recriam a cada render) ───

const initialsOf = (name) =>
  (name || "U")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const NavItem = ({ to, icon: Icon, label, isActive, nested = false }) => (
  <Link
    to={to}
    className={cn(
      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
      nested && "py-1.5",
      isActive
        ? "bg-white/[0.09] text-white"
        : "text-white/55 hover:bg-white/[0.05] hover:text-white/90"
    )}
  >
    {isActive && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-caixa-orange" />}
    <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-caixa-orange" : "text-white/35 group-hover:text-white/60")} strokeWidth={1.75} />
    <span className="truncate">{label}</span>
  </Link>
);

const NavGroup = ({ groupKey, icon: Icon, label, isOpen, onToggle, items, pathname }) => {
  const hasActiveChild = items.some((i) => i.to === pathname);
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "group flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors",
          isOpen || hasActiveChild ? "bg-white/[0.04] text-white/90" : "text-white/55 hover:bg-white/[0.05] hover:text-white/90"
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className={cn("h-4 w-4", hasActiveChild ? "text-caixa-orange" : "text-white/35 group-hover:text-white/60")} strokeWidth={1.75} />
          {label}
        </span>
        <ChevronRight
          className={cn("h-3.5 w-3.5 text-white/25 transition-transform duration-200", isOpen && "rotate-90")}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={groupKey}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-[18px] mt-1 space-y-0.5 border-l border-white/10 pl-3 py-0.5">
              {items.map((item) => (
                <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} isActive={pathname === item.to} nested />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Sidebar principal ───

const Sidebar = ({ open, onClose, onToggleVisibility }) => {
  const { user, logout, hasRole, isSuperAdmin: ctxSuperAdmin } = useAuth();
  const isSuperAdmin = ctxSuperAdmin || user?.is_super_admin || false;
  const navigate = useNavigate();
  const location = useLocation();

  const [timeRemaining, setTimeRemaining] = useState("...");
  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = useCallback((key) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const nomeSistema = import.meta.env.VITE_NOME_SISTEMA || "CRM IMOB";

  // Refs para evitar recriação do interval
  const logoutRef = useRef(logout);
  const navigateRef = useRef(navigate);
  useEffect(() => { logoutRef.current = logout; }, [logout]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  const handleLogout = useCallback(() => {
    logoutRef.current();
    navigateRef.current("/login");
  }, []);

  // Token time — estável, só depende de tokenExpiry
  const calcTime = useCallback(() => {
    try {
      if (user?.tokenExpiry) {
        const diff = new Date(user.tokenExpiry).getTime() - Date.now();
        if (diff <= 0) return "Expirado";
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
      }
      const token = localStorage.getItem("authToken");
      if (!token) return "—";
      const parts = token.split(".");
      if (parts.length !== 3) return "—";
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(
        decodeURIComponent(atob(padded).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""))
      );
      if (!payload.exp) return "—";
      const diff = payload.exp * 1000 - Date.now();
      if (diff <= 0) return "Expirado";
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
    } catch {
      return "—";
    }
  }, [user?.tokenExpiry]);

  useEffect(() => {
    setTimeRemaining(calcTime());
    const id = setInterval(() => {
      const t = calcTime();
      setTimeRemaining(t);
      if (t === "Expirado") {
        clearInterval(id);
        logoutRef.current();
        navigateRef.current("/login");
      }
    }, 1000);
    return () => clearInterval(id);
  }, [calcTime]);

  const displayRole = useMemo(() => {
    if (hasRole("administrador")) return "Administrador";
    if (hasRole("correspondente")) return "Correspondente";
    if (hasRole("corretor")) return "Corretor";
    return "Usuário";
  }, [hasRole]);

  const photoUrl = useMemo(() => {
    if (!user?.photo) return null;
    const dir = hasRole("administrador")
      ? "imagem_administrador"
      : hasRole("correspondente")
      ? "imagem_correspondente"
      : hasRole("corretor")
      ? "corretor"
      : "imagem_user";
    return `${import.meta.env.VITE_API_URL}/uploads/${dir}/${user.photo}`;
  }, [user?.photo, hasRole]);

  const fullName = useMemo(
    () => `${user?.first_name || "Usuário"} ${user?.last_name || ""}`.trim(),
    [user?.first_name, user?.last_name]
  );

  // Estrutura em árvore: itens de topo (sem submenu) + grupos com submenu.
  const { top, groups, bottomExtra } = useMemo(() => {
    const top = [{ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }];
    const groups = [];
    const bottomExtra = [];

    const isStaff = hasRole("administrador") || hasRole("correspondente");
    const isCorretor = hasRole("corretor");

    // Vendas — visitas/propostas, visível a todos os perfis operacionais
    groups.push({
      key: "vendas",
      icon: Handshake,
      label: "Vendas",
      items: [
        { to: "/visitas", icon: CalendarCheck, label: "Visitas" },
        { to: "/propostas", icon: FileText, label: "Propostas" },
      ],
    });

    // Clientes
    if (isCorretor || isStaff) {
      const items = [{ to: "/clientes/lista", icon: List, label: "Listar Clientes" }];
      if (isStaff || isCorretor) items.unshift({ to: "/clientes/adicionar", icon: UserPlus, label: "Adicionar Cliente" });
      groups.push({ key: "clientes", icon: Users, label: "Clientes", items });
    }

    // Imóveis
    if (isCorretor || isStaff) {
      const items = [{ to: "/imoveis/lista", icon: ClipboardList, label: "Listar Imóveis" }];
      if (isStaff) items.unshift({ to: "/imoveis/adicionar", icon: Building2, label: "Adicionar Imóvel" });
      groups.push({ key: "imoveis", icon: Building2, label: "Imóveis", items });
    }

    // Pessoas (equipe) — só staff
    if (isStaff) {
      groups.push({
        key: "pessoas",
        icon: UserCog,
        label: "Equipe",
        items: [
          { to: "/corretores/adicionar", icon: UserPlus, label: "Adicionar Corretor" },
          { to: "/corretores/lista", icon: UserCog, label: "Corretores" },
          { to: "/correspondentes/adicionar", icon: UserPlus, label: "Adicionar Correspondente" },
          { to: "/correspondentes/lista", icon: ShieldCheck, label: "Correspondentes" },
          { to: "/proprietarios/lista", icon: Users, label: "Proprietários" },
        ],
      });

      // Aluguéis
      groups.push({
        key: "alugueis",
        icon: KeyRound,
        label: "Aluguéis",
        items: [
          { to: "/alugueis/adicionar", icon: Building2, label: "Adicionar Imóvel p/ Locação" },
          { to: "/alugueis", icon: Building2, label: "Imóveis em Locação" },
          { to: "/clientes-aluguel", icon: Users, label: "Inquilinos" },
          { to: "/contratos/lista", icon: FileText, label: "Contratos" },
        ],
      });

      // Financeiro
      groups.push({
        key: "financeiro",
        icon: Banknote,
        label: "Financeiro",
        items: [
          { to: "/pagamentos/lista", icon: Banknote, label: "Pagamentos" },
        ],
      });

      bottomExtra.push({ to: "/lembretes", icon: Bell, label: "Lembretes" });
      bottomExtra.push({ to: "/whatsapp-qr", icon: QrCode, label: "QR Code WhatsApp" });
    }

    if (isSuperAdmin) {
      bottomExtra.push({ to: "/super-admin", icon: Crown, label: "Super Admin" });
    }
    if (hasRole("administrador")) {
      bottomExtra.push({ to: "/configuracoes-empresa", icon: Building, label: "Minha Empresa" });
    }

    return { top, groups, bottomExtra };
  }, [hasRole, isSuperAdmin]);

  const pathname = location.pathname;

  return (
    <div className="flex h-full flex-col bg-caixa-primary text-white">
      {/* Header */}
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/10 px-4">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <img src="/logo-crm-imob.svg" alt={nomeSistema} className="h-6 w-auto" />
          <span className="text-sm font-semibold tracking-tight text-white">{nomeSistema}</span>
        </Link>
        <div className="flex items-center gap-0.5">
          {onToggleVisibility && (
            <button
              onClick={onToggleVisibility}
              className="hidden h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white md:flex"
              title="Recolher menu"
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="mx-3 mt-3 flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-3">
        <Avatar className="h-9 w-9 border border-white/10">
          {photoUrl && <AvatarImage src={photoUrl} alt={fullName} />}
          <AvatarFallback>{initialsOf(fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{fullName}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-[11px] text-white/45">{displayRole}</span>
            <span className="text-white/20">·</span>
            <div className="flex items-center gap-1">
              <div className={cn("h-1.5 w-1.5 rounded-full", timeRemaining === "Expirado" ? "bg-red-400" : "bg-emerald-400")} />
              <span className={cn("font-mono text-[10px]", timeRemaining === "Expirado" ? "text-red-400" : "text-white/40")}>
                {timeRemaining}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <div className="space-y-0.5">
          {top.map((item) => (
            <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} isActive={pathname === item.to} />
          ))}
        </div>

        <p className="mb-1.5 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/25">
          Menu
        </p>
        <div className="space-y-0.5">
          {groups.map((g) => (
            <NavGroup
              key={g.key}
              groupKey={g.key}
              icon={g.icon}
              label={g.label}
              isOpen={!!openGroups[g.key]}
              onToggle={() => toggleGroup(g.key)}
              items={g.items}
              pathname={pathname}
            />
          ))}
        </div>

        {bottomExtra.length > 0 && (
          <div className="mt-4 space-y-0.5">
            {bottomExtra.map((item) => (
              <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} isActive={pathname === item.to} />
            ))}
          </div>
        )}

        <Separator className="my-3 bg-white/10" />

        <div className="space-y-0.5">
          <NavItem to="/configuracoes" icon={Settings} label="Configurações" isActive={pathname === "/configuracoes"} />
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/55 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4 text-white/35 group-hover:text-red-400" strokeWidth={1.75} />
            Sair
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-white/10 px-4 py-3">
        <p className="text-center text-[10px] text-white/25">
          &copy; {new Date().getFullYear()} {nomeSistema}
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
