import { apiGet } from "@/lib/api-server";
import { PageHeader, EmptyState, formatBRL } from "@/components/ui/page";
import { Wallet, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

export const metadata = { title: "Dashboard Financeiro" };

function Stat({ label, value, icon: Icon, tone }) {
  return (
    <div className="rounded-2xl border border-cx-border bg-cx-surface p-4">
      <div className="mb-2 flex items-center gap-2 text-cx-muted">
        {Icon && <Icon className="h-4 w-4" style={tone ? { color: tone } : undefined} />}
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-cx-text" style={tone ? { color: tone } : undefined}>{value}</p>
    </div>
  );
}

export default async function FinanceiroDashboardPage() {
  const data = await apiGet("/fluxocaixa/dashboard");

  return (
    <div className="p-6">
      <PageHeader title="Dashboard Financeiro" subtitle="Fluxo de caixa consolidado." />
      {data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Receitas" value={formatBRL(data.totalReceitas)} icon={TrendingUp} tone="#34d399" />
          <Stat label="Despesas" value={formatBRL(data.totalDespesas)} icon={TrendingDown} tone="#f87171" />
          <Stat label="Lucro" value={formatBRL(data.lucro)} icon={Wallet} />
          <Stat label="Pendências" value={data.pendencias ?? 0} icon={AlertCircle} tone="#fbbf24" />
        </div>
      ) : (
        <EmptyState icon={Wallet} title="Não foi possível carregar o dashboard financeiro" />
      )}
    </div>
  );
}
