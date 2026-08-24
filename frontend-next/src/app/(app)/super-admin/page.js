import { apiGet } from "@/lib/api-server";

export const metadata = { title: "Super Admin" };

// Server Component: visão geral/métricas principais do painel super-admin.
// As abas de Empresas/Planos/Assinaturas (CRUD completo) ficam para uma
// iteração futura — aqui só a visão geral, conforme escopo.
export default async function SuperAdminPage() {
  const metrics = await apiGet("/super-admin/metrics");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-cx-text">Painel Super Admin</h1>
        <p className="text-sm text-cx-muted mt-1">Métricas gerais da plataforma.</p>
      </div>

      {!metrics ? (
        <p className="text-cx-muted text-sm">Não foi possível carregar as métricas.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total de empresas" value={metrics.totalTenants ?? metrics.total_tenants ?? 0} />
          <Stat label="Assinaturas ativas" value={metrics.activeSubscriptions ?? metrics.assinaturas_ativas ?? 0} />
          <Stat label="Receita mensal (MRR)" value={formatCurrency(metrics.mrr ?? metrics.receita_mensal)} />
          <Stat label="Usuários totais" value={metrics.totalUsers ?? metrics.total_usuarios ?? 0} />
        </div>
      )}
    </div>
  );
}

function formatCurrency(v) {
  if (v == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-cx-border bg-cx-surface p-4">
      <p className="text-2xl font-bold text-cx-text">{value}</p>
      <p className="text-xs text-cx-muted mt-1">{label}</p>
    </div>
  );
}
