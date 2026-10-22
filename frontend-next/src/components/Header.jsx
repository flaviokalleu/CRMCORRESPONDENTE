"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Settings, LogOut, ChevronRight, Bell, Search } from "@/components/icons";
import { userPhotoUrl, iniciaisDe } from "@/lib/user-avatar";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Nome de cada segmento de rota. O breadcrumb é do Shell, nunca da tela: ele
// o monta pela hierarquia da URL ("Início › Clientes › Adicionar").
const SEGMENT_LABELS = {
  dashboard: "Dashboard",
  visitas: "Visitas",
  propostas: "Propostas",
  contratos: "Contratos",
  clientes: "Clientes",
  "clientes-aluguel": "Inquilinos",
  "editar-cliente": "Editar cliente",
  imoveis: "Imóveis",
  imovel: "Imóvel",
  corretores: "Corretores",
  correspondentes: "Correspondentes",
  proprietarios: "Proprietários",
  alugueis: "Imóveis em locação",
  pagamentos: "Pagamentos",
  financeiro: "Financeiro",
  receitas: "Receitas",
  despesas: "Despesas",
  lembretes: "Tarefas",
  laudos: "Laudos",
  simulador: "Simulador",
  relatorio: "Relatórios",
  acessos: "Acessos",
  "whatsapp-qr": "QR Code WhatsApp",
  "super-admin": "Super Admin",
  "configuracoes-empresa": "Minha empresa",
  configuracoes: "Configurações",
  "minha-assinatura": "Minha assinatura",
  adicionar: "Adicionar",
  criar: "Novo",
  editar: "Editar",
  lista: null, // "/clientes/lista" é a própria página de Clientes
};

// Segmentos que não têm tela própria: aparecem como texto, não como link.
const NO_PAGE = new Set(["clientes", "imoveis", "corretores", "correspondentes", "proprietarios", "contratos", "pagamentos", "financeiro", "editar-cliente", "imovel", "editar"]);

function buildCrumbs(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = [];
  parts.forEach((part, i) => {
    const href = "/" + parts.slice(0, i + 1).join("/");
    if (part === "lista") {
      // A lista assume o lugar do módulo: "Clientes" passa a apontar para ela.
      if (crumbs.length) { crumbs[crumbs.length - 1].href = href; crumbs[crumbs.length - 1].linkable = true; }
      return;
    }
    const known = Object.prototype.hasOwnProperty.call(SEGMENT_LABELS, part);
    // IDs e UUIDs nunca aparecem: viram "Visualizar".
    const label = known ? SEGMENT_LABELS[part] : "Visualizar";
    if (part === "dashboard") return;
    crumbs.push({ label, href, linkable: known && !NO_PAGE.has(part) });
  });
  return crumbs;
}

function Breadcrumb({ pathname }) {
  const crumbs = useMemo(() => buildCrumbs(pathname), [pathname]);
  const onDashboard = crumbs.length === 0;
  const last = crumbs.length - 1;
  return (
    <nav aria-label="Trilha de navegação">
      <ol className="itopbar-crumbs">
        <li className="itopbar-crumb-item">
          {onDashboard
            ? <><span className="itopbar-crumb">Início</span><ChevronRight aria-hidden="true" className="itopbar-sep" /><span className="itopbar-crumb is-current" aria-current="page">Dashboard</span></>
            : <Link href="/dashboard" className="itopbar-crumb">Início</Link>}
        </li>
        {crumbs.map((c, i) => (
          // Em pouco espaço, fica só o pai e o item atual.
          <li key={c.href} className={i < last - 1 ? "itopbar-crumb-item itopbar-crumb-far" : "itopbar-crumb-item"}>
            <ChevronRight aria-hidden="true" className="itopbar-sep" />
            {i === last
              ? <span className="itopbar-crumb is-current" aria-current="page">{c.label}</span>
              : c.linkable ? <Link href={c.href} className="itopbar-crumb">{c.label}</Link> : <span className="itopbar-crumb">{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Header({ isMobile, onToggleSidebarOpen }) {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();

  const displayRole = useMemo(() => {
    if (hasRole("administrador")) return "Administrador";
    if (hasRole("correspondente")) return "Correspondente";
    if (hasRole("corretor")) return "Corretor";
    return "Usuário";
  }, [hasRole]);

  const fullName = `${user?.first_name || "Usuário"} ${user?.last_name || ""}`.trim();
  const photo = userPhotoUrl(user?.photo);

  return (
    <header className="itopbar">
      <div className="itopbar-start">
        {isMobile && (
          <button type="button" onClick={onToggleSidebarOpen} aria-label="Abrir menu" title="Abrir menu" className="itopbar-btn">
            <Menu />
          </button>
        )}
        <Breadcrumb pathname={pathname} />
      </div>

      <div className="itopbar-end">
        <Link href="/clientes/lista" aria-label="Buscar" title="Buscar" className="itopbar-btn"><Search /></Link>
        <Link href="/lembretes" aria-label="Notificações" title="Notificações" className="itopbar-btn">
          <Bell />
          <span aria-hidden="true" className="itopbar-dot" />
        </Link>
        <Link href="/configuracoes" aria-label="Configurações" title="Configurações" className="itopbar-btn"><Settings /></Link>
        <button type="button" onClick={() => logout()} aria-label="Sair" title="Sair" className="itopbar-btn"><LogOut /></button>

        <DropdownMenu>
          <DropdownMenuTrigger className="itopbar-profile outline-none">
            {photo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={photo} alt="" className="itopbar-avatar" />
              : <span className="itopbar-avatar">{iniciaisDe(fullName)}</span>}
            <span className="itopbar-profile-meta">
              <span className="itopbar-profile-name">{fullName}</span>
              <span className="itopbar-profile-role">{displayRole}</span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <p className="text-ink-heading">{fullName}</p>
                <p className="mt-0.5 font-normal text-ink-muted">{user?.email}</p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/configuracoes">
                <Settings className="h-4 w-4 text-ink-muted" />
                Configurações
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:bg-red-100 focus:text-red-600">
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
