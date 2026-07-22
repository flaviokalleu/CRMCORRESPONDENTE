import { apiGet } from "@/lib/api-server";

export const metadata = { title: "Acessos" };

// Server Component: lista de acessos ao sistema (somente leitura por agora —
// filtros/paginação client-side ficam para uma iteração futura).
export default async function AcessosPage() {
  const data = await apiGet("/acessos");
  const acessos = data?.acessos || (Array.isArray(data) ? data : []);
  const stats = await apiGet("/acessos/stats");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Monitor de Acessos</h1>
        <p className="text-sm text-white/50 mt-1">Acompanhe os acessos ao sistema.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total de acessos" value={stats.totalAcessos ?? 0} />
          <Stat label="Corretores" value={stats.acessosPorRole?.corretor ?? 0} />
          <Stat label="Correspondentes" value={stats.acessosPorRole?.correspondente ?? 0} />
          <Stat label="Visitantes" value={stats.acessosPorRole?.anonimo ?? 0} />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.04] text-left text-white/50">
              <th className="px-4 py-2">Usuário</th>
              <th className="px-4 py-2">IP</th>
              <th className="px-4 py-2">Dispositivo</th>
              <th className="px-4 py-2">Página</th>
              <th className="px-4 py-2">Data/Hora</th>
            </tr>
          </thead>
          <tbody>
            {acessos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-white/30">
                  Nenhum acesso encontrado.
                </td>
              </tr>
            ) : (
              acessos.map((a) => (
                <tr key={a.id} className="border-t border-white/5">
                  <td className="px-4 py-2 text-white">
                    {a.user ? `${a.user.first_name || ""} ${a.user.last_name || ""}`.trim() : a.user_id ? `Usuário #${a.user_id}` : "Anônimo"}
                  </td>
                  <td className="px-4 py-2 text-white/60">{a.ip}</td>
                  <td className="px-4 py-2 text-white/60">{a.deviceType || "Desconhecido"}</td>
                  <td className="px-4 py-2 text-white/60">{a.page || "N/D"}</td>
                  <td className="px-4 py-2 text-white/60">
                    {a.timestamp ? new Date(a.timestamp).toLocaleString("pt-BR") : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/50 mt-1">{label}</p>
    </div>
  );
}
