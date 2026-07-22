import Link from "next/link";
import { apiGet } from "@/lib/api-server";

export const metadata = { title: "Lista de Corretores" };

// Server Component: GET /corretor direto no Go. A API antiga retorna
// { success, data: [...] } (ver frontend/src/components/ListaCorretores.jsx) —
// tratamos também o caso de vir um array puro.
export default async function ListaCorretoresPage() {
  const data = await apiGet("/corretor?all=true");
  const corretores = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Corretores</h1>
          <p className="text-sm text-white/50">{corretores.length} corretor(es) encontrado(s)</p>
        </div>
        <Link href="/corretores/adicionar"
          className="rounded-lg bg-orange-600 hover:bg-orange-700 px-4 py-2 text-sm font-semibold text-white transition-colors">
          + Adicionar Corretor
        </Link>
      </div>

      {corretores.length === 0 ? (
        <p className="text-white/50 text-sm">Nenhum corretor cadastrado ou não foi possível carregar os dados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/[0.04] text-white/50 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">CRECI</th>
              </tr>
            </thead>
            <tbody>
              {corretores.map((c) => (
                <tr key={c.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 text-white font-medium">{c.first_name} {c.last_name}</td>
                  <td className="px-4 py-3 text-white/60">@{c.username}</td>
                  <td className="px-4 py-3 text-white/60">{c.email}</td>
                  <td className="px-4 py-3 text-white/60">{c.telefone}</td>
                  <td className="px-4 py-3 text-white/60">{c.creci || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
