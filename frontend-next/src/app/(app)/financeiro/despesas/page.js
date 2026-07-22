import { apiGet } from "@/lib/api-server";
import { DespesaForm } from "@/components/DespesaForm";

export const metadata = { title: "Despesas" };

// Server Component: lista de despesas (Go GET /despesas retorna array puro).
// Referência: frontend/src/pages/financeiro/DespesaPage.jsx.
export default async function DespesasPage() {
  const despesas = (await apiGet("/despesas")) ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-4">Despesas</h1>

      <DespesaForm />

      {despesas.length === 0 ? (
        <p className="text-white/50 text-sm">Nenhuma despesa cadastrada ainda.</p>
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
              {despesas.map((d) => (
                <tr key={d.id} className="text-white/80">
                  <td className="px-4 py-2 whitespace-nowrap">#{d.id}</td>
                  <td className="px-4 py-2">{d.tipo}</td>
                  <td className="px-4 py-2">{d.descricao || "-"}</td>
                  <td className="px-4 py-2 whitespace-nowrap">R$ {Number(d.valor).toFixed(2)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {d.data ? new Date(d.data).toLocaleDateString("pt-BR") : "-"}
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
