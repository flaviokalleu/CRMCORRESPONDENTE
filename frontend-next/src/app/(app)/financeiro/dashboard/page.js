import { apiGet } from "@/lib/api-server";

export const metadata = { title: "Dashboard Financeiro" };

// Server Component: dashboard financeiro (fluxo de caixa) — NÃO confundir com
// o dashboard principal do CRM em src/app/(app)/dashboard/page.js (não mexido).
// Referência: frontend/src/pages/financeiro/DashboardPage.jsx.
// Shape do Go (internal/modules/financeiro/fluxocaixa/dto.go DashboardResponse):
// { totalReceitas, totalDespesas, lucro, pendencias }.
export default async function FinanceiroDashboardPage() {
  const data = await apiGet("/fluxocaixa/dashboard");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-4">Dashboard Financeiro</h1>
      {data ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total de Receitas" value={`R$ ${Number(data.totalReceitas ?? 0).toFixed(2)}`} />
          <Stat label="Total de Despesas" value={`R$ ${Number(data.totalDespesas ?? 0).toFixed(2)}`} />
          <Stat label="Lucro" value={`R$ ${Number(data.lucro ?? 0).toFixed(2)}`} />
          <Stat label="Pendências" value={data.pendencias ?? 0} />
        </div>
      ) : (
        <p className="text-white/50 text-sm">Não foi possível carregar o dashboard financeiro.</p>
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
