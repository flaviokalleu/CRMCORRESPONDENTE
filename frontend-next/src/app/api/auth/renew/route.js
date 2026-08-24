import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api-server";
import { COOKIE_NAMES, COOKIE_OPTS, ACCESS_MAX_AGE, REFRESH_MAX_AGE } from "@/lib/session";

// Renovação de sessão na NAVEGAÇÃO.
//
// O access token vale 1h e o refresh 7 dias (espelhando AccessTTL/RefreshTTL
// do Go). Só que, até aqui, nada usava o refresh ao trocar de página: passada
// 1h o cookie `cri_token` simplesmente sumia, o proxy.js via "sem sessão" e
// mandava para o /login — mesmo com o refresh de 7 dias intacto no navegador.
// Era o "não consigo ficar logado": recarregar não resolvia porque não havia
// caminho que trocasse o refresh por um access novo.
//
// Server Components não podem gravar cookies, então quem faz isso é este
// Route Handler: troca o refresh por um access novo, grava na RESPOSTA e
// devolve o usuário para onde ele estava indo.
const GUARD = "cri_renew_guard";

export async function GET(request) {
  const url = new URL(request.url);

  // `next` vem da URL — só aceitamos caminho relativo do próprio app, senão
  // vira open redirect (…/renew?next=https://site-malicioso).
  const bruto = url.searchParams.get("next") || "/dashboard";
  const destino = bruto.startsWith("/") && !bruto.startsWith("//") ? bruto : "/dashboard";

  const paraLogin = () => {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete({ name: COOKIE_NAMES.ACCESS_COOKIE, path: "/" });
    res.cookies.delete({ name: COOKIE_NAMES.REFRESH_COOKIE, path: "/" });
    res.cookies.delete({ name: GUARD, path: "/" });
    return res;
  };

  // Trava anti-loop: se acabamos de renovar e o app mandou renovar de novo,
  // é porque a sessão não se sustenta — encerra em vez de ficar quicando.
  if (request.cookies.has(GUARD)) return paraLogin();

  const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_COOKIE)?.value;
  if (!refreshToken) return paraLogin();

  let data;
  try {
    const goRes = await fetch(`${API_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!goRes.ok) return paraLogin();
    data = await goRes.json();
  } catch {
    return paraLogin();
  }

  if (!data?.token) return paraLogin();

  const res = NextResponse.redirect(new URL(destino, request.url));
  res.cookies.set(COOKIE_NAMES.ACCESS_COOKIE, data.token, { ...COOKIE_OPTS, maxAge: ACCESS_MAX_AGE });
  res.cookies.set(COOKIE_NAMES.REFRESH_COOKIE, data.refreshToken || refreshToken, {
    ...COOKIE_OPTS,
    maxAge: REFRESH_MAX_AGE,
  });
  // Vale poucos segundos: só o bastante para pegar um redirect em cadeia.
  res.cookies.set(GUARD, "1", { ...COOKIE_OPTS, maxAge: 15 });
  return res;
}
