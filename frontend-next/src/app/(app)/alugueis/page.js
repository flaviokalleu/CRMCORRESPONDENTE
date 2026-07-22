import Link from "next/link";
import { apiGet } from "@/lib/api-server";
import { AluguelRowActions } from "@/components/aluguel/AluguelRowActions";

export const metadata = { title: "Aluguéis" };

// Server Component: lista de imóveis para aluguel. Busca direto no backend
// Go (Bearer via cookie httpOnly). Referência de lógica:
// frontend/src/pages/AlugueisPage.jsx (frontend/src/components/Aluguel.jsx).
export default async function AlugueisPage() {
  const alugueis = (await apiGet("/alugueis")) || [];

  const disponiveis = alugueis.filter((a) => !a.alugado).length;
  const ocupados = alugueis.filter((a) => a.alugado).length;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Aluguéis</h1>
          <p className="text-sm text-white/50 mt-1">
            {disponiveis} disponíveis &bull; {ocupados} alugados &bull; {alugueis.length} total
          </p>
        </div>
        <Link
          href="/alugueis/adicionar"
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          + Adicionar imóvel
        </Link>
      </div>

      {alugueis.length === 0 ? (
        <p className="text-white/50 text-sm">Nenhum imóvel para aluguel cadastrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04]">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-white/70">Imóvel</th>
                <th className="px-4 py-2 text-left font-medium text-white/70">Descrição</th>
                <th className="px-4 py-2 text-left font-medium text-white/70">Quartos</th>
                <th className="px-4 py-2 text-left font-medium text-white/70">Banheiros</th>
                <th className="px-4 py-2 text-left font-medium text-white/70">Valor</th>
                <th className="px-4 py-2 text-left font-medium text-white/70">Vencimento</th>
                <th className="px-4 py-2 text-left font-medium text-white/70">Status</th>
                <th className="px-4 py-2 text-left font-medium text-white/70">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alugueis.map((a) => (
                <tr key={a.id} className="border-t border-white/5">
                  <td className="px-4 py-2 text-white">{a.nome_imovel || "-"}</td>
                  <td className="px-4 py-2 text-white/70 max-w-xs truncate" title={a.descricao}>
                    {a.descricao || "-"}
                  </td>
                  <td className="px-4 py-2 text-white/70">{a.quartos ?? "-"}</td>
                  <td className="px-4 py-2 text-white/70">{a.banheiro ?? "-"}</td>
                  <td className="px-4 py-2 text-white/70">
                    {Number(a.valor_aluguel || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="px-4 py-2 text-white/70">{a.dia_vencimento ? `dia ${a.dia_vencimento}` : "-"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        a.alugado ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"
                      }`}
                    >
                      {a.alugado ? "Alugado" : "Disponível"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <AluguelRowActions aluguel={a} />
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
