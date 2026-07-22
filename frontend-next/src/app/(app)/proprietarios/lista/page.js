import { apiGet } from "@/lib/api-server";
import { ProprietarioAddForm } from "@/components/ProprietarioAddForm";

export const metadata = { title: "Proprietários" };

// Server Component: lista de proprietários via apiGet direto no Go.
// Cadastro fica num Client Component pequeno abaixo (ProprietarioAddForm).
export default async function ListaProprietariosPage() {
  const data = await apiGet("/proprietarios");
  const proprietarios = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Proprietários</h1>
        <p className="text-sm text-white/40">Cadastre e gerencie os proprietários vinculados aos imóveis.</p>
      </div>

      <ProprietarioAddForm />

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/70">Lista de Proprietários</h2>
          <span className="text-xs text-white/40">{proprietarios.length} item(ns)</span>
        </div>

        {!data ? (
          <p className="text-sm text-white/50">Não foi possível carregar os proprietários.</p>
        ) : proprietarios.length === 0 ? (
          <p className="text-sm text-white/50">Nenhum proprietário cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {proprietarios.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm font-medium text-white">{item.name}</p>
                <p className="text-xs text-white/50">{item.phone || "Sem telefone"}</p>
                <p className="text-xs text-white/40">{item.address || "Sem endereço"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
