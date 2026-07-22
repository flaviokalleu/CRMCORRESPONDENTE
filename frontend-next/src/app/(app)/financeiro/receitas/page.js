import { apiGet } from "@/lib/api-server";
import { ReceitaForm } from "@/components/ReceitaForm";

export const metadata = { title: "Receitas" };

// Server Component: lista de receitas (Go GET /receitas retorna array puro,
// sem paginação — ver internal/modules/financeiro/receitas/handler.go).
// Referência: frontend/src/pages/financeiro/ReceitaPage.jsx.
export default async function ReceitasPage() {
  const receitas = (await apiGet("/receitas")) ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-4">Receitas</h1>

      <ReceitaForm />

      {receitas.length === 0 ? (
        <p className="text-white/50 text-sm">Nenhuma receita cadastrada ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-white/50 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">ID</th>
                <th className="text-left px-4 py-2">Tipo</th>
                <th className="text-left px-4 py-2">Descrição</th>
                <th className="text-left px-4 py-2">Valor</th>
                <th className="text-left px-4 py-2">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {receitas.map((r) => (
                <tr key={r.id} className="text-white/80">
                  <td className="px-4 py-2 whitespace-nowrap">#{r.id}</td>
                  <td className="px-4 py-2">{r.tipo}</td>
                  <td className="px-4 py-2">{r.descricao || "-"}</td>
                  <td className="px-4 py-2 whitespace-nowrap">R$ {Number(r.valor).toFixed(2)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.data ? new Date(r.data).toLocaleDateString("pt-BR") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
