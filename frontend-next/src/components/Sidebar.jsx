"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, LogOut, Settings, LayoutDashboard, UserPlus, UserCog,
  ShieldCheck, Building2, List, Bell, Users, ClipboardList, Banknote,
  QrCode, PanelLeftClose, X, Crown, Building, FileText,
  Handshake, KeyRound,
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
        isActive ? "bg-white/[0.09] text-white" : "text-white/55 hover:bg-white/[0.05] hover:text-white/90"
      )}
    >
      {isActive && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-caixa-orange" />}
      <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-caixa-orange" : "text-white/35 group-hover:text-white/60")} strokeWidth={1.75} />
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
          isOpen || hasActiveChild ? "bg-white/[0.04] text-white/90" : "text-white/55 hover:bg-white/[0.05] hover:text-white/90"
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className={cn("h-4 w-4", hasActiveChild ? "text-caixa-orange" : "text-white/35 group-hover:text-white/60")} strokeWidth={1.75} />
          {label}
        </span>
        <ChevronRight className={cn("h-3.5 w-3.5 text-white/25 transition-transform duration-200", isOpen && "rotate-90")} />
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
    const top = [{ href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" }];
    const groups = [];
    const bottomExtra = [];

    const isStaff = hasRole("administrador") || hasRole("correspondente");
    const isCorretor = hasRole("corretor");

    groups.push({
      key: "vendas",
      icon: Handshake,
      label: "Vendas",
      items: [
        { href: "/propostas", icon: FileText, label: "Propostas" },
      ],
    });

    if (isCorretor || isStaff) {
      const items = [{ href: "/clientes/lista", icon: List, label: "Listar Clientes" }];
      items.unshift({ href: "/clientes/adicionar", icon: UserPlus, label: "Adicionar Cliente" });
      groups.push({ key: "clientes", icon: Users, label: "Clientes", items });
    }

    if (isCorretor || isStaff) {
      const items = [{ href: "/imoveis/lista", icon: ClipboardList, label: "Listar Imóveis" }];
      if (isStaff) items.unshift({ href: "/imoveis/adicionar", icon: Building2, label: "Adicionar Imóvel" });
      groups.push({ key: "imoveis", icon: Building2, label: "Imóveis", items });
    }

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
          { href: "/contratos/lista", icon: FileText, label: "Contratos" },
        ],
      });

      groups.push({
        key: "financeiro",
        icon: Banknote,
        label: "Financeiro",
        items: [{ href: "/pagamentos/lista", icon: Banknote, label: "Pagamentos" }],
      });

      bottomExtra.push({ href: "/lembretes", icon: Bell, label: "Lembretes" });
      bottomExtra.push({ href: "/whatsapp-qr", icon: QrCode, label: "QR Code WhatsApp" });
    }

    if (isSuperAdmin) bottomExtra.push({ href: "/super-admin", icon: Crown, label: "Super Admin" });
    if (hasRole("administrador")) bottomExtra.push({ href: "/configuracoes-empresa", icon: Building, label: "Minha Empresa" });

    return { top, groups, bottomExtra };
  }, [hasRole, isSuperAdmin]);

  return (
    <div className="flex h-full flex-col bg-caixa-primary text-white">
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/10 px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-caixa-orange to-caixa-orange-dark text-xs font-bold text-white shadow-md shadow-caixa-orange/20">
            {nomeSistema.slice(0, 1)}
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">{nomeSistema}</span>
        </Link>
        <div className="flex items-center gap-0.5">
          {onToggleVisibility && (
            <button onClick={onToggleVisibility} className="hidden h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white md:flex" title="Recolher menu">
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white md:hidden">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-caixa-orange/50 to-transparent" />

      <div className="mx-3 mt-3 flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-3">
        <Avatar className="h-9 w-9 border border-white/10">
          <AvatarFallback>{initialsOf(fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{fullName}</p>
          <p className="text-[11px] text-white/45">{displayRole}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <div className="space-y-0.5">
          {top.map((item) => (
            <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} isActive={pathname === item.href} />
          ))}
        </div>

        <p className="mb-1.5 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/25">Menu</p>
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

        <Separator className="my-3 bg-white/10" />

        <div className="space-y-0.5">
          <NavItem href="/configuracoes" icon={Settings} label="Configurações" isActive={pathname === "/configuracoes"} />
          <button onClick={handleLogout} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/55 transition-colors hover:bg-red-500/10 hover:text-red-400">
            <LogOut className="h-4 w-4 text-white/35 group-hover:text-red-400" strokeWidth={1.75} />
            Sair
          </button>
        </div>
      </nav>

      <div className="flex-shrink-0 border-t border-white/10 px-4 py-3">
        <p className="text-center text-[10px] text-white/25">&copy; {new Date().getFullYear()} {nomeSistema}</p>
      </div>
    </div>
  );
}
