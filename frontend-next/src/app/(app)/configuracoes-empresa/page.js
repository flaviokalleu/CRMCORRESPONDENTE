import { apiGet } from "@/lib/api-server";
import { PageHeader } from "@/components/ui/page";
import { ConfiguracoesEmpresaForm } from "@/components/ConfiguracoesEmpresaForm";

export const metadata = { title: "Minha empresa" };

// Server Component: busca as configurações do tenant no servidor (SSR).
// TODO: o guard de role (`hasRole('administrador')`) é client-side via
// AuthContext — aqui a página é renderizada normalmente para qualquer usuário
// autenticado; um guard real de servidor fica para uma iteração futura.
export default async function ConfiguracoesEmpresaPage() {
  const data = await apiGet("/tenant-settings/settings");

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Minha empresa" subtitle="Logo, nome e contatos da sua imobiliária." />
      {data ? (
        <ConfiguracoesEmpresaForm initialData={data} />
      ) : (
        <p className="text-cx-muted text-sm">Não foi possível carregar os dados da empresa. Recarregue a página.</p>
      )}
    </div>
  );
}
