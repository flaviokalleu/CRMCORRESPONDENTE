import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api-server";

// BFF de "Redefinir senha": token do link + senha nova.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!token || !password) {
    return NextResponse.json({ error: "Link inválido ou senha não informada." }, { status: 400 });
  }
  try {
    const goRes = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
      cache: "no-store",
    });
    const data = await goRes.json().catch(() => ({}));
    if (!goRes.ok) {
      const error = goRes.status === 429 ? "Muitas tentativas. Aguarde alguns minutos e tente de novo." : data?.error || "Não foi possível salvar a nova senha.";
      return NextResponse.json({ error }, { status: goRes.status });
    }
    return NextResponse.json({ message: data.message });
  } catch {
    return NextResponse.json({ error: "Não foi possível falar com o servidor. Tente novamente." }, { status: 502 });
  }
}
