"use client";

import { CaixaBrand } from "@/components/CaixaBrand";
import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, LogOut, Settings, UserPlus, UserCog, Activity,
  ShieldCheck, Building2, Users, ClipboardList, Banknote, FileBarChart2,
  QrCode, PanelLeftClose, X, Crown, Building, FileText, CreditCard,
  Handshake, KeyRound, Calculator, ChartNoAxesColumn, CalendarCheck, House,
  Wallet, TrendingUp, TrendingDown,
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

// Uma seção do menu. `collapsible: false` rende só um rótulo de leitura com os
// itens sempre à vista (as áreas de uso diário); `true` rende um cabeçalho que
// abre e fecha, para as áreas que a pessoa visita de vez em quando.
function NavSection({ section, pathname, isOpen, onToggle }) {
  const { key, label, items, collapsible } = section;

  const list = (
    <div className="space-y-0.5">
      {items.map((item) => (
        <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} isActive={pathname === item.href} />
      ))}
    </div>
  );

  if (!collapsible) {
    return (
      <div className="ref-nav-section">
        <p className="ref-nav-section-label">{label}</p>
        {list}
      </div>
    );
  }

  return (
    <div className="ref-nav-section">
      <button type="button" onClick={onToggle} aria-expanded={isOpen} className="ref-nav-section-label">
        <span>{label}</span>
        <ChevronRight className={cn("transition-transform duration-200", isOpen && "rotate-90")} strokeWidth={2} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={key}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {list}
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

  // Só guarda a seção que a pessoa abriu ou fechou na mão. Enquanto não mexer,
  // a seção da página atual nasce aberta e as outras fechadas.
  const [openSections, setOpenSections] = useState({});
  const toggleSection = useCallback((key) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] })), []);

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

  // Menu organizado pela etapa do negócio: captação -> negociação -> fechamento
  // -> dinheiro -> cadastros -> sistema. `pinned` fica solto no topo por ser o
  // que se abre todo dia. Seção sem item visível para o papel atual some.
  const { pinned, sections } = useMemo(() => {
    const isAdmin = hasRole("administrador");
    const isStaff = isAdmin || hasRole("correspondente");
    const isCorretor = hasRole("corretor");
    const operacional = isCorretor || isStaff;

    const pinned = [{ href: "/dashboard", icon: House, label: "Dashboard" }];
    if (isStaff) pinned.push({ href: "/lembretes", icon: CalendarCheck, label: "Tarefas" });

    const sections = [
      {
        key: "captacao",
        label: "Captação",
        collapsible: false,
        items: operacional ? [
          { href: "/clientes/lista?view=kanban", icon: UserPlus, label: "Leads" },
          { href: "/clientes/lista", icon: Users, label: "Clientes" },
          { href: "/imoveis/lista", icon: Building2, label: "Imóveis" },
        ] : [],
      },
      {
        key: "negociacao",
        label: "Negociação",
        collapsible: false,
        items: [
          ...(operacional ? [{ href: "/simulador", icon: Calculator, label: "Simulações" }] : []),
          { href: "/propostas", icon: FileText, label: "Propostas" },
          ...(operacional ? [{ href: "/visitas", icon: Handshake, label: "Atendimentos" }] : []),
          ...(isStaff ? [{ href: "/laudos", icon: FileBarChart2, label: "Laudos" }] : []),
        ],
      },
      {
        key: "fechamento",
        label: "Fechamento",
        collapsible: true,
        items: isStaff ? [
          { href: "/contratos/lista", icon: ClipboardList, label: "Contratos" },
          { href: "/alugueis", icon: KeyRound, label: "Imóveis em Locação" },
          { href: "/clientes-aluguel", icon: Users, label: "Inquilinos" },
        ] : [],
      },
      {
        key: "financeiro",
        label: "Financeiro",
        collapsible: true,
        items: [
          ...(isAdmin ? [
            { href: "/financeiro/dashboard", icon: Wallet, label: "Painel" },
            { href: "/financeiro/receitas", icon: TrendingUp, label: "Receitas" },
            { href: "/financeiro/despesas", icon: TrendingDown, label: "Despesas" },
          ] : []),
          ...(isStaff ? [{ href: "/pagamentos/lista", icon: Banknote, label: "Pagamentos" }] : []),
        ],
      },
      {
        key: "cadastros",
        label: "Cadastros",
        collapsible: true,
        items: isStaff ? [
          { href: "/corretores/lista", icon: UserCog, label: "Corretores" },
          { href: "/correspondentes/lista", icon: ShieldCheck, label: "Correspondentes" },
          { href: "/proprietarios/lista", icon: Users, label: "Proprietários" },
        ] : [],
      },
      {
        key: "sistema",
        label: "Sistema",
        collapsible: true,
        items: [
          ...(isAdmin ? [{ href: "/relatorio", icon: ChartNoAxesColumn, label: "Relatórios" }] : []),
          ...(isStaff ? [{ href: "/whatsapp-qr", icon: QrCode, label: "QR Code WhatsApp" }] : []),
          ...(isAdmin ? [
            { href: "/acessos", icon: Activity, label: "Acessos" },
            { href: "/configuracoes-empresa", icon: Building, label: "Minha Empresa" },
            { href: "/minha-assinatura", icon: CreditCard, label: "Minha Assinatura" },
          ] : []),
          ...(isSuperAdmin ? [{ href: "/super-admin", icon: Crown, label: "Super Admin" }] : []),
        ],
      },
    ];

    return { pinned, sections: sections.filter((section) => section.items.length > 0) };
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
          {pinned.map((item) => (
            <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} isActive={pathname === item.href} />
          ))}
        </div>

        {sections.map((section) => (
          <NavSection
            key={section.key}
            section={section}
            pathname={pathname}
            isOpen={openSections[section.key] ?? section.items.some((item) => item.href === pathname)}
            onToggle={() => toggleSection(section.key)}
          />
        ))}

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
