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
  CreditCard,
  List,
  Bell,
  Users,
  ClipboardList,
  Banknote,
  QrCode,
  BarChart3,
  PanelLeftClose,
  X,
  Crown,
  Sparkles,
  Building,
  CalendarCheck,
  FileText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

// ─── Componentes FORA do Sidebar (estáveis, não recriam a cada render) ───

const UserAvatar = ({ name, photo, photoUrl, size = 44 }) => {
  const [imgError, setImgError] = useState(false);

  if (photo && photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-full w-full object-cover"
        onError={() => setImgError(true)}
        style={{ width: size, height: size }}
      />
    );
  }

  const colors = [
    '#F97316', '#4A8CB8', '#6B8F71', '#8B6B9F', '#B85A4A',
    '#4AB8A8', '#E67E22', '#5A7EB8', '#9F6B8B', '#6B9F71',
  ];
  const charCode = (name || 'U').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const bgColor = colors[charCode % colors.length];
  const initials = (name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <svg width={size} height={size} viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <rect width="44" height="44" rx="22" fill={bgColor} />
      <text x="22" y="22" textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize="16" fontWeight="600" fontFamily="sans-serif">
        {initials}
      </text>
    </svg>
  );
};

const NavItem = ({ to, icon: Icon, label, isActive }) => {
  const active = to && isActive;
  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-caixa-orange/20 text-caixa-orange"
          : "text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon
        className={`h-[18px] w-[18px] flex-shrink-0 ${
          active ? "text-caixa-orange" : "text-white/30 group-hover:text-white/60"
        }`}
        strokeWidth={1.8}
      />
      {label}
    </Link>
  );
};

const DropdownSection = ({ icon: Icon, label, isOpen, onToggle, items, pathname }) => (
  <>
    <button
      onClick={onToggle}
      className="group flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-white/60 transition-all duration-200 hover:bg-white/5 hover:text-white"
    >
      <span className="flex items-center gap-3">
        <Icon className="h-[18px] w-[18px] text-white/30 group-hover:text-white/60" strokeWidth={1.8} />
        {label}
      </span>
      <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
        <ChevronRight className="h-4 w-4 text-white/20" />
      </motion.span>
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="ml-5 space-y-0.5 border-l border-white/10 pl-3 py-1">
            {items.map((item) => (
              <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} isActive={pathname === item.to} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
);

// ─── Sidebar principal ───

const Sidebar = ({ open, onClose, onToggleVisibility }) => {
  const { user, logout, hasRole, isSuperAdmin: ctxSuperAdmin } = useAuth();
  const isSuperAdmin = ctxSuperAdmin || user?.is_super_admin || false;
  const navigate = useNavigate();
  const location = useLocation();

  const [timeRemaining, setTimeRemaining] = useState("...");
  const [addOpen, setAddOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const nomeSistema = process.env.REACT_APP_NOME_SISTEMA || "CRM IMOB";

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
    return `${process.env.REACT_APP_API_URL}/uploads/${dir}/${user.photo}`;
  }, [user?.photo, hasRole]);

  const fullName = useMemo(
    () => `${user?.first_name || "Usuário"} ${user?.last_name || ""}`.trim(),
    [user?.first_name, user?.last_name]
  );

  // Menu items memoizados — só recriam se roles mudarem
  const menu = useMemo(() => {
    const items = { add: [], list: [], extra: [], secondary: [] };

    items.extra.push({ to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" });
    items.secondary.push({ to: "/visitas", icon: CalendarCheck, label: "Visitas" });
    items.secondary.push({ to: "/propostas", icon: FileText, label: "Propostas" });

    if (hasRole("corretor")) {
      items.add.push({ to: "/clientes/adicionar", icon: UserPlus, label: "Adicionar Cliente" });
      items.list.push(
        { to: "/clientes/lista", icon: List, label: "Clientes" },
        { to: "/imoveis/lista", icon: ClipboardList, label: "Imóveis" }
      );
    }

    if (hasRole("correspondente")) {
      if (!items.add.some((i) => i.to === "/clientes/adicionar"))
        items.add.push({ to: "/clientes/adicionar", icon: UserPlus, label: "Adicionar Cliente" });
      if (!items.list.some((i) => i.to === "/clientes/lista"))
        items.list.push({ to: "/clientes/lista", icon: List, label: "Clientes" });
    }

    if (hasRole("administrador") || hasRole("correspondente")) {
      [
        { to: "/clientes/adicionar", icon: UserPlus, label: "Adicionar Cliente" },
        { to: "/corretores/adicionar", icon: UserCog, label: "Adicionar Corretor" },
        { to: "/correspondentes/adicionar", icon: ShieldCheck, label: "Adicionar Correspondente" },
        { to: "/imoveis/adicionar", icon: Building2, label: "Adicionar Imóvel" },
      ].forEach((i) => { if (!items.add.some((e) => e.to === i.to)) items.add.push(i); });

      [
        { to: "/proprietarios/lista", icon: Users, label: "Proprietários" },
        { to: "/lembretes", icon: Bell, label: "Lembretes" },
        { to: "/clientes/lista", icon: List, label: "Clientes" },
        { to: "/imoveis/lista", icon: ClipboardList, label: "Imóveis" },
        { to: "/corretores/lista", icon: UserCog, label: "Corretores" },
        { to: "/correspondentes/lista", icon: ShieldCheck, label: "Correspondentes" },
        { to: "/pagamentos/lista", icon: Banknote, label: "Pagamentos" },
      ].forEach((i) => { if (!items.list.some((e) => e.to === i.to)) items.list.push(i); });

      [
        { to: "/whatsapp-qr", icon: QrCode, label: "QR Code WhatsApp" },
      ].forEach((i) => { if (!items.extra.some((e) => e.to === i.to)) items.extra.push(i); });

      // Itens de aluguel
      items.list.push(
        { to: "/alugueis", icon: Building2, label: "Imoveis Aluguel" },
        { to: "/clientes-aluguel", icon: Users, label: "Inquilinos" },
        { to: "/contratos/lista", icon: FileText, label: "Contratos" }
      );
      items.add.push(
        { to: "/alugueis/adicionar", icon: Building2, label: "Adicionar Imovel Aluguel" }
      );
    }

    // ✅ Itens SaaS
    if (isSuperAdmin) {
      items.extra.push({ to: "/super-admin", icon: Crown, label: "Super Admin" });
    }
    if (hasRole("administrador")) {
      items.extra.push({ to: "/configuracoes-empresa", icon: Building, label: "Minha Empresa" });
    }

    return items;
  }, [hasRole, isSuperAdmin]);

  const pathname = location.pathname;

  return (
    <div className="flex h-full flex-col bg-caixa-gradient border-r border-white/10 text-white">
      {/* Header */}
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/10 px-5 bg-caixa-primary/50 backdrop-blur-md">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <img src="/logo-crm-imob.svg" alt={nomeSistema} className="h-7 w-auto" />
          <span className="text-sm font-bold text-white">{nomeSistema}</span>
        </Link>
        <div className="flex items-center gap-1">
          {onToggleVisibility && (
            <button
              onClick={onToggleVisibility}
              className="hidden h-7 w-7 items-center justify-center rounded text-white/40 transition-colors hover:bg-white/10 hover:text-white md:flex"
              title="Recolher menu"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-white/40 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4 bg-caixa-primary/30">
        <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-full border-2 border-caixa-orange/50 shadow-lg">
          <UserAvatar name={fullName} photo={user?.photo} photoUrl={photoUrl} size={44} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{fullName}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[11px] text-white/40">{displayRole}</span>
            <div className="flex gap-1">
              {hasRole("administrador") && (
                <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-red-400 border border-red-400/30">ADM</span>
              )}
              {hasRole("correspondente") && (
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/70 border border-white/20">COR</span>
              )}
              {hasRole("corretor") && (
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/70 border border-white/20">BRK</span>
              )}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${timeRemaining === "Expirado" ? "bg-red-400 animate-pulse" : "bg-emerald-400"}`} />
            <span className={`font-mono text-[10px] ${timeRemaining === "Expirado" ? "text-red-400" : "text-white/30"}`}>
              {timeRemaining}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-0.5">
          {menu.extra.map((item) => (
            <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} isActive={pathname === item.to} />
          ))}
        </div>

        {menu.add.length > 0 && <div className="my-3 border-t border-white/10" />}

        {menu.add.length > 0 && (
          <div className="space-y-0.5">
            <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-wider text-white/20">
              Cadastros
            </p>
            <DropdownSection
              icon={UserPlus}
              label="Adicionar"
              isOpen={addOpen}
              onToggle={() => setAddOpen((p) => !p)}
              items={menu.add}
              pathname={pathname}
            />
          </div>
        )}

        {menu.list.length > 0 && (
          <div className="mt-1 space-y-0.5">
            <DropdownSection
              icon={ClipboardList}
              label="Listagens"
              isOpen={listOpen}
              onToggle={() => setListOpen((p) => !p)}
              items={menu.list}
              pathname={pathname}
            />
          </div>
        )}

        {menu.secondary.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {menu.secondary.map((item) => (
              <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} isActive={pathname === item.to} />
            ))}
          </div>
        )}

        <div className="my-3 border-t border-white/10" />

        <div className="space-y-0.5">
          <NavItem to="/configuracoes" icon={Settings} label="Configurações" isActive={pathname === "/configuracoes"} />
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/60 transition-all duration-200 hover:bg-red-500/15 hover:text-red-400"
          >
            <LogOut className="h-[18px] w-[18px] text-white/30 group-hover:text-red-400" strokeWidth={1.8} />
            Sair
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-white/10 bg-caixa-primary/30 px-5 py-3">
        <p className="text-center text-[10px] text-white/20">
          &copy; {new Date().getFullYear()} {nomeSistema}
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
