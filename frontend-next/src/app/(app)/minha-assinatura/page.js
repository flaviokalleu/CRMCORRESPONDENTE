import { apiGet } from "@/lib/api-server";

export const metadata = { title: "Minha Assinatura" };

const FEATURE_LABELS = {
  whatsapp: "WhatsApp",
  pagamentos: "Pagamentos",
  ai_analysis: "Análise com IA",
  relatorios_avancados: "Relatórios avançados",
  multi_usuarios: "Multiusuários",
  api_access: "Acesso à API",
  suporte_prioritario: "Suporte prioritário",
  dominio_customizado: "Domínio customizado",
};

const RESOURCE_LABELS = { clientes: "Clientes", usuarios: "Usuários", imoveis: "Imóveis", alugueis: "Aluguéis" };

// Server Component: exibe uso do plano atual (SSR, sem interatividade —
// alterar plano fica para uma iteração futura).
export default async function MinhaAssinaturaPage() {
  const data = await apiGet("/plan-usage");

  if (!data) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-white mb-4">Minha Assinatura</h1>
        <p className="text-white/50 text-sm">Não foi possível carregar os dados da assinatura.</p>
      </div>
    );
  }

  const plano = data.plano || {};
  const uso = data.uso || {};
  const features = data.features || {};
  const subscription = data.subscription || {};

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Minha Assinatura</h1>
        <p className="text-sm text-white/50 mt-1">Gerencie seu plano e acompanhe o uso dos recursos.</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Info label="Plano" value={plano.nome || "Sem plano"} />
        <Info label="Status" value={subscription.status || "-"} />
        <Info label="Ciclo" value={subscription.ciclo || "-"} />
        <Info label="Dias restantes" value={subscription.dias_restantes != null ? `${subscription.dias_restantes} dias` : "-"} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white/70 mb-3">Uso de recursos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(uso).map(([key, val]) => (
            <div key={key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs text-white/50">{RESOURCE_LABELS[key] || key}</p>
              <p className="text-lg font-semibold text-white">
                {val?.atual ?? 0} / {val?.limite ?? "Ilimitado"}
              </p>
            </div>
          ))}
          {Object.keys(uso).length === 0 && <p className="text-white/30 text-sm">Sem dados de uso.</p>}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white/70 mb-3">Features disponíveis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(features).map(([key, available]) => (
            <div
              key={key}
              className={`rounded-lg border px-3 py-2 text-sm ${available ? "border-emerald-500/30 bg-emerald-500/5 text-white" : "border-white/10 bg-white/[0.02] text-white/40"}`}
            >
              {available ? "✓" : "✗"} {FEATURE_LABELS[key] || key}
            </div>
          ))}
          {Object.keys(features).length === 0 && <p className="text-white/30 text-sm">Sem features listadas.</p>}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
    </div>
  );
}
