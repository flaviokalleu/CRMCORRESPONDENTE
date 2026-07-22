import { apiGet } from "@/lib/api-server";

export const metadata = { title: "Dashboard" };

// Server Component: busca os dados do Go DIRETO no servidor (Bearer lido do
// cookie httpOnly) — HTML já chega com os números prontos, sem loading
// spinner nem waterfall client-side. Prova de conceito do pipeline completo
// (proxy → cookie → SSR → backend Go) antes de portar o dashboard completo
// da SPA (ver MIGRATION.md).
export default async function DashboardPage() {
  const data = await apiGet("/dashboard");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-4">Dashboard</h1>
      {data ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Clientes" value={data.totalCount ?? data.totalClientes ?? 0} />
          <Stat label="Corretores" value={data.totalCorretores ?? 0} />
          <Stat label="Correspondentes" value={data.totalCorrespondentes ?? 0} />
          <Stat label="Aguardando aprovação" value={data.totalClientesAguardandoAprovacao ?? 0} />
        </div>
      ) : (
        <p className="text-white/50 text-sm">Não foi possível carregar os dados do dashboard.</p>
      )}
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
