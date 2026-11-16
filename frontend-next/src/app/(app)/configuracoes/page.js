import { apiGet } from "@/lib/api-server";
import { PageHeader } from "@/components/ui/page";
import { ConfiguracoesUsuarioForm } from "@/components/ConfiguracoesUsuarioForm";

export const metadata = { title: "Meu perfil" };

// Server Component: busca os dados do usuário logado no servidor (SSR).
export default async function ConfiguracoesPage() {
  const data = await apiGet("/user/me");
  const initialUser = data?.user || data;

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Meu perfil" subtitle="Seus dados de contato, sua foto e sua senha." />
      {initialUser ? (
        <ConfiguracoesUsuarioForm initialUser={initialUser} />
      ) : (
        <p className="text-cx-muted text-sm">Não foi possível carregar seus dados. Recarregue a página.</p>
      )}
    </div>
  );
}
