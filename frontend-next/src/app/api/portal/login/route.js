import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api-server";

// Portal do inquilino é um fluxo de auth PARALELO e INDEPENDENTE do CRM
// principal (não usa src/lib/session.js nem os cookies cri_token/cri_refresh).
// O backend Go emite um JWT tipo "inquilino" (24h, sem tenant scope) via
// POST /api/portal/login (corpo: { cpf } - a rota não usa senha, ver
// backend-go/internal/modules/portalinquilino/dto.go). Guardamos esse JWT em
// um cookie httpOnly PRÓPRIO (cri_portal_token) para nunca expô-lo ao JS do
// cliente, e nunca reaproveitamos os cookies de sessão do CRM.
const PORTAL_COOKIE = "cri_portal_token";

const portalCookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 24 * 60 * 60, // 24h — mesma janela do JWT do backend Go
};

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const cpf = (body?.cpf || "").toString();
  if (!cpf.trim()) {
    return NextResponse.json({ error: "cpf é obrigatório" }, { status: 400 });
  }

  let goRes;
  try {
    goRes = await fetch(`${API_URL}/portal/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Erro de conexão com o servidor" }, { status: 502 });
  }

  const data = await goRes.json().catch(() => null);
  if (!goRes.ok || !data?.token) {
    return NextResponse.json(
      { error: data?.error || "Acesso ao portal indisponível no momento." },
      { status: goRes.status || 500 }
    );
  }

  const res = NextResponse.json({ nome: data.nome, email: data.email });
  res.cookies.set(PORTAL_COOKIE, data.token, portalCookieOpts);
  return res;
}
