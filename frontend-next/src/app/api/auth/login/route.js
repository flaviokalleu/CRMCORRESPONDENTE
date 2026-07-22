import { NextResponse } from "next/server";
import { setSession } from "@/lib/session";
import { API_URL } from "@/lib/api-server";

// BFF: recebe email/senha do form, chama o backend Go, e grava o JWT como
// cookie httpOnly — o token nunca chega ao JS do navegador.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const goRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await goRes.json().catch(() => ({}));
  if (!goRes.ok) {
    return NextResponse.json({ error: data?.error || "Erro ao autenticar" }, { status: goRes.status });
  }

  await setSession({ token: data.token, refreshToken: data.refreshToken });

  // Devolve só o usuário — nunca o token — para o Client Component atualizar a UI.
  return NextResponse.json({ user: data.user });
}
