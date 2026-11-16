import { NextResponse } from "next/server";
import { setVerEmpresa } from "@/lib/session";
import { apiFetch } from "@/lib/api-server";

// POST { id } → superadmin passa a ver o sistema como aquela empresa.
// DELETE → volta para a própria visão. A permissão é conferida no backend.
export async function POST(request) {
  const { id } = await request.json().catch(() => ({}));
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    return NextResponse.json({ error: "Empresa inválida" }, { status: 400 });
  }
  const res = await apiFetch(`/super-admin/assinaturas/${n}`, { method: "GET", headers: { "X-Tenant-Id": "" } });
  if (!res.ok) {
    return NextResponse.json({ error: "Só o dono da plataforma pode fazer isso." }, { status: 403 });
  }
  await setVerEmpresa(n);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await setVerEmpresa(null);
  return NextResponse.json({ ok: true });
}
