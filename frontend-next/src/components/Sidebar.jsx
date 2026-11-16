"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UserCog, Activity, ShieldCheck, Building2, Banknote, QrCode, X, Crown, Building,
  FileText, CreditCard, ChartNoAxesColumn, House, Wallet, TrendingUp, TrendingDown,
  ChartLine, CalendarDays, Contact, SlidersHorizontal, Users, Lock,
} from "@/components/icons";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// Sidebar do shell InnLex: trilho navy de 264px, rótulos de grupo em caixa
// alta e o "scoop" no item ativo. Menu plano (sem seções recolhíveis), como
// no kit de referência; "Sair" fica na topbar.
function NavItem({ href, icon: Icon, label, isActive, badge, bloqueado }) {
  // Recurso fora do plano: continua visível (a pessoa descobre que existe) e
  // leva para Minha assinatura, com cadeado — convite, não beco sem saída.
  if (bloqueado) {
    return (
      <Link href="/minha-assinatura" className="isidebar-link isidebar-locked" title="Disponível em outro plano">
        <Icon className="isidebar-icon" />
        <span className="isidebar-label">{label}</span>
        <Lock className="isidebar-lock" aria-label="Disponível em outro plano" />
      </Link>
    );
  }
  return (
    <Link href={href} aria-current={isActive ? "page" : undefined} className={cn("isidebar-link", isActive && "is-active")}>
      <Icon className="isidebar-icon" />
      <span className="isidebar-label">{label}</span>
      {badge > 0 && <span className="isidebar-badge">{badge}</span>}
    </Link>
  );
}

const asList = (d) => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);

// Contagens das badges: o que pede atenção agora. Tarefas = lembretes não
// concluídos com data até hoje; Clientes = aguardando aprovação.
function useSidebarBadges(pathname, { isStaff, operacional }) {
  const [badges, setBadges] = useState({});
  const last = useRef(0);

  useEffect(() => {
    if (Date.now() - last.current < 60_000) return undefined;
    last.current = Date.now();
    let cancelled = false;
    const fimDeHoje = new Date(); fimDeHoje.setHours(23, 59, 59, 999);
    const get = (path) => fetch(`/api/backend${path}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

    Promise.all([
      isStaff ? get("/lembretes") : Promise.resolve(null),
      operacional ? get("/dashboard") : Promise.resolve(null),
    ]).then(([lembretes, dash]) => {
      if (cancelled) return;
      const tarefas = asList(lembretes).filter((t) => !t.concluido && t.status !== "concluido" && t.data && new Date(t.data) <= fimDeHoje).length;
      const main = dash?.data ?? dash;
      setBadges({
        "/lembretes": tarefas,
        "/clientes/lista": Number(main?.totalClientesAguardandoAprovacao) || 0,
      });
    });
    return () => { cancelled = true; };
  }, [pathname, isStaff, operacional]);

  return badges;
}

export function Sidebar({ onClose, recursos }) {
  const { hasRole, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const isStaffRole = hasRole("administrador") || hasRole("correspondente");
  const badges = useSidebarBadges(pathname, { isStaff: isStaffRole, operacional: isStaffRole || hasRole("corretor") });

  // Grupos na ordem do negócio. Grupo sem item visível para o papel some.
  const groups = useMemo(() => {
    const isAdmin = hasRole("administrador");
    const isStaff = isAdmin || hasRole("correspondente");
    const operacional = isStaff || hasRole("corretor");

    return [
      {
        label: "Resumo",
        items: [
          { href: "/dashboard", icon: ChartLine, label: "Dashboard" },
          ...(isAdmin ? [{ href: "/relatorio", icon: ChartNoAxesColumn, label: "Relatórios" }] : []),
        ],
      },
      {
        label: "Operação",
        items: [
          ...(isStaff ? [{ href: "/lembretes", icon: CalendarDays, label: "Tarefas" }] : []),
          ...(operacional ? [
            { href: "/clientes/lista", icon: Contact, label: "Clientes" },
            { href: "/imoveis/lista", icon: Building2, label: "Imóveis" },
          ] : []),
          { href: "/propostas", icon: FileText, label: "Propostas" },
        ],
      },
      {
        label: "Financeiro",
        items: [
          ...(isAdmin ? [
            { href: "/financeiro/dashboard", icon: Wallet, label: "Painel financeiro" },
            { href: "/financeiro/receitas", icon: TrendingUp, label: "Receitas" },
            { href: "/financeiro/despesas", icon: TrendingDown, label: "Despesas" },
          ] : []),
          ...(isStaff ? [{ href: "/pagamentos/lista", icon: Banknote, label: "Pagamentos", recurso: "has_pagamentos" }] : []),
        ],
      },
      {
        label: "Cadastros",
        items: isStaff ? [
          { href: "/corretores/lista", icon: UserCog, label: "Corretores" },
          { href: "/correspondentes/lista", icon: ShieldCheck, label: "Correspondentes" },
          { href: "/proprietarios/lista", icon: Users, label: "Proprietários" },
        ] : [],
      },
      {
        label: "Sistema",
        items: [
          ...(isStaff ? [{ href: "/whatsapp-qr", icon: QrCode, label: "QR Code WhatsApp", recurso: "has_whatsapp" }] : []),
          ...(isAdmin ? [
            { href: "/acessos", icon: Activity, label: "Acessos" },
            { href: "/configuracoes-empresa", icon: Building, label: "Minha empresa" },
            { href: "/minha-assinatura", icon: CreditCard, label: "Minha assinatura" },
          ] : []),
          ...(isSuperAdmin ? [{ href: "/super-admin", icon: Crown, label: "Super Admin" }] : []),
          { href: "/configuracoes", icon: SlidersHorizontal, label: "Configurações" },
        ],
      },
    ].filter((group) => group.items.length > 0);
  }, [hasRole, isSuperAdmin]);

  // O módulo fica ativo também nas telas filhas (Clientes › Adicionar).
  const isActive = (href) => {
    if (pathname === href) return true;
    if (href === "/dashboard") return false;
    const base = href.replace(/\/(lista|dashboard)$/, "");
    return pathname.startsWith(base + "/") && !groups.some((g) => g.items.some((i) => i.href !== href && pathname === i.href));
  };

  return (
    <div className="isidebar">
      <div className="isidebar-brand">
        <Link href="/dashboard" className="isidebar-home" aria-label="Webba CRM — Dashboard">
          <House className="isidebar-mark" />
          <span className="isidebar-name">Webba <span>CRM</span></span>
        </Link>
        <button type="button" onClick={onClose} aria-label="Fechar menu" title="Fechar menu" className="isidebar-close">
          <X />
        </button>
      </div>

      <nav className="isidebar-nav" aria-label="Menu principal">
        {groups.map((group) => (
          <div key={group.label} className="isidebar-group">
            <div className="isidebar-grouplabel">{group.label}</div>
            {group.items.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                badge={badges[item.href]}
                isActive={isActive(item.href)}
                bloqueado={Boolean(item.recurso && recursos && recursos[item.recurso] === false)}
              />
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
}
