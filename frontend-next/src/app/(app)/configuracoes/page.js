import { apiGet } from "@/lib/api-server";
import { ConfiguracoesUsuarioForm } from "@/components/ConfiguracoesUsuarioForm";

export const metadata = { title: "Configurações" };

// Server Component: busca os dados do usuário logado no servidor (SSR).
export default async function ConfiguracoesPage() {
  const data = await apiGet("/user/me");
  const initialUser = data?.user || data;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Configurações</h1>
        <p className="text-sm text-white/50 mt-1">Gerencie suas informações pessoais.</p>
      </div>
      {initialUser ? (
        <ConfiguracoesUsuarioForm initialUser={initialUser} />
      ) : (
        <p className="text-white/50 text-sm">Não foi possível carregar seus dados.</p>
      )}
    </div>
  );
}
