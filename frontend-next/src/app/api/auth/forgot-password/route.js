import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api-server";

// BFF de "Esqueci a senha": repassa só o e-mail ao Go. A resposta é sempre a
// mesma, exista ou não a conta.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Informe seu e-mail." }, { status: 400 });
  }
  try {
    const goRes = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
    const data = await goRes.json().catch(() => ({}));
    if (!goRes.ok) {
      const error = goRes.status === 429 ? "Muitas tentativas. Aguarde alguns minutos e tente de novo." : data?.error || "Não foi possível enviar o link. Tente novamente.";
      return NextResponse.json({ error }, { status: goRes.status });
    }
    return NextResponse.json({ message: data.message });
  } catch {
    return NextResponse.json({ error: "Não foi possível falar com o servidor. Tente novamente." }, { status: 502 });
  }
}
