import Link from "next/link";
import { apiGet } from "@/lib/api-server";

export const metadata = { title: "Lista de Clientes" };

// Server Component: GET /clientes direto no Go. A API antiga (ver
// frontend/src/components/ListaClientes.jsx) pagina com ?page/&limit e retorna
// tanto array puro quanto { clientes: [...] } dependendo da rota — tratamos os
// dois formatos aqui.
export default async function ListaClientesPage() {
  const data = await apiGet("/clientes");
  const clientes = Array.isArray(data) ? data : data?.clientes ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Lista de Clientes</h1>
          <p className="text-sm text-white/50">{clientes.length} cliente(s) encontrado(s)</p>
        </div>
        <Link href="/clientes/adicionar"
          className="rounded-lg bg-orange-600 hover:bg-orange-700 px-4 py-2 text-sm font-semibold text-white transition-colors">
          + Adicionar Cliente
        </Link>
      </div>

      {clientes.length === 0 ? (
        <p className="text-white/50 text-sm">Nenhum cliente cadastrado ou não foi possível carregar os dados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/[0.04] text-white/50 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Renda</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-white font-medium">{c.nome}</td>
                  <td className="px-4 py-3 text-white/60">{c.email}</td>
                  <td className="px-4 py-3 text-white/60">{c.telefone}</td>
                  <td className="px-4 py-3 text-white/60">{c.cpf}</td>
                  <td className="px-4 py-3 text-white/60">{c.status}</td>
                  <td className="px-4 py-3 text-white/60">
                    {c.valor_renda ? `R$ ${parseFloat(c.valor_renda).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/editar-cliente/${c.id}`} className="text-orange-400 hover:text-orange-300 text-xs font-semibold">
                      Editar
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
