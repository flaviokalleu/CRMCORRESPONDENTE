import { apiGet } from "@/lib/api-server";
import { ConfiguracoesEmpresaForm } from "@/components/ConfiguracoesEmpresaForm";

export const metadata = { title: "Configurações da Empresa" };

// Server Component: busca as configurações do tenant no servidor (SSR).
// TODO: o guard de role (`hasRole('administrador')`) é client-side via
// AuthContext — aqui a página é renderizada normalmente para qualquer usuário
// autenticado; um guard real de servidor fica para uma iteração futura.
export default async function ConfiguracoesEmpresaPage() {
  const data = await apiGet("/tenant-settings/settings");

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-cx-text">Configurações da Empresa</h1>
        <p className="text-sm text-cx-muted mt-1">Gerencie os dados e preferências da sua empresa.</p>
      </div>
      <ConfiguracoesEmpresaForm initialData={data} />
    </div>
  );
}
