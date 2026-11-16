"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UserCog, Activity, ShieldCheck, Building2, Banknote, QrCode, X, Crown, Building,
  FileText, CreditCard, ChartNoAxesColumn, House, Wallet, TrendingUp, TrendingDown,
  ChartLine, CalendarDays, Contact, Users, Lock, FileSignature, ClipboardList, UserRound,
  Calendar, Calculator,
} from "@/components/icons";
import { usePendencias } from "@/lib/use-pendencias";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// Sidebar do shell InnLex: trilho navy de 264px, rótulos de grupo em caixa
// alta e o "scoop" no item ativo. Menu plano (sem seções recolhíveis), em
// grupos curtos pelo uso: Início, Dia a dia, Dinheiro, Equipe e Ajustes.
// "Sair" fica no menu do avatar, no topo.
function NavItem({ href, icon: Icon, label, isActive, badge, bloqueado, recurso }) {
  // Recurso fora do plano: continua visível (a pessoa descobre que existe) e
  // leva para Minha assinatura, com cadeado — convite, não beco sem saída.
  if (bloqueado) {
    return (
      <Link href={`/minha-assinatura?recurso=${recurso}`} className="isidebar-link isidebar-locked" title="Disponível em outro plano">
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

export function Sidebar({ onClose, recursos }) {
  const { hasRole, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const isStaffRole = hasRole("administrador") || hasRole("correspondente");
  const pendencias = usePendencias(pathname, { isStaff: isStaffRole, operacional: isStaffRole || hasRole("corretor") });
  const badges = { "/lembretes": pendencias.tarefas, "/clientes/lista": pendencias.clientes };
  const navRef = useRef(null);

  // Grupos na ordem do negócio. Grupo sem item visível para o papel some.
  const groups = useMemo(() => {
    const isAdmin = hasRole("administrador");
    const isStaff = isAdmin || hasRole("correspondente");
    const operacional = isStaff || hasRole("corretor");

    return [
      {
        label: "Início",
        items: [
          { href: "/dashboard", icon: ChartLine, label: "Dashboard" },
          ...(isAdmin ? [{ href: "/relatorio", icon: ChartNoAxesColumn, label: "Relatórios" }] : []),
        ],
      },
      {
        label: "Dia a dia",
        items: [
          ...(isStaff ? [{ href: "/lembretes", icon: CalendarDays, label: "Tarefas" }] : []),
          // Visitas e Simulador existiam mas não tinham link em lugar nenhum.
          ...(operacional ? [
            { href: "/visitas", icon: Calendar, label: "Visitas" },
            { href: "/clientes/lista", icon: Contact, label: "Clientes" },
            { href: "/imoveis/lista", icon: Building2, label: "Imóveis" },
            { href: "/simulador", icon: Calculator, label: "Simulador" },
          ] : []),
          ...(isStaff ? [{ href: "/proprietarios/lista", icon: Users, label: "Proprietários" }] : []),
          { href: "/propostas", icon: FileText, label: "Propostas" },
          ...(isStaff ? [
            { href: "/contratos/lista", icon: FileSignature, label: "Contratos" },
            { href: "/laudos", icon: ClipboardList, label: "Laudos" },
          ] : []),
        ],
      },
      {
        label: "Dinheiro",
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
        label: "Equipe",
        items: isStaff ? [
          { href: "/corretores/lista", icon: UserCog, label: "Corretores" },
          { href: "/correspondentes/lista", icon: ShieldCheck, label: "Correspondentes" },
        ] : [],
      },
      {
        label: "Ajustes",
        items: [
          { href: "/configuracoes", icon: UserRound, label: "Meu perfil" },
          ...(isAdmin ? [{ href: "/configuracoes-empresa", icon: Building, label: "Minha empresa" }] : []),
          ...(isStaff ? [{ href: "/whatsapp-qr", icon: QrCode, label: "WhatsApp", recurso: "has_whatsapp" }] : []),
          ...(isAdmin ? [
            { href: "/minha-assinatura", icon: CreditCard, label: "Minha assinatura" },
            { href: "/acessos", icon: Activity, label: "Acessos" },
          ] : []),
          ...(isSuperAdmin ? [{ href: "/super-admin", icon: Crown, label: "Super Admin" }] : []),
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

  // Depois de navegar, o item ativo pode estar abaixo da dobra do menu:
  // rola só o necessário para ele aparecer (sem animação, sem pular a página).
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

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

      <nav ref={navRef} className="isidebar-nav" aria-label="Menu principal">
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
                recurso={item.recurso}
              />
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
}
