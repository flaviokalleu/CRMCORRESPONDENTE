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

  // `remember` é só do BFF (validade dos cookies); o Go recebe e-mail e senha.
  const { remember, ...credentials } = body || {};
  const goRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    // Aparelho e IP de quem entrou: o Go registra o login na tela Acessos.
    // Sem isso ele via sempre o Node ("node", 127.0.0.1).
    headers: {
      "Content-Type": "application/json",
      "User-Agent": request.headers.get("user-agent") || "",
      ...(request.headers.get("x-forwarded-for") ? { "X-Forwarded-For": request.headers.get("x-forwarded-for") } : {}),
    },
    body: JSON.stringify(credentials),
  });

  const data = await goRes.json().catch(() => ({}));
  if (!goRes.ok) {
    return NextResponse.json({ error: data?.error || "Erro ao autenticar" }, { status: goRes.status });
  }

  await setSession({ token: data.token, refreshToken: data.refreshToken, remember: remember === true });

  // Devolve só o usuário — nunca o token — para o Client Component atualizar a UI.
  return NextResponse.json({ user: data.user });
}
