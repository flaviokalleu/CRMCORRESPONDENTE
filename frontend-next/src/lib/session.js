import "server-only";
import { cookies } from "next/headers";

// Sessão via cookies httpOnly — o JWT do backend Go NUNCA fica acessível ao
// JS do cliente (zero localStorage, imune a roubo de token via XSS). Ver
// MIGRATION.md §1.0 para a decisão completa.

const ACCESS_COOKIE = "cri_token";
const REFRESH_COOKIE = "cri_refresh";
// "Lembrar-me": "1" mantém a sessão depois de fechar o navegador (cookies com
// validade); "0" usa cookies de sessão, que o navegador apaga ao fechar.
const REMEMBER_COOKIE = "cri_remember";

const baseCookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

// Opções de validade dos cookies conforme o "Lembrar-me". Sem maxAge o cookie
// é de sessão; o próprio JWT continua vencendo em 1h/7d no backend.
export function sessionCookieAges(remember) {
  return remember
    ? { access: { maxAge: 60 * 60 }, refresh: { maxAge: 7 * 24 * 60 * 60 }, flag: { maxAge: 7 * 24 * 60 * 60 } }
    : { access: {}, refresh: {}, flag: {} };
}

// `remember` indefinido (refresh no meio da sessão) mantém a escolha feita
// no login, lida do próprio cookie.
export async function setSession({ token, refreshToken, remember }) {
  const store = await cookies();
  const keep = remember ?? store.get(REMEMBER_COOKIE)?.value !== "0";
  const ages = sessionCookieAges(keep);
  store.set(ACCESS_COOKIE, token, { ...baseCookieOpts, ...ages.access });
  if (refreshToken) {
    store.set(REFRESH_COOKIE, refreshToken, { ...baseCookieOpts, ...ages.refresh });
  }
  store.set(REMEMBER_COOKIE, keep ? "1" : "0", { ...baseCookieOpts, ...ages.flag });
}

export async function getAccessToken() {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshToken() {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

export async function clearSession() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(REMEMBER_COOKIE);
}

export async function hasSession() {
  return (await getAccessToken()) !== null;
}

export const COOKIE_NAMES = { ACCESS_COOKIE, REFRESH_COOKIE, REMEMBER_COOKIE };

// Expostos para quem precisa gravar os cookies na RESPOSTA em vez do store
// (route handler que devolve redirect — ver /api/auth/renew). As janelas
// espelham o backend Go: AccessTTL 1h, RefreshTTL 7d.
export const COOKIE_OPTS = baseCookieOpts;
export const ACCESS_MAX_AGE = 60 * 60;
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;
