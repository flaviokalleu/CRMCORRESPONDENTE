import Link from "next/link";
import { apiGet } from "@/lib/api-server";

export const metadata = { title: "Imóveis" };

function formatCurrency(value) {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

// Server Component: busca a lista de imóveis direto no Go via apiGet.
export default async function ListaImoveisPage() {
  const data = await apiGet("/imoveis");
  const imoveis = Array.isArray(data) ? data : data?.data ?? data?.imoveis ?? [];

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Imóveis</h1>
          <p className="text-sm text-white/40">{imoveis.length} imóvel(is) cadastrado(s)</p>
        </div>
        <Link
          href="/imoveis/adicionar"
          className="rounded-md bg-caixa-orange px-4 py-2 text-sm font-semibold text-white hover:bg-caixa-orange/90"
        >
          + Adicionar Imóvel
        </Link>
      </div>

      {!data ? (
        <p className="text-sm text-white/50">Não foi possível carregar os imóveis.</p>
      ) : imoveis.length === 0 ? (
        <p className="text-sm text-white/50">Nenhum imóvel cadastrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wide text-white/40">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Endereço</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Quartos</th>
                <th className="px-4 py-3">Banheiros</th>
                <th className="px-4 py-3">Valor de Venda</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {imoveis.map((imovel) => (
                <tr key={imovel.id} className="border-t border-white/5 text-white/80 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-white">{imovel.nome_imovel}</td>
                  <td className="px-4 py-3">{imovel.endereco}</td>
                  <td className="px-4 py-3 capitalize">{imovel.tipo}</td>
                  <td className="px-4 py-3">{imovel.quartos}</td>
                  <td className="px-4 py-3">{imovel.banheiro}</td>
                  <td className="px-4 py-3">{formatCurrency(imovel.valor_venda)}</td>
                  <td className="px-4 py-3">{imovel.situacao_imovel}</td>
                  <td className="px-4 py-3">
                    <Link href={`/imovel/${imovel.id}`} className="text-caixa-orange hover:underline">
                      Ver detalhes
                    </Link>
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
