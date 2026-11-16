import { redirect } from "next/navigation";
import { hasSession, getVerEmpresa } from "@/lib/session";
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

  // Situação da assinatura: decide a faixa de prazo e a tela de bloqueio.
  const assinatura = await apiGet("/assinatura");

  // Superadmin vendo o sistema como outra empresa ("Entrar como").
  let verComo = null;
  const idVer = await getVerEmpresa();
  if (idVer && me.user?.is_super_admin) {
    const ficha = await apiGet(`/super-admin/assinaturas/${idVer}`, { headers: { "X-Tenant-Id": "" } });
    if (ficha?.tenant) verComo = { id: ficha.tenant.id, nome: ficha.tenant.nome };
  }

  return (
    <AuthProvider initialUser={me.user}>
      <AppShell assinatura={assinatura} verComo={verComo}>{children}</AppShell>
    </AuthProvider>
  );
}
