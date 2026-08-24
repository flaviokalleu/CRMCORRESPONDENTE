import {
  Building2, CheckCircle2, Clock, FileWarning, HandCoins, Home, KeyRound,
  ThumbsDown, TrendingUp, UserCheck, UsersRound, Wifi,
} from "lucide-react";
import { apiGet } from "@/lib/api-server";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FunilCard } from "@/components/dashboard/FunilCard";
import { FilaTrabalho } from "@/components/dashboard/FilaTrabalho";
import { AnaliseMensalCard } from "@/components/dashboard/AnaliseMensalCard";
import { RankingMes } from "@/components/dashboard/RankingMes";
import { GaugeCard } from "@/components/dashboard/GaugeCard";
import { STATUS_COLORS } from "@/lib/chart-colors";

export const metadata = { title: "Dashboard" };

const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");
const fmtBRL = (n) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const share = (parte, todo) => (todo > 0 ? (parte / todo) * 100 : 0);

// O crescimento mensal compara o mês CORRENTE (ainda em curso) com o anterior
// INTEIRO. Nos primeiros dias isso produz "-100%" em vermelho mesmo com a
// operação normal — alarme falso. Só exibimos a variação depois que o mês
// percorreu uma fração razoável; antes disso, o número sozinho já informa.
const DIA_MINIMO_PARA_COMPARAR = 10;
const mesComparavel = () => new Date().getDate() >= DIA_MINIMO_PARA_COMPARAR;

// Dashboard por PAPEL.
//
// O mesmo endpoint /dashboard devolve recortes diferentes conforme quem pede
// (ver scopeUserID no backend): CORRETOR puro recebe só a própria carteira;
// correspondente e administrador recebem o tenant inteiro. Então não se trata
// de esconder cartões — os números já chegam com o significado certo, e o que
// muda aqui é QUAIS perguntas o painel responde:
//
//   corretor       → "como está a minha carteira e o que eu faço hoje"
//   correspondente → "qual é a fila de análise e como está minha aprovação"
//   administrador  → "como vai a operação inteira: time, funil, carteira"
//
// Super admin vê o de administrador + os números do sistema.
export default async function DashboardPage() {
  const [me, main, monthly, weekly, activity, imoveis, alugueis, sysStats] = await Promise.all([
    apiGet("/auth/me"),
    apiGet("/dashboard"),
    apiGet("/dashboard/monthly"),
    apiGet("/dashboard/weekly"),
    apiGet("/dashboard/activity-metrics"),
    apiGet("/imoveis"),
    apiGet("/alugueis"),
    apiGet("/dashboard/system-stats"),
  ]);

  if (!main) {
    return (
      <div className="cx-page min-h-full p-6">
        <p className="text-sm text-cx-muted">Não foi possível carregar os dados do dashboard.</p>
      </div>
    );
  }

  const user = me?.user ?? me ?? {};
  const perms = main.userPermissions ?? {};
  const isSuperAdmin = !!user.is_super_admin;
  const isAdmin = !!(perms.isAdministrador ?? user.is_administrador) || isSuperAdmin;
  const isCorrespondente = !isAdmin && !!(perms.isCorrespondente ?? user.is_correspondente);
  const isCorretor = !isAdmin && !isCorrespondente && !!(perms.isCorretor ?? user.is_corretor);

  const papel = isSuperAdmin
    ? "Super admin"
    : isAdmin
      ? "Administrador"
      : isCorrespondente
        ? "Correspondente"
        : isCorretor
          ? "Corretor"
          : "Equipe";

  // ── Números compartilhados ────────────────────────────────────────────────
  const total = main.totalCount ?? main.totalClientes ?? 0;
  const equipe = (main.totalCorretores ?? 0) + (main.totalCorrespondentes ?? 0);
  const aguardando = main.totalClientesAguardandoAprovacao ?? 0;
  const aprovados = main.clientesAprovados ?? 0;
  const reprovados = main.clientesReprovados ?? 0;
  const pendentes = main.clientesPendentes ?? 0;
  const classificados = aprovados + reprovados + pendentes;

  const taxaAprovacao = main.performance?.taxaAprovacao ?? share(aprovados, classificados);
  const taxaRejeicao = main.performance?.taxaRejeicao ?? share(reprovados, classificados);
  const taxaPendentes = share(pendentes, classificados);

  const listaImoveis = Array.isArray(imoveis) ? imoveis : (imoveis?.data ?? []);
  const listaAlugueis = Array.isArray(alugueis) ? alugueis : (alugueis?.data ?? []);
  const imoveisDisponiveis = listaImoveis.filter(
    (i) => (i.situacao_imovel || "").toLowerCase() === "disponivel",
  ).length;

  const filaClientes = main.clientesAguardandoAprovacao ?? [];

  // Etapas do funil — ordem fixa, da entrada ao desfecho.
  //
  // ATENÇÃO ao montar isto: no backend todo cliente cai em EXATAMENTE um dos
  // três baldes (aprovado / reprovado / pendente), então os três já somam o
  // total. `aguardando` vem de outra query e é um SUBCONJUNTO de pendentes —
  // incluí-lo como fatia faria o funil somar mais de 100%. Ele aparece como
  // nota abaixo da barra, não como etapa.
  const funil = [
    { chave: "pendentes", rotulo: "Em análise", valor: pendentes },
    { chave: "aprovados", rotulo: "Aprovados", valor: aprovados },
    { chave: "reprovados", rotulo: "Reprovados", valor: reprovados },
  ].filter((e) => e.valor > 0);

  return (
    <div className="cx-page min-h-full">
      <div className="mx-auto w-full max-w-[1500px] space-y-4 p-3 sm:p-5">
        {/* Cabeçalho com o papel — deixa explícito de quem é o recorte */}
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold text-cx-text sm:text-xl">
              Olá, {user.first_name || "bem-vindo"}
            </h1>
            <p className="text-sm text-cx-muted">
              {isCorretor
                ? "Sua carteira e o que precisa de atenção hoje."
                : isCorrespondente
                  ? "A fila de análise de crédito e o seu desempenho."
                  : "Visão geral da operação."}
            </p>
          </div>
          <span className="rounded-full border border-cx-border bg-cx-surface px-2.5 py-1 text-[0.7rem] font-semibold text-cx-blue">
            {papel}
          </span>
        </header>

        {/* ── Faixa de KPIs — o conteúdo muda por papel ────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isCorretor && (
            <>
              <KpiCard
                icon={UsersRound}
                label="Minha carteira"
                value={fmt(total)}
                hint="clientes sob minha responsabilidade"
                href="/clientes/lista"
              />
              <KpiCard
                icon={TrendingUp}
                label="Novos este mês"
                value={fmt(main.clientesEsteMes)}
                delta={mesComparavel() ? main.crescimentoMensal : undefined}
                hint={`${fmt(main.clientesMesAnterior)} no mês anterior`}
              />
              <KpiCard
                icon={Clock}
                label="Aguardando aprovação"
                value={fmt(aguardando)}
                hint="parados na análise"
                invertDelta
                href="/clientes/lista"
              />
              <KpiCard
                icon={Home}
                label="Imóveis disponíveis"
                value={fmt(imoveisDisponiveis)}
                hint="prontos para ofertar"
                href="/imoveis/lista"
              />
            </>
          )}

          {isCorrespondente && (
            <>
              <KpiCard
                icon={Clock}
                label="Na fila de análise"
                value={fmt(aguardando)}
                hint="aguardando sua aprovação"
                invertDelta
                href="/clientes/lista"
              />
              <KpiCard
                icon={FileWarning}
                label="Em análise"
                value={fmt(pendentes)}
                hint="documentação ou condicionado"
                invertDelta
              />
              <KpiCard
                icon={CheckCircle2}
                label="Taxa de aprovação"
                value={`${taxaAprovacao.toFixed(1).replace(".", ",")}%`}
                hint={`${fmt(aprovados)} aprovados`}
              />
              <KpiCard
                icon={ThumbsDown}
                label="Taxa de rejeição"
                value={`${taxaRejeicao.toFixed(1).replace(".", ",")}%`}
                hint={`${fmt(reprovados)} reprovados`}
                invertDelta
              />
            </>
          )}

          {isAdmin && (
            <>
              <KpiCard
                icon={UsersRound}
                label="Total de clientes"
                value={fmt(total)}
                delta={mesComparavel() ? main.crescimentoMensal : undefined}
                hint={`${fmt(main.clientesEsteMes)} neste mês`}
                href="/clientes/lista"
              />
              <KpiCard
                icon={UserCheck}
                label="Equipe"
                value={fmt(equipe)}
                hint={`${fmt(main.totalCorretores)} corretores · ${fmt(main.totalCorrespondentes)} correspondentes`}
                href="/corretores/lista"
              />
              <KpiCard
                icon={Clock}
                label="Aguardando aprovação"
                value={fmt(aguardando)}
                hint="fila de análise da operação"
                invertDelta
                href="/clientes/lista"
              />
              <KpiCard
                icon={Wifi}
                label="Ativos hoje"
                value={fmt(activity?.onlineUsers ?? main.usuariosAtivosHoje)}
                hint={`de ${fmt(main.performance?.totalUsuarios ?? equipe)} usuários`}
              />
            </>
          )}
        </div>

        {/* ── Segunda faixa: recortes que só fazem sentido para alguns ──── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={TrendingUp}
            label="Cadastros na semana"
            value={fmt(main.clientesSemana)}
            delta={main.crescimentoSemanal}
            hint={`${fmt(main.clientesHoje)} hoje · vs. semana anterior`}
          />
          <KpiCard
            icon={HandCoins}
            label="Renda média da carteira"
            value={fmtBRL(main.rendaAnalysis?.rendaMedia)}
            hint={`${fmt(main.rendaAnalysis?.clientesComRenda)} com renda informada`}
          />
          {(isAdmin || isCorretor) && (
            <KpiCard
              icon={Building2}
              label="Imóveis cadastrados"
              value={fmt(listaImoveis.length)}
              hint={`${fmt(imoveisDisponiveis)} disponíveis`}
              href="/imoveis/lista"
            />
          )}
          {(isAdmin || isCorretor) && (
            <KpiCard
              icon={KeyRound}
              label="Contratos de aluguel"
              value={fmt(listaAlugueis.length)}
              hint="carteira de locação"
              href="/alugueis"
            />
          )}
          {isCorrespondente && (
            <>
              <KpiCard
                icon={CheckCircle2}
                label="Eficiência"
                value={`${(activity?.efficiency ?? main.performance?.eficienciaMedia ?? 0).toFixed(1).replace(".", ",")}%`}
                hint="conversão da sua análise"
              />
              <KpiCard
                icon={Clock}
                label="Entradas em 24h"
                value={fmt(activity?.clientesUltimas24h)}
                hint={`${fmt(activity?.clientesUltimos7d)} nos últimos 7 dias`}
              />
            </>
          )}
        </div>

        {/* ── Série temporal + ranking ──────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <AnaliseMensalCard
              mensal={{ labels: monthly?.labels ?? [], data: monthly?.monthlyData ?? [] }}
              semanal={{ labels: weekly?.labels ?? [], data: weekly?.weeklyData ?? [] }}
            />
          </div>
          {isAdmin ? (
            <RankingMes usuarios={main.top5Usuarios} />
          ) : (
            <FunilResumoLateral
              taxaAprovacao={taxaAprovacao}
              taxaPendentes={taxaPendentes}
              taxaRejeicao={taxaRejeicao}
            />
          )}
        </div>

        {/* ── Funil + fila de trabalho ──────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <FunilCard
              etapas={funil}
              total={classificados}
              titulo={isCorretor ? "Funil da minha carteira" : "Funil de atendimento"}
              nota={
                aguardando > 0
                  ? `${fmt(aguardando)} de ${fmt(pendentes)} em análise estão parados aguardando aprovação ou documentação.`
                  : null
              }
            />
          </div>
          <FilaTrabalho
            clientes={filaClientes}
            titulo={isCorrespondente ? "Fila de análise" : "Precisam de atenção"}
            vazio="Nada parado na fila. 🎉"
            href="/clientes/lista"
          />
        </div>

        {/* ── Anéis do funil: só para quem responde pela operação ───────── */}
        {isAdmin && (
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
        )}

        {/* ── Números do sistema: exclusivo do super admin ──────────────── */}
        {isSuperAdmin && sysStats && (
          <section className="rounded-xl border border-cx-border bg-cx-surface p-5">
            <h2 className="text-sm font-semibold text-cx-text">Sistema</h2>
            <p className="mb-3 text-xs text-cx-muted">
              Números globais da instalação — visíveis apenas para super admin.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat rotulo="Registros" valor={fmt(sysStats.totalRegistros)} />
              <MiniStat rotulo="Usuários" valor={fmt(sysStats.totalUsuarios)} />
              <MiniStat rotulo="Atividade recente" valor={fmt(sysStats.atividadeRecente)} />
              <MiniStat rotulo="Usuários recentes" valor={fmt(sysStats.usuariosRecentes)} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// Para corretor e correspondente, no lugar do ranking do time (que não é
// assunto deles): as três taxas do próprio recorte, em barras.
function FunilResumoLateral({ taxaAprovacao, taxaPendentes, taxaRejeicao }) {
  const linhas = [
    { rotulo: "Aprovação", valor: taxaAprovacao, cor: STATUS_COLORS.good },
    { rotulo: "Em análise", valor: taxaPendentes, cor: STATUS_COLORS.warning },
    { rotulo: "Rejeição", valor: taxaRejeicao, cor: STATUS_COLORS.critical },
  ];
  return (
    <section className="rounded-xl border border-cx-border bg-cx-surface p-5">
      <h2 className="text-sm font-semibold text-cx-text">Desfecho da carteira</h2>
      <p className="mb-4 text-xs text-cx-muted">Sobre os clientes já classificados.</p>
      <ul className="space-y-3.5">
        {linhas.map((l) => (
          <li key={l.rotulo}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-xs text-cx-text">{l.rotulo}</span>
              <span className="font-tabular text-xs font-semibold text-cx-text">
                {l.valor.toFixed(1).replace(".", ",")}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-cx-bg">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, l.valor))}%`, backgroundColor: l.cor }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MiniStat({ rotulo, valor }) {
  return (
    <div className="rounded-lg border border-cx-border bg-cx-bg px-3 py-2.5">
      <span className="text-[0.68rem] font-medium uppercase tracking-wide text-cx-muted">{rotulo}</span>
      <p className="font-tabular mt-0.5 text-lg font-bold text-cx-text">{valor}</p>
    </div>
  );
}
