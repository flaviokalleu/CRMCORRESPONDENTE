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
    redirect("/login");
  }

  return (
    <AuthProvider initialUser={me.user}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
