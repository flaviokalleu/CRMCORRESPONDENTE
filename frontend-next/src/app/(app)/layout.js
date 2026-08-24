import { redirect } from "next/navigation";
import { hasSession } from "@/lib/session";
import { apiGet } from "@/lib/api-server";
import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";

// Layout do CRM autenticado. Roda no servidor: confere sessão (defesa em
// profundidade além do proxy.js) e já busca o usuário — o Client Component
// AuthProvider recebe `initialUser` pronto, sem round-trip extra no mount.
export default async function AppLayout({ children }) {
  if (!(await hasSession())) {
    redirect("/login");
  }

  const me = await apiGet("/auth/me");
  if (!me) {
    // Cookie existe mas o token foi recusado. Antes de encerrar, tenta trocar
    // o refresh por um access novo — é o caso comum (access venceu, refresh
    // ainda vale dias). O /renew tem trava anti-loop e cai no /login sozinho
    // se o refresh também não servir; mandar direto para o /login aqui criaria
    // o ping-pong (o /login vê o cookie e devolve para cá).
    redirect("/api/auth/renew?next=/dashboard");
  }

  return (
    <AuthProvider initialUser={me.user}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
