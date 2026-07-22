import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api-server";

// Client Components chamam isso (nunca o Go direto) para saber quem está
// logado — o cookie httpOnly é lido no servidor, o token nunca aparece aqui.
export async function GET() {
  const res = await apiFetch("/auth/me");
  if (!res.ok) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  const data = await res.json();
  return NextResponse.json({ authenticated: true, ...data });
}
