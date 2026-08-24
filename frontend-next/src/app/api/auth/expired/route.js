import { NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/session";

// Saída de emergência para sessão inválida.
//
// O proxy.js faz uma checagem OTIMISTA (só olha se o cookie existe). Quando o
// cookie está presente mas o token não vale mais — expirado, assinado com outro
// JWT_SECRET_KEY, ou usuário removido — nasce um loop: /login vê cookie e manda
// pra /dashboard, o (app)/layout.js vê /auth/me falhar e manda pra /login, e
// assim por diante até o ERR_TOO_MANY_REDIRECTS.
//
// Server Components não podem apagar cookies (só Route Handlers e Server
// Actions podem), então o layout redireciona pra cá: aqui limpamos a sessão e
// só então mandamos pro /login — que agora renderiza o formulário, porque o
// cookie não existe mais. O loop fecha em um hop.
export async function GET(request) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  res.cookies.delete({ name: COOKIE_NAMES.ACCESS_COOKIE, path: "/" });
  res.cookies.delete({ name: COOKIE_NAMES.REFRESH_COOKIE, path: "/" });
  return res;
}
