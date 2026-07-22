import { apiGet } from "@/lib/api-server";

export const metadata = { title: "Clientes Aluguel" };

// Server Component: GET /clientealuguel direto no Go. Referência:
// frontend/src/components/ClienteAluguel.jsx — versão completa tem
// modais de pagamento, cobrança avulsa, contrato, reajuste, integração
// Asaas etc. Aqui só a lista básica de inquilinos (funcional, sem essas ações).
export default async function ClientesAluguelPage() {
  const data = await apiGet("/clientealuguel");
  const clientes = Array.isArray(data) ? data : [];

  const hoje = new Date();
  const emAtraso = (c) => {
    const dia = parseInt(c.dia_vencimento, 10);
    return !Number.isNaN(dia) && hoje.getDate() > dia;
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-1">Clientes Aluguel</h1>
      <p className="text-sm text-white/50 mb-6">{clientes.length} inquilino(s) encontrado(s)</p>

      {clientes.length === 0 ? (
        <p className="text-white/50 text-sm">Nenhum cliente de aluguel cadastrado ou não foi possível carregar os dados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/[0.04] text-white/50 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">Valor Aluguel</th>
                <th className="px-4 py-3">Dia Vencimento</th>
                <th className="px-4 py-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-white font-medium">{c.nome}</td>
                  <td className="px-4 py-3 text-white/60">{c.email}</td>
                  <td className="px-4 py-3 text-white/60">{c.telefone}</td>
                  <td className="px-4 py-3 text-white/60">{c.cpf}</td>
                  <td className="px-4 py-3 text-white/60">
                    {c.valor_aluguel ? `R$ ${parseFloat(c.valor_aluguel).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-white/60">{c.dia_vencimento ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${emAtraso(c) ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                      {emAtraso(c) ? "Em atraso" : "Em dia"}
                    </span>
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
