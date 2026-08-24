import { Clock, UserCheck, UsersRound, Wifi } from "lucide-react";
import { apiGet } from "@/lib/api-server";
import { MetricPill } from "@/components/dashboard/MetricPill";
import { AnaliseMensalCard } from "@/components/dashboard/AnaliseMensalCard";
import { RankingMes } from "@/components/dashboard/RankingMes";
import { GaugeCard } from "@/components/dashboard/GaugeCard";
import { STATUS_COLORS } from "@/lib/chart-colors";

export const metadata = { title: "Dashboard" };

// Server Component: busca tudo do Go em paralelo (Bearer do cookie httpOnly),
// então o HTML já chega com números prontos. Só a Análise Mensal (toggle
// Mensal/Semanal) e os anéis (Recharts) viram ilhas "use client".
//
// Visual: superfície "aqua" (azul → turquesa) com cartões de vidro claro,
// laranja da marca nos números e CTAs — recriação do painel de referência.
export default async function DashboardPage() {
  const [main, monthly, weekly, activity] = await Promise.all([
    apiGet("/dashboard"),
    apiGet("/dashboard/monthly"),
    apiGet("/dashboard/weekly"),
    apiGet("/dashboard/activity-metrics"),
  ]);

  if (!main) {
    return (
      <div className="cx-page min-h-full p-6">
        <p className="text-sm text-cx-muted">Não foi possível carregar os dados do dashboard.</p>
      </div>
    );
  }

  const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");
  const total = main.totalCount ?? main.totalClientes ?? 0;
  const equipe = (main.totalCorretores ?? 0) + (main.totalCorrespondentes ?? 0);
  const share = (parte, todo) => (todo > 0 ? (parte / todo) * 100 : 0);

  // Distribuição do funil: as três taxas somam o universo de clientes
  // classificados, então "Em análise" sai da mesma base das outras duas.
  const classificados =
    (main.clientesAprovados ?? 0) + (main.clientesReprovados ?? 0) + (main.clientesPendentes ?? 0);
  const taxaAprovacao = main.performance?.taxaAprovacao ?? share(main.clientesAprovados, classificados);
  const taxaRejeicao = main.performance?.taxaRejeicao ?? share(main.clientesReprovados, classificados);
  const taxaPendentes = share(main.clientesPendentes, classificados);

  return (
    <div className="cx-page min-h-full">
      <div className="space-y-4 p-3 sm:p-5">
        {/* Faixa de métricas do topo */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricPill
            icon={UserCheck}
            label="Correspondentes"
            value={fmt(main.totalCorrespondentes)}
            ratio={share(main.totalCorrespondentes, equipe)}
          />
          <MetricPill
            icon={Clock}
            label="Aguardando"
            value={fmt(main.totalClientesAguardandoAprovacao)}
            ratio={share(main.totalClientesAguardandoAprovacao, total)}
          />
          <MetricPill icon={UsersRound} label="Total de Clientes" value={fmt(total)} ratio={100} />
          <MetricPill
            icon={Wifi}
            label="Online"
            value={fmt(activity?.onlineUsers ?? main.usuariosAtivosHoje)}
            ratio={share(activity?.onlineUsers ?? main.usuariosAtivosHoje, main.performance?.totalUsuarios ?? equipe)}
          />
        </div>

        {/* Análise (2/3) + Ranking (1/3) */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <AnaliseMensalCard
            mensal={{ labels: monthly?.labels ?? [], data: monthly?.monthlyData ?? [] }}
            semanal={{ labels: weekly?.labels ?? [], data: weekly?.weeklyData ?? [] }}
          />
          <RankingMes usuarios={main.top5Usuarios} />
        </div>

        {/* Funil de aprovação em anéis */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <GaugeCard
            value={taxaAprovacao}
            color={STATUS_COLORS.good}
            centerLabel="Aprovados"
            title="Taxa de Aprovação"
            subtitle="Clientes aprovados com sucesso"
          />
          <GaugeCard
            value={taxaPendentes}
            color={STATUS_COLORS.warning}
            centerLabel="Pendentes"
            title="Em Análise"
            subtitle="Aguardando aprovação"
          />
          <GaugeCard
            value={taxaRejeicao}
            color={STATUS_COLORS.critical}
            centerLabel="Rejeitados"
            title="Taxa de Rejeição"
            subtitle="Clientes não aprovados"
          />
        </div>
      </div>
    </div>
  );
}
