import { NextResponse } from "next/server";
import { setSession } from "@/lib/session";
import { API_URL } from "@/lib/api-server";

// BFF: recebe os dados do cadastro (empresa + admin + plano), chama o backend
// Go, e — se vier token — grava a sessão como cookie httpOnly (mesmo padrão
// de src/app/api/auth/login/route.js). O token nunca chega ao JS do navegador.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const goRes = await fetch(`${API_URL}/tenant/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await goRes.json().catch(() => ({}));
  if (!goRes.ok) {
    return NextResponse.json({ error: data?.error || data?.message || "Erro ao realizar cadastro" }, { status: goRes.status });
  }

  const token = data.token || data.authToken;
  if (token) {
    await setSession({ token, refreshToken: data.refreshToken });
  }

  // Devolve só o usuário — nunca o token — para o Client Component atualizar a UI.
  return NextResponse.json({ user: data.user });
}
