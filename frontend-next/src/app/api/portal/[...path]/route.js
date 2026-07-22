import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_URL } from "@/lib/api-server";

// Proxy genérico do PORTAL DO INQUILINO: Client Components do portal chamam
// `/api/portal/<rota-sem-prefixo>` (ex.: /api/portal/meus-dados vira
// GET {API_URL}/portal/meus-dados). Usa o cookie httpOnly PRÓPRIO
// `cri_portal_token` (JWT tipo "inquilino") — nunca o token do CRM principal
// (src/lib/session.js / cri_token), mantendo os dois fluxos de auth isolados.
const PORTAL_COOKIE = "cri_portal_token";

async function getPortalToken() {
  const store = await cookies();
  return store.get(PORTAL_COOKIE)?.value ?? null;
}

async function forward(request, path) {
  const url = new URL(request.url);
  const target = `${API_URL}/portal/${path.join("/")}${url.search}`;

  const token = await getPortalToken();
  if (!token) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Authorization", `Bearer ${token}`);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const init = {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    duplex: hasBody ? "half" : undefined,
    cache: "no-store",
  };

  const res = await fetch(target, init);

  const responseHeaders = new Headers();
  const resContentType = res.headers.get("content-type");
  if (resContentType) responseHeaders.set("Content-Type", resContentType);
  const disposition = res.headers.get("content-disposition");
  if (disposition) responseHeaders.set("Content-Disposition", disposition);

  return new NextResponse(res.body, { status: res.status, headers: responseHeaders });
}

export async function GET(request, { params }) {
  const { path } = await params;
  return forward(request, path);
}
export async function POST(request, { params }) {
  const { path } = await params;
  return forward(request, path);
}
export async function PUT(request, { params }) {
  const { path } = await params;
  return forward(request, path);
}
export async function PATCH(request, { params }) {
  const { path } = await params;
  return forward(request, path);
}
export async function DELETE(request, { params }) {
  const { path } = await params;
  return forward(request, path);
}
