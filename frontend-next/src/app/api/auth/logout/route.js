import { NextResponse } from "next/server";
import { getAccessToken, clearSession } from "@/lib/session";
import { API_URL } from "@/lib/api-server";

export async function POST() {
  const token = await getAccessToken();
  if (token) {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}
