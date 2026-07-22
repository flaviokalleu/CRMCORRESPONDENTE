import Link from "next/link";
import { apiGet } from "@/lib/api-server";
import { PagamentoRowActions } from "@/components/PagamentoRowActions";

export const metadata = { title: "Pagamentos" };

// Server Component: busca a lista de pagamentos direto do Go (Bearer via
// cookie httpOnly). Referência: frontend/src/components/Pagamentos/ListaPagamentos.jsx
// (porta a lógica de listagem — edição/reenvio de notificações ficam fora do
// escopo mínimo funcional pedido).
export default async function ListaPagamentosPage() {
  const data = await apiGet("/pagamentos");
  const pagamentos = data?.pagamentos ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Pagamentos</h1>
          <p className="text-sm text-white/50">Cobranças avulsas via Asaas (boleto, PIX, universal)</p>
        </div>
        <Link
          href="/pagamentos/criar"
          className="rounded-md bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-2"
        >
          Criar pagamento
        </Link>
      </div>

      {!data ? (
        <p className="text-white/50 text-sm">Não foi possível carregar os pagamentos.</p>
      ) : pagamentos.length === 0 ? (
        <p className="text-white/50 text-sm">Nenhum pagamento cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-white/50 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">ID</th>
                <th className="text-left px-4 py-2">Título</th>
                <th className="text-left px-4 py-2">Tipo</th>
                <th className="text-left px-4 py-2">Valor</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Vencimento</th>
                <th className="text-right px-4 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pagamentos.map((p) => (
                <tr key={p.id} className="text-white/80">
                  <td className="px-4 py-2 whitespace-nowrap">#{p.id}</td>
                  <td className="px-4 py-2">{p.titulo}</td>
                  <td className="px-4 py-2 uppercase text-xs text-white/50">{p.tipo}</td>
                  <td className="px-4 py-2 whitespace-nowrap">R$ {p.valor}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{p.status}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {p.data_vencimento ? new Date(p.data_vencimento).toLocaleDateString("pt-BR") : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <PagamentoRowActions pagamento={p} />
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
