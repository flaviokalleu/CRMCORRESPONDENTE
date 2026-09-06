"use client";

import { CaixaBrand } from "@/components/CaixaBrand";
import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, LogOut, Settings, LayoutDashboard, UserPlus, UserCog,
  ShieldCheck, Building2, Users, ClipboardList, Banknote,
  QrCode, PanelLeftClose, X, Crown, Building, FileText,
  Handshake, KeyRound, Calculator, ChartNoAxesColumn, CalendarCheck, House,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const initialsOf = (name) =>
  (name || "U").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

function NavItem({ href, icon: Icon, label, isActive, nested = false }) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        nested && "py-1.5",
        isActive ? "ref-nav-active text-white" : "text-white/80 hover:bg-white/[0.05] hover:text-white/90"
      )}
    >
      {isActive && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-cx-orange" />}
      <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-white" : "text-white/80 group-hover:text-white/80")} strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function NavGroup({ groupKey, icon: Icon, label, isOpen, onToggle, items, pathname }) {
  const hasActiveChild = items.some((i) => i.href === pathname);
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "group flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors",
          isOpen || hasActiveChild ? "bg-white/[0.04] text-white/90" : "text-white/80 hover:bg-white/[0.05] hover:text-white/90"
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className={cn("h-4 w-4", hasActiveChild ? "text-white" : "text-white/80 group-hover:text-white/80")} strokeWidth={1.75} />
          {label}
        </span>
        <ChevronRight className={cn("h-3.5 w-3.5 text-white/70 transition-transform duration-200", isOpen && "rotate-90")} />
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
                <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} isActive={pathname === item.href} nested />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar({ onClose, onToggleVisibility }) {
  const { user, logout, hasRole, isSuperAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = useCallback((key) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] })), []);

  const nomeSistema = process.env.NEXT_PUBLIC_NOME_SISTEMA || "CRM IMOB";

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const displayRole = useMemo(() => {
    if (hasRole("administrador")) return "Administrador";
    if (hasRole("correspondente")) return "Correspondente";
    if (hasRole("corretor")) return "Corretor";
    return "Usuário";
  }, [hasRole]);

  const fullName = useMemo(() => `${user?.first_name || "Usuário"} ${user?.last_name || ""}`.trim(), [user]);

  const { top, groups, bottomExtra } = useMemo(() => {
    const top = [{ href: "/dashboard", icon: House, label: "Dashboard" }];
    const groups = [];
    const bottomExtra = [];

    const isStaff = hasRole("administrador") || hasRole("correspondente");
    const isCorretor = hasRole("corretor");
    if (isCorretor || isStaff) top.push(
      { href: "/clientes/lista?view=kanban", icon: UserPlus, label: "Leads" },
      { href: "/clientes/lista", icon: Users, label: "Clientes" },
      { href: "/imoveis/lista", icon: House, label: "Imóveis" },
      { href: "/simulador", icon: Calculator, label: "Simulações" },
    );
    top.push({ href: "/propostas", icon: FileText, label: "Propostas" });
    if (isStaff) top.push({ href: "/contratos/lista", icon: ClipboardList, label: "Contratos" });
    if (isCorretor || isStaff) top.push({ href: "/visitas", icon: Handshake, label: "Atendimentos" });
    if (isStaff) top.push({ href: "/lembretes", icon: CalendarCheck, label: "Tarefas" });
    if (hasRole("administrador")) top.push({ href: "/relatorio", icon: ChartNoAxesColumn, label: "Relatórios" });

    // Só entra em "Mais ferramentas" o que o menu principal acima já não cobre.
    // Listar Clientes, Listar Imóveis, Propostas e Contratos saíram daqui porque
    // apontavam para as mesmas rotas dos itens do topo.
    if (isCorretor || isStaff) bottomExtra.push({ href: "/clientes/adicionar", icon: UserPlus, label: "Adicionar Cliente" });
    if (isStaff) bottomExtra.push({ href: "/imoveis/adicionar", icon: Building2, label: "Adicionar Imóvel" });

    if (isStaff) {
      groups.push({
        key: "pessoas",
        icon: UserCog,
        label: "Equipe",
        items: [
          { href: "/corretores/adicionar", icon: UserPlus, label: "Adicionar Corretor" },
          { href: "/corretores/lista", icon: UserCog, label: "Corretores" },
          { href: "/correspondentes/adicionar", icon: UserPlus, label: "Adicionar Correspondente" },
          { href: "/correspondentes/lista", icon: ShieldCheck, label: "Correspondentes" },
          { href: "/proprietarios/lista", icon: Users, label: "Proprietários" },
        ],
      });

      groups.push({
        key: "alugueis",
        icon: KeyRound,
        label: "Aluguéis",
        items: [
          { href: "/alugueis/adicionar", icon: Building2, label: "Adicionar Imóvel p/ Locação" },
          { href: "/alugueis", icon: Building2, label: "Imóveis em Locação" },
          { href: "/clientes-aluguel", icon: Users, label: "Inquilinos" },
        ],
      });

      bottomExtra.push({ href: "/pagamentos/lista", icon: Banknote, label: "Pagamentos" });
      bottomExtra.push({ href: "/whatsapp-qr", icon: QrCode, label: "QR Code WhatsApp" });
    }

    if (isSuperAdmin) bottomExtra.push({ href: "/super-admin", icon: Crown, label: "Super Admin" });
    if (hasRole("administrador")) bottomExtra.push({ href: "/configuracoes-empresa", icon: Building, label: "Minha Empresa" });

    return { top, groups, bottomExtra };
  }, [hasRole, isSuperAdmin]);

  return (
    <div className="ref-sidebar flex h-full flex-col text-white">
      <div className="ref-sidebar-brand flex flex-shrink-0 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <CaixaBrand subtitle />
        </Link>
        <div className="flex items-center gap-0.5">
          {onToggleVisibility && (
            <button onClick={onToggleVisibility} className="hidden h-7 w-7 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white md:flex" title="Recolher menu">
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
          <button onClick={onClose} aria-label="Fechar menu" title="Fechar menu" className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white md:hidden">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-caixa-orange/50 to-transparent" />

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <div className="space-y-0.5">
          {top.map((item) => (
            <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} isActive={pathname === item.href} />
          ))}
        </div>

        <details className="ref-more-menu"><summary>Mais ferramentas</summary>
        <div className="space-y-0.5">
          {groups.map((g) => (
            <NavGroup key={g.key} groupKey={g.key} icon={g.icon} label={g.label} isOpen={!!openGroups[g.key]} onToggle={() => toggleGroup(g.key)} items={g.items} pathname={pathname} />
          ))}
        </div>

        {bottomExtra.length > 0 && (
          <div className="mt-4 space-y-0.5">
            {bottomExtra.map((item) => (
              <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} isActive={pathname === item.href} />
            ))}
          </div>
        )}

        </details>
        <Separator className="my-3 bg-white/10" />

        <div className="space-y-0.5">
          <NavItem href="/configuracoes" icon={Settings} label="Configurações" isActive={pathname === "/configuracoes"} />
          <button onClick={handleLogout} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-red-500/10 hover:text-red-300">
            <LogOut className="h-4 w-4 text-white/80 group-hover:text-red-300" strokeWidth={1.75} />
            Sair
          </button>
        </div>
      </nav>

      <div className="flex-shrink-0 px-4 py-2">
        <p className="text-center text-[10px] text-white/70">&copy; {new Date().getFullYear()} {nomeSistema}</p>
      </div>
    </div>
  );
}
