import { NextResponse } from "next/server";
import { getAccessToken, getRefreshToken, setSession, clearSession } from "@/lib/session";
import { API_URL } from "@/lib/api-server";

// Proxy genérico: Client Components chamam `/api/backend/<qualquer-rota-go>`
// em vez de falar direto com o backend Go. O token httpOnly nunca é exposto
// ao navegador — é lido/anexado aqui, no servidor. Também tenta renovar a
// sessão automaticamente em caso de 401 (paridade com o interceptor da SPA).
async function forward(request, path) {
  const url = new URL(request.url);
  const target = `${API_URL}/${path.join("/")}${url.search}`;

  const token = await getAccessToken();
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const init = {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    duplex: hasBody ? "half" : undefined,
    cache: "no-store",
  };

  let res = await fetch(target, init);

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const newToken = await getAccessToken();
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(target, { ...init, headers });
    }
  }

  const responseHeaders = new Headers();
  const resContentType = res.headers.get("content-type");
  if (resContentType) responseHeaders.set("Content-Type", resContentType);

  return new NextResponse(res.body, { status: res.status, headers: responseHeaders });
}

async function tryRefresh() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  const goRes = await fetch(`${API_URL}/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!goRes.ok) {
    await clearSession();
    return false;
  }

  const data = await goRes.json();
  await setSession({ token: data.token, refreshToken });
  return true;
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
