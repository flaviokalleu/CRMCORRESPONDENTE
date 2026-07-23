import { Activity, Banknote, Bell, Clock, UserCheck, UsersRound } from "lucide-react";
import { apiGet } from "@/lib/api-server";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { HeroMetric } from "@/components/dashboard/HeroMetric";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { TopUsuariosChart } from "@/components/dashboard/TopUsuariosChart";
import { StatusBreakdownChart } from "@/components/dashboard/StatusBreakdownChart";
import { PerformanceGauges } from "@/components/dashboard/PerformanceGauges";
import { HealthRadarChart } from "@/components/dashboard/HealthRadarChart";
import { PendingApprovalList } from "@/components/dashboard/PendingApprovalList";
import { NotificationsList } from "@/components/dashboard/NotificationsList";

export const metadata = { title: "Dashboard" };

const PERIODS = ["Hoje", "7 dias", "30 dias", "Este ano"];

// Server Component: busca tudo do Go em paralelo, direto no servidor
// (Bearer lido do cookie httpOnly) — HTML já chega com números e gráficos
// prontos, sem loading spinner nem waterfall client-side. Só os gráficos
// (Recharts, precisa de DOM/interação) viram ilhas "use client". Layout
// denso, inspirado em terminais financeiros/operacionais (Grafana, painéis
// de BI) — banners de KPI sólidos, painéis com etiqueta colorida, laranja
// como cor líder da marca Caixa, azul como estrutural.
export default async function DashboardPage() {
  const [main, monthly, weekly, notifications] = await Promise.all([
    apiGet("/dashboard"),
    apiGet("/dashboard/monthly"),
    apiGet("/dashboard/weekly"),
    apiGet("/dashboard/notifications"),
  ]);

  if (!main) {
    return (
      <div className="terminal-surface min-h-full p-6">
        <p className="text-sm text-white/50">Não foi possível carregar os dados do dashboard.</p>
      </div>
    );
  }

  const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");

  return (
    <div className="terminal-surface relative min-h-full">
      <div className="terminal-grid pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden="true" />

      <div className="relative space-y-4 p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-white/45">Visão geral do negócio em tempo real.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
              {PERIODS.map((p, i) => (
                <span
                  key={p}
                  className={`rounded-md px-2.5 py-1 text-[0.7rem] font-medium ${
                    i === 2 ? "bg-caixa-orange text-white" : "text-white/50"
                  }`}
                >
                  {p}
                </span>
              ))}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-wide text-emerald-400/80">
              <span className="pulse-dot" />
              ao vivo
            </span>
          </div>
        </div>

        {/* Stat tiles essenciais — banners sólidos, mesma altura, laranja
            lidera (Aguardando aprovação, hero de clientes), azul estrutural. */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <HeroMetric
            label="Total de clientes"
            value={fmt(main.totalCount ?? main.totalClientes)}
            delta={main.crescimentoMensal}
            labels={monthly?.labels ?? []}
            data={monthly?.monthlyData ?? []}
          />
          <StatCard icon={UsersRound} label="Corretores" value={fmt(main.totalCorretores)} accent="blue" />
          <StatCard icon={UserCheck} label="Correspondentes" value={fmt(main.totalCorrespondentes)} accent="blue" />
          <StatCard
            icon={Clock}
            label="Aguardando aprovação"
            value={fmt(main.totalClientesAguardandoAprovacao)}
            accent="orange"
          />
          <StatCard
            icon={Activity}
            label="Clientes hoje"
            value={fmt(main.clientesHoje)}
            accent="blue"
            trend={weekly?.weeklyData}
          />
        </div>

        {/* Gráficos principais */}
        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-3">
          <ChartCard
            title="Evolução mensal"
            subtitle={`${fmt(monthly?.totalYear)} clientes no ano · média ${(monthly?.averageMonth ?? 0).toFixed(1)}/mês`}
            className="xl:col-span-2"
            tag="orange"
            live
          >
            {monthly ? (
              <MonthlyChart labels={monthly.labels} data={monthly.monthlyData} />
            ) : (
              <p className="py-8 text-center text-xs text-white/40">Sem dados mensais.</p>
            )}
          </ChartCard>

          <ChartCard title="Distribuição por status" subtitle="Clientes cadastrados" tag="blue">
            <StatusBreakdownChart
              aprovados={main.clientesAprovados}
              reprovados={main.clientesReprovados}
              pendentes={main.clientesPendentes}
            />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-3">
          <ChartCard
            title="Comparativo semanal"
            subtitle={`${fmt(weekly?.totalWeek)} clientes esta semana`}
            className="xl:col-span-2"
            tag="blue"
          >
            {weekly ? (
              <WeeklyChart labels={weekly.labels} atual={weekly.weeklyData} anterior={weekly.previousWeekData} />
            ) : (
              <p className="py-8 text-center text-xs text-white/40">Sem dados semanais.</p>
            )}
          </ChartCard>

          <ChartCard title="Top corretores" subtitle="Ranking por clientes captados" tag="orange">
            <TopUsuariosChart usuarios={main.top5Usuarios} />
          </ChartCard>
        </div>

        {/* Performance (gauges radiais) + Renda */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <ChartCard title="Performance" subtitle="Taxas do funil de clientes" tag="blue" className="sm:col-span-2">
            <PerformanceGauges
              taxaAprovacao={main.performance?.taxaAprovacao}
              taxaRejeicao={main.performance?.taxaRejeicao}
              eficienciaMedia={main.performance?.eficienciaMedia}
            />
          </ChartCard>
          <StatCard
            icon={Banknote}
            label="Renda média"
            value={(main.rendaAnalysis?.rendaMedia ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
            accent="orange"
          />
        </div>

        {/* Radar de saúde do negócio */}
        <div className="grid grid-cols-1">
          <ChartCard title="Saúde do negócio" subtitle="Indicadores normalizados (0–100)" tag="orange">
            <HealthRadarChart
              taxaAprovacao={main.performance?.taxaAprovacao}
              eficienciaMedia={main.performance?.eficienciaMedia}
              taxaRejeicao={main.performance?.taxaRejeicao}
              crescimentoMensal={main.crescimentoMensal}
              crescimentoSemanal={main.crescimentoSemanal}
            />
          </ChartCard>
        </div>

        {/* Listas operacionais */}
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          <ChartCard title="Aguardando aprovação" subtitle="Clientes que precisam de atenção" tag="orange">
            <PendingApprovalList clientes={main.clientesAguardandoAprovacao} />
          </ChartCard>

          <ChartCard
            title="Notificações"
            subtitle={notifications?.unreadCount ? `${notifications.unreadCount} não lidas` : "Tudo em dia"}
            tag="blue"
            action={<Bell className="h-4 w-4 text-white/30" />}
          >
            <NotificationsList notifications={notifications?.notifications} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
