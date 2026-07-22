import { NextResponse } from "next/server";

// Encerra a sessão do portal do inquilino — limpa SOMENTE o cookie próprio
// do portal (cri_portal_token). Não toca nos cookies de sessão do CRM.
const PORTAL_COOKIE = "cri_portal_token";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PORTAL_COOKIE);
  return res;
}
