import { NextResponse } from "next/server";

// Checagem OTIMISTA de sessão (só olha se o cookie existe — não valida
// assinatura/expiração aqui, isso o backend Go faz a cada chamada real via
// lib/api-server.js e app/api/backend/[...path]). O objetivo é só redirecionar
// instantaneamente, antes de qualquer componente renderizar, evitando o flash
// de "carregando..." que a SPA atual tem. Ver MIGRATION.md §1.0.

const ACCESS_COOKIE = "cri_token";
const REFRESH_COOKIE = "cri_refresh";

// Prefixos de rota protegida — espelha o `ProtectedRoute`/`AdminOnlyRoute`/
// `SuperAdminRoute` da SPA atual (ver MIGRATION.md §0). A checagem de ROLE
// (admin/super-admin) continua sendo feita no servidor por página, aqui é só
// "está logado ou não".
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/configuracoes",
  "/clientes",
  "/corretores",
  "/correspondentes",
  "/imoveis/adicionar",
  "/imoveis/lista",
  "/imovel/",
  "/proprietarios",
  "/laudos",
  "/simulador",
  "/visitas",
  "/propostas",
  "/pagamentos",
  "/contratos",
  "/alugueis",
  "/clientes-aluguel",
  "/whatsapp-qr",
  "/lembretes",
  "/acessos",
  "/relatorio",
  "/super-admin",
  "/minha-assinatura",
  "/configuracoes-empresa",
  "/financeiro",
  "/editar-cliente",
];

const AUTH_PAGES = ["/login", "/registro"];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(ACCESS_COOKIE);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (isProtected && !hasSession) {
    // O access dura 1h; o refresh, 7 dias. Se só o access venceu, o usuário
    // NÃO perdeu a sessão — desviamos pelo route handler que troca o refresh
    // por um access novo e devolve o usuário à página que ele pediu.
    if (request.cookies.has(REFRESH_COOKIE)) {
      const renovar = new URL("/api/auth/renew", request.url);
      renovar.searchParams.set("next", pathname + (request.nextUrl.search || ""));
      return NextResponse.redirect(renovar);
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
