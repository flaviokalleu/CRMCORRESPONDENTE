import { DashboardReferencia } from "@/components/dashboard/DashboardReferencia";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { apiGet } from "@/lib/api-server";
import { PulsoOperacao } from "@/components/dashboard/PulsoOperacao";
import { DashboardToolbar } from "@/components/dashboard/DashboardToolbar";
import { MetasGerenciais } from "@/components/dashboard/MetasGerenciais";
import { GraficoEvolucao } from "@/components/dashboard/GraficoEvolucao";
import { GraficoSemanal } from "@/components/dashboard/GraficoSemanal";
import { EsteiraResultado } from "@/components/dashboard/EsteiraResultado";
import { CentralAtencao } from "@/components/dashboard/CentralAtencao";
import { FluxoCaixaCard } from "@/components/dashboard/FluxoCaixaCard";
import { PortfolioCard } from "@/components/dashboard/PortfolioCard";
import { RankingEquipe } from "@/components/dashboard/RankingEquipe";
import { BlocoCarteira, BlocoRitmo, PainelTaxas } from "@/components/dashboard/PaineisPapel";

export const metadata = { title: "Dashboard gerencial" };

const DAY = 86_400_000;
const VALID_PERIODS = new Set(["hoje", "7d", "30d", "mes", "12m", "personalizado"]);
const fmt = (n) => (n ?? 0).toLocaleString("pt-BR");
const fmtPct = (n) => (n == null ? "—" : `${n.toFixed(1).replace(".", ",")}%`);

const toISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromISO = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) || toISO(date) !== value ? null : date;
};

const clampInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

function resolvePeriod(query) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requested = typeof query?.periodo === "string" && VALID_PERIODS.has(query.periodo)
    ? query.periodo
    : "30d";
  let start;
  let end = new Date(today);
  let periodo = requested;

  if (requested === "personalizado") {
    const customStart = fromISO(typeof query?.inicio === "string" ? query.inicio : "");
    const customEnd = fromISO(typeof query?.fim === "string" ? query.fim : "");
    const validRange = customStart && customEnd && customEnd >= customStart && customEnd - customStart <= 730 * DAY;
    if (validRange) {
      start = customStart;
      end = customEnd;
    } else {
      periodo = "30d";
    }
  }

  if (!start) {
    start = new Date(today);
    if (periodo === "7d") start.setDate(start.getDate() - 6);
    else if (periodo === "30d") start.setDate(start.getDate() - 29);
    else if (periodo === "mes") start.setDate(1);
    else if (periodo === "12m") {
      start.setDate(1);
      start.setMonth(start.getMonth() - 11);
    }
  }

  const labels = {
    hoje: "Hoje",
    "7d": "Últimos 7 dias",
    "30d": "Últimos 30 dias",
    mes: "Mês atual",
    "12m": "Últimos 12 meses",
  };
  const label = periodo === "personalizado"
    ? `${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`
    : labels[periodo];
  return { periodo, inicio: toISO(start), fim: toISO(end), label };
}

const asList = (value) => Array.isArray(value) ? value : (value?.clientes ?? value?.imoveis ?? value?.data ?? []);

function clientListHref({ filtros, status, view }) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (view) params.set("view", view);
  if (filtros.responsavel) params.set("corretor", filtros.responsavel);
  params.set("inicio", filtros.inicio);
  params.set("fim", filtros.fim);
  return `/clientes/lista?${params.toString()}`;
}

function slaSummary(clientes, sla) {
  const ages = (Array.isArray(clientes) ? clientes : []).map((item) => {
    const value = new Date(item.updated_at || item.created_at).getTime();
    return Number.isNaN(value) ? 0 : Math.max(0, Math.floor((Date.now() - value) / DAY));
  });
  const vencidos = ages.filter((days) => days > sla).length;
  const emRisco = ages.filter((days) => days <= sla && days >= Math.ceil(sla * 0.7)).length;
  const noPrazo = Math.max(0, ages.length - vencidos - emRisco);
  return {
    sla,
    vencidos,
    emRisco,
    noPrazo,
    conformidade: ages.length ? (noPrazo / ages.length) * 100 : 100,
  };
}

export default async function DashboardPage({ searchParams }) {
  const query = await searchParams;
  const period = resolvePeriod(query);
  const responsavel = /^\d+$/.test(query?.responsavel || "") ? query.responsavel : "";
  const meta = clampInt(query?.meta, 70, 1, 100);
  const sla = clampInt(query?.sla, 7, 1, 90);
  const filtros = { ...period, responsavel, meta, sla };

  const scoped = new URLSearchParams();
  if (responsavel) scoped.set("responsavel", responsavel);
  const scopedSuffix = scoped.size ? `?${scoped.toString()}` : "";
  const range = new URLSearchParams({ periodo: period.periodo, inicio: period.inicio, fim: period.fim });
  if (responsavel) range.set("responsavel", responsavel);

  const historyEnd = fromISO(period.fim) ?? new Date();
  const historyStart = new Date(historyEnd.getFullYear(), historyEnd.getMonth(), 1);
  historyStart.setMonth(historyStart.getMonth() - 11);
  const history = new URLSearchParams({ periodo: "12m", inicio: toISO(historyStart), fim: period.fim });
  if (responsavel) history.set("responsavel", responsavel);

  // Todas as fontes independentes são consultadas em paralelo.
  const [me, main, analytics, historical, imoveis, alugueis, sysStats, fluxo, avisos, corretoresData, correspondentesData, recentesData, tarefasData, propostasData] =
    await Promise.all([
      apiGet("/auth/me"),
      apiGet(`/dashboard${scopedSuffix}`),
      apiGet(`/dashboard/analytics?${range.toString()}`),
      apiGet(`/dashboard/analytics?${history.toString()}`),
      apiGet("/imoveis"),
      apiGet("/alugueis"),
      apiGet("/dashboard/system-stats"),
      apiGet(`/fluxocaixa/dashboard?inicio=${period.inicio}&fim=${period.fim}`),
      apiGet(`/dashboard/notifications${scopedSuffix}`),
      apiGet("/corretor?all=true"),
      apiGet("/correspondente/lista"),
      apiGet(`/clientes?limit=5&sort=recentes${responsavel ? `&corretor=${responsavel}` : ""}`),
      apiGet("/lembretes"),
      apiGet("/propostas"),
    ]);

  if (!main) {
    return (
      <div className="wb-page grid min-h-full place-items-center p-6">
        <section className="wb-panel max-w-md p-7 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-wb-bad">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-lg font-semibold text-wb-text">O dashboard não carregou</h1>
          <p className="mt-2 text-sm leading-relaxed text-wb-muted">Não foi possível consultar os indicadores da operação.</p>
          <Link href="/dashboard" className="mt-5 inline-flex h-9 items-center rounded-lg bg-wb-brand px-4 text-sm font-semibold text-white">
            Tentar novamente
          </Link>
        </section>
      </div>
    );
  }

  const user = me?.user ?? me ?? {};
  const perms = main.userPermissions ?? {};
  const isSuperAdmin = !!user.is_super_admin;
  const isAdmin = !!(perms.isAdministrador ?? user.is_administrador) || isSuperAdmin;
  const isCorrespondente = !isAdmin && !!(perms.isCorrespondente ?? user.is_correspondente);
  const isCorretor = !isAdmin && !isCorrespondente && !!(perms.isCorretor ?? user.is_corretor);
  const podeFiltrarResponsavel = isAdmin || isCorrespondente;

  const papel = isSuperAdmin ? "Super admin" : isAdmin ? "Administrador" : isCorrespondente ? "Correspondente" : isCorretor ? "Corretor" : "Equipe";
  const teamMap = new Map();
  for (const member of [...asList(corretoresData), ...asList(correspondentesData)]) {
    if (!member?.id) continue;
    const nome = `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() || member.username || member.email;
    teamMap.set(String(member.id), { id: String(member.id), nome });
  }
  const responsaveis = Array.from(teamMap.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const responsavelNome = teamMap.get(responsavel)?.nome ?? "Toda a equipe";

  const total = main.totalCount ?? main.totalClientes ?? 0;
  const aguardando = main.totalClientesAguardandoAprovacao ?? 0;
  const filaClientes = main.clientesAguardandoAprovacao ?? [];
  const aprovados = analytics?.clientesAprovados ?? 0;
  const reprovados = analytics?.clientesReprovados ?? 0;
  const pendentes = analytics?.clientesPendentes ?? 0;
  const totalPeriodo = analytics?.totalCurrent ?? 0;
  const decisoes = aprovados + reprovados;
  const taxaAprovacao = analytics ? analytics.taxaAprovacao : null;
  const taxaRejeicao = analytics ? analytics.taxaRejeicao : null;
  const taxaResolucao = analytics ? analytics.taxaResolucao : null;
  const activeAlerts = avisos?.activeCount ?? 0;
  const slaResumo = slaSummary(filaClientes, sla);

  const listaImoveis = imoveis == null ? null : asList(imoveis);
  const listaAlugueis = alugueis == null ? null : asList(alugueis);
  const imoveisDisponiveis = listaImoveis?.filter((item) => (item.situacao_imovel || "").toLowerCase() === "disponivel").length ?? null;
  const agora = new Date();
  const saudacao = agora.getHours() < 12 ? "Bom dia" : agora.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const dataFormatada = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const horaAtualizada = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const filaHref = clientListHref({ filtros, status: "atencao" });
  const carteiraHref = clientListHref({ filtros });
  const funilHref = clientListHref({ filtros, view: "kanban" });

  const destaque = slaResumo.vencidos > 0
    ? `${fmt(slaResumo.vencidos)} ${slaResumo.vencidos === 1 ? "caso ultrapassou" : "casos ultrapassaram"} o SLA de ${sla} dias.`
    : aguardando > 0
      ? `${fmt(aguardando)} ${aguardando === 1 ? "cliente pede" : "clientes pedem"} ação na fila, todos dentro do SLA.`
      : "Fila operacional em dia — nenhuma análise aguardando ação.";

  const acoes = isCorrespondente
    ? [{ label: "Abrir fila", href: filaHref, icone: "fila", primaria: true }, { label: "Novo cliente", href: "/clientes/adicionar", icone: "adicionar" }]
    : isAdmin
      ? [{ label: "Novo cliente", href: "/clientes/adicionar", icone: "adicionar", primaria: true }, { label: "Ver relatório", href: "/relatorio", icone: "relatorio" }]
      : [{ label: "Novo cliente", href: "/clientes/adicionar", icone: "adicionar", primaria: true }, { label: "Ver carteira", href: carteiraHref, icone: "carteira" }];

  const vitais = [
    {
      rotulo: isCorretor ? "Minha carteira" : "Carteira no escopo",
      valor: fmt(total),
      detalhe: responsavelNome,
      href: carteiraHref,
      icone: "carteira",
    },
    {
      rotulo: "Entradas no período",
      valor: fmt(totalPeriodo),
      detalhe: period.label,
      href: carteiraHref,
      icone: "atividade",
      tom: "info",
    },
    {
      rotulo: "Aprovação das decisões",
      valor: fmtPct(taxaAprovacao),
      detalhe: decisoes ? `${fmt(aprovados)} de ${fmt(decisoes)} decisões` : "sem decisões concluídas",
      href: funilHref,
      icone: "aprovacao",
      tom: taxaAprovacao == null ? "info" : taxaAprovacao >= meta ? "bom" : "atencao",
    },
    {
      rotulo: "Resolução do período",
      valor: fmtPct(taxaResolucao),
      detalhe: `${fmt(aprovados + reprovados)} de ${fmt(totalPeriodo)} entradas`,
      href: funilHref,
      icone: "relatorio",
      tom: "info",
    },
    {
      rotulo: "SLA vencido",
      valor: fmt(slaResumo.vencidos),
      detalhe: `${fmt(aguardando)} na fila atual`,
      href: "#alertas",
      icone: "fila",
      tom: slaResumo.vencidos > 0 ? "ruim" : "bom",
    },
  ];

  const csvRows = [
    ["PAINEL GERENCIAL"],
    ["Período", period.label],
    ["Responsável", responsavelNome],
    [],
    ["Indicador", "Valor"],
    ["Carteira no escopo", total],
    ["Entradas no período", totalPeriodo],
    ["Aprovação das decisões", fmtPct(taxaAprovacao)],
    ["Resolução do período", fmtPct(taxaResolucao)],
    ["Fila de atenção", aguardando],
    ["SLA vencido", slaResumo.vencidos],
    ["Situações ativas", activeAlerts],
    [],
    ["CLIENTE", "STATUS", "RESPONSÁVEL", "ÚLTIMA MOVIMENTAÇÃO"],
    ...filaClientes.map((item) => [item.nome, item.status, item.responsavel_nome || "Sem responsável", item.updated_at || item.created_at]),
  ];

  return (
    <div id="dashboard-print-root" className="wb-page min-h-full">
      <DashboardReferencia user={user} main={main} historical={historical} imoveis={listaImoveis} tarefas={!(isAdmin || isCorrespondente) || tarefasData == null ? null : asList(tarefasData)} recentes={recentesData == null ? null : asList(recentesData)} propostas={propostasData == null ? null : asList(propostasData)} />
      <details className="ref-management"><summary>Análises gerenciais, filtros e exportação</summary>
      <div className="mx-auto w-full max-w-[1680px] space-y-5 p-4 sm:p-5 lg:p-6 min-[1900px]:max-w-[1840px]">
        <DashboardToolbar filtros={filtros} responsaveis={responsaveis} podeFiltrarResponsavel={podeFiltrarResponsavel} csvRows={csvRows} />

        <PulsoOperacao
          nome={user.first_name}
          papel={papel}
          saudacao={saudacao}
          subtitulo={isCorretor ? "Sua carteira, seus resultados e as ações com prazo." : isCorrespondente ? "Fila de crédito, nível de serviço e decisões com base explícita." : "Desempenho, prioridades, equipe e caixa em uma leitura executiva."}
          dataFormatada={dataFormatada}
          horaAtualizada={horaAtualizada}
          vitais={vitais}
          destaque={destaque}
          alertas={activeAlerts}
          acoes={acoes}
        />

        <MetasGerenciais aprovacao={taxaAprovacao} resolucao={taxaResolucao} meta={meta} slaResumo={slaResumo} alertas={activeAlerts} totalPeriodo={totalPeriodo} />

        <section aria-labelledby="desempenho-title" className="space-y-3.5">
          <DashboardSectionHeader id="desempenho-title" eyebrow="Desempenho" titulo="Ritmo, conversão e desfecho" descricao={`Leitura de ${period.label.toLowerCase()} com comparação equivalente.`} />
          <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12">
            <GraficoEvolucao
              className="xl:col-span-7"
              titulo={isCorretor ? "Evolução da minha carteira" : "Evolução da operação"}
              mensal={{
                rotulos: historical?.labels ?? [],
                dados: historical?.currentData ?? [],
                total: historical?.totalCurrent ?? 0,
                media: historical?.currentData?.length ? (historical.totalCurrent ?? 0) / historical.currentData.length : 0,
                crescimento: historical?.growth,
                indisponivel: historical == null,
              }}
            />
            <EsteiraResultado
              className="xl:col-span-5"
              titulo={isCorretor ? "Resultado da minha carteira" : isCorrespondente ? "Resultado das análises" : "Resultado da operação"}
              pendentes={pendentes}
              aprovados={aprovados}
              reprovados={reprovados}
              aguardando={aguardando}
              taxaAprovacao={taxaAprovacao}
              taxaResolucao={taxaResolucao}
              periodoLabel={period.label}
            />
          </div>
          <GraficoSemanal
            rotulos={analytics?.labels ?? []}
            dados={analytics?.currentData ?? []}
            anteriores={analytics?.previousData ?? []}
            total={totalPeriodo}
            crescimento={analytics?.growth}
            indisponivel={analytics == null}
            titulo="Período atual x período anterior"
            descricao={`${period.label} comparado a uma janela anterior de igual duração.`}
            nomeAtual={period.label}
            nomeAnterior="Janela anterior"
            labelTotal={totalPeriodo === 1 ? "novo cliente no período" : "novos clientes no período"}
          />
        </section>

        <section aria-labelledby="prioridades-title" className="space-y-3.5">
          <DashboardSectionHeader id="prioridades-title" eyebrow="Execução" titulo="Prioridades e responsáveis" descricao="Uma fila única, ordenada pelo risco de prazo e pronta para ação." />
          <CentralAtencao clientes={filaClientes} alertas={avisos} sla={sla} href={filaHref} />
        </section>

        <section aria-labelledby="negocio-title" className="space-y-3.5">
          <DashboardSectionHeader id="negocio-title" eyebrow="Negócio" titulo={isAdmin ? "Caixa, portfólio e equipe" : "Carteira e oportunidades"} descricao="Visão integrada do que sustenta o próximo resultado." />
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-12">
            {isAdmin ? (
              <FluxoCaixaCard fluxo={fluxo} periodoLabel={period.label} className="md:col-span-2 xl:col-span-5" />
            ) : isCorrespondente ? (
              <BlocoRitmo entradasPeriodo={totalPeriodo} periodoLabel={period.label} taxaAprovacao={taxaAprovacao} aguardando={aguardando} className="xl:col-span-4" />
            ) : (
              <BlocoCarteira total={total} esteMes={main.clientesEsteMes} aguardando={aguardando} imoveisDisponiveis={imoveisDisponiveis} className="xl:col-span-4" />
            )}
            <PortfolioCard
              imoveisTotal={listaImoveis?.length ?? null}
              imoveisDisponiveis={imoveisDisponiveis}
              contratosAluguel={listaAlugueis?.length ?? null}
              renda={main.rendaAnalysis}
              indisponivel={listaImoveis == null || listaAlugueis == null}
              className={isAdmin ? "xl:col-span-3" : "xl:col-span-4"}
            />
            {isAdmin ? (
              <RankingEquipe usuarios={analytics?.topUsuarios} periodoLabel={period.label} className="xl:col-span-4" />
            ) : (
              <PainelTaxas taxaAprovacao={taxaAprovacao} taxaResolucao={taxaResolucao} taxaRejeicao={taxaRejeicao} className="xl:col-span-4" />
            )}
          </div>
        </section>

        {isSuperAdmin && sysStats ? (
          <section className="wb-panel p-5">
            <DashboardSectionHeader eyebrow="Sistema" titulo="Visão global da instalação" descricao="Indicadores exclusivos da administração da plataforma." />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat rotulo="Registros" valor={fmt(sysStats.totalRegistros)} />
              <MiniStat rotulo="Usuários" valor={fmt(sysStats.totalUsuarios)} />
              <MiniStat rotulo="Atividade recente" valor={fmt(sysStats.atividadeRecente)} />
              <MiniStat rotulo="Usuários recentes" valor={fmt(sysStats.usuariosRecentes)} />
            </div>
          </section>
        ) : null}
      </div>
      </details>
    </div>
  );
}

function DashboardSectionHeader({ id, eyebrow, titulo, descricao }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-l-4 border-cx-orange-bright py-0.5 pl-3 pr-0.5">
      <div>
        <p className="wb-eyebrow">{eyebrow}</p>
        <h2 id={id} className="mt-1 text-lg font-semibold tracking-[-0.025em] text-wb-text">{titulo}</h2>
      </div>
      <p className="max-w-xl text-right text-xs leading-relaxed text-wb-muted sm:text-sm">{descricao}</p>
    </div>
  );
}

function MiniStat({ rotulo, valor }) {
  return (
    <div className="rounded-xl border border-wb-border bg-wb-surface-2 px-3.5 py-3">
      <span className="text-[0.68rem] font-medium uppercase tracking-wide text-wb-muted">{rotulo}</span>
      <p className="font-tabular mt-0.5 text-lg font-bold text-wb-text">{valor}</p>
    </div>
  );
}
