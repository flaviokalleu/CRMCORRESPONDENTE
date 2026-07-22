import { NextResponse } from "next/server";
import { getRefreshToken, setSession, clearSession } from "@/lib/session";
import { API_URL } from "@/lib/api-server";

// Renova o access token usando o refresh token (cookie httpOnly) — chamado
// pelo proxy genérico quando o Go responde 401, ou periodicamente pelo
// Client Component de auth.
export async function POST() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ error: "Sem sessão" }, { status: 401 });
  }

  const goRes = await fetch(`${API_URL}/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!goRes.ok) {
    await clearSession();
    return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });
  }

  const data = await goRes.json();
  await setSession({ token: data.token, refreshToken });
  return NextResponse.json({ ok: true });
}
