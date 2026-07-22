import { apiGet } from "@/lib/api-server";

export const metadata = { title: "Laudos" };

function formatCurrency(value) {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

const STATUS_LABEL = {
  vencido: "Vencido",
  vencendo: "Vencendo",
  vigente: "Vigente",
};

// Server Component: lista de laudos via apiGet direto no Go. Endpoint antigo
// respondia { success, data, pagination } — cobrimos os dois formatos.
export default async function LaudosPage() {
  const data = await apiGet("/laudos");
  const laudos = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white">Laudos</h1>
        <p className="text-sm text-white/40">Gestão de laudos de avaliação imobiliária.</p>
      </div>

      {!data ? (
        <p className="text-sm text-white/50">Não foi possível carregar os laudos.</p>
      ) : laudos.length === 0 ? (
        <p className="text-sm text-white/50">Nenhum laudo encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wide text-white/40">
              <tr>
                <th className="px-4 py-3">Parceiro</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Endereço</th>
                <th className="px-4 py-3">Valor Solicitado</th>
                <th className="px-4 py-3">Valor Liberado</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {laudos.map((laudo) => (
                <tr key={laudo.id} className="border-t border-white/5 text-white/80 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-medium text-white">{laudo.parceiro}</td>
                  <td className="px-4 py-3 capitalize">{laudo.tipo_imovel}</td>
                  <td className="px-4 py-3">{laudo.endereco}</td>
                  <td className="px-4 py-3">{formatCurrency(laudo.valor_solicitado)}</td>
                  <td className="px-4 py-3">{formatCurrency(laudo.valor_liberado)}</td>
                  <td className="px-4 py-3">{formatDate(laudo.vencimento)}</td>
                  <td className="px-4 py-3">{STATUS_LABEL[laudo.status] || laudo.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
