import "server-only";
import { cookies } from "next/headers";

// Sessão via cookies httpOnly — o JWT do backend Go NUNCA fica acessível ao
// JS do cliente (zero localStorage, imune a roubo de token via XSS). Ver
// MIGRATION.md §1.0 para a decisão completa.

const ACCESS_COOKIE = "cri_token";
const REFRESH_COOKIE = "cri_refresh";

const baseCookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export async function setSession({ token, refreshToken }) {
  const store = await cookies();
  // access token: 1h (mesma janela do backend Go)
  store.set(ACCESS_COOKIE, token, { ...baseCookieOpts, maxAge: 60 * 60 });
  if (refreshToken) {
    // refresh token: 7d
    store.set(REFRESH_COOKIE, refreshToken, { ...baseCookieOpts, maxAge: 7 * 24 * 60 * 60 });
  }
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
}

export async function hasSession() {
  return (await getAccessToken()) !== null;
}

export const COOKIE_NAMES = { ACCESS_COOKIE, REFRESH_COOKIE };
