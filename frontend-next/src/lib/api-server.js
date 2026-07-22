import "server-only";
import { getAccessToken } from "./session";

// API_URL é PRIVADA (sem prefixo NEXT_PUBLIC) — o browser nunca precisa saber
// o endereço do backend Go, porque toda chamada client-side passa pelo proxy
// Next.js (app/api/backend/[...path]). Server Components chamam aqui direto.
const API_URL = process.env.API_URL || "http://localhost:8001/api";

/**
 * Chama o backend Go a partir do servidor (Server Component / Route Handler),
 * anexando o Bearer token lido do cookie httpOnly. Nunca expõe o token ao
 * cliente.
 */
export async function apiFetch(path, options = {}) {
  const token = await getAccessToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, cache: options.cache ?? "no-store" });
  return res;
}

/** Atalho para GET + parse JSON. Retorna null em caso de erro (não lança). */
export async function apiGet(path, options = {}) {
  try {
    const res = await apiFetch(path, { ...options, method: "GET" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export { API_URL };
