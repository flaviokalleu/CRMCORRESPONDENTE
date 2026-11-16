import { KpisOperacao, ListasOperacao, BannerFinanciamento } from "@/components/dashboard/DashboardReferencia";
import Link from "next/link";
import { AlertTriangle, BarChart3, BellRing, CheckCircle2, Plus, UsersRound, Clock3 } from "@/components/icons";
import { apiGet } from "@/lib/api-server";
import { MetasGerenciais } from "@/components/dashboard/MetasGerenciais";
import { GraficoEvolucao } from "@/components/dashboard/GraficoEvolucao";
import { GraficoSemanal } from "@/components/dashboard/GraficoSemanal";
import { EsteiraResultado } from "@/components/dashboard/EsteiraResultado";
import { CentralAtencao } from "@/components/dashboard/CentralAtencao";
import { FluxoCaixaCard } from "@/components/dashboard/FluxoCaixaCard";
import { PortfolioCard } from "@/components/dashboard/PortfolioCard";
import { RankingEquipe } from "@/components/dashboard/RankingEquipe";
import { BlocoCarteira, BlocoRitmo, PainelTaxas } from "@/components/dashboard/PaineisPapel";
import { PrimeirosPassos } from "@/components/dashboard/PrimeirosPassos";

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

  const papel = isSuperAdmin ? "Super admin" : isAdmin ? "Administrador" : isCorrespondente ? "Correspondente" : isCorretor ? "Corretor" : "Equipe";
  const teamMap = new Map();
  for (const member of [...asList(corretoresData), ...asList(correspondentesData)]) {
    if (!member?.id) continue;
    const nome = `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() || member.username || member.email;
    teamMap.set(String(member.id), { id: String(member.id), nome });
  }
  const responsavelNome = teamMap.get(responsavel)?.nome ?? "Toda a equipe";

  const total = main.totalCount ?? main.totalClientes ?? 0;
  // Sem nenhum cliente (e sem filtro de responsável), números e gráficos
  // seriam só zeros: no lugar, um convite para o primeiro cadastro.
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
    ? `${fmt(slaResumo.vencidos)} ${slaResumo.vencidos === 1 ? "cliente passou" : "clientes passaram"} do prazo de ${sla} dias.`
    : aguardando > 0
      ? `${fmt(aguardando)} ${aguardando === 1 ? "cliente pede" : "clientes pedem"} retorno, todos dentro do prazo.`
      : "Tudo em dia — nenhum cliente esperando retorno.";

  const acoes = isCorrespondente
    ? [{ label: "Abrir fila", href: filaHref, icone: "fila", primaria: true }, { label: "Novo cliente", href: "/clientes/adicionar", icone: "adicionar" }]
    : isAdmin
      ? [{ label: "Novo cliente", href: "/clientes/adicionar", icone: "adicionar", primaria: true }, { label: "Ver relatório", href: "/relatorio", icone: "relatorio" }]
      : [{ label: "Novo cliente", href: "/clientes/adicionar", icone: "adicionar", primaria: true }, { label: "Ver carteira", href: carteiraHref, icone: "carteira" }];

  const vitais = [
    {
      rotulo: isCorretor ? "Minha carteira" : "Clientes na carteira",
      valor: fmt(total),
      detalhe: responsavelNome,
      href: carteiraHref,
      icone: "carteira",
    },
    {
      rotulo: "Novos no período",
      valor: fmt(totalPeriodo),
      detalhe: period.label,
      href: carteiraHref,
      icone: "atividade",
      tom: "info",
    },
    {
      rotulo: "Taxa de aprovação",
      valor: fmtPct(taxaAprovacao),
      detalhe: decisoes ? `${fmt(aprovados)} de ${fmt(decisoes)} decisões` : "sem decisões concluídas",
      href: funilHref,
      icone: "aprovacao",
      tom: taxaAprovacao == null ? "info" : taxaAprovacao >= meta ? "bom" : "atencao",
    },
    {
      rotulo: "Casos concluídos",
      valor: fmtPct(taxaResolucao),
      detalhe: `${fmt(aprovados + reprovados)} de ${fmt(totalPeriodo)} entradas`,
      href: funilHref,
      icone: "relatorio",
      tom: "info",
    },
    {
      rotulo: "Fora do prazo",
      valor: fmt(slaResumo.vencidos),
      detalhe: `${fmt(aguardando)} na fila atual`,
      href: "#alertas",
      icone: "fila",
      tom: slaResumo.vencidos > 0 ? "ruim" : "bom",
    },
  ];


  const ICONE_ACAO = { adicionar: Plus, relatorio: BarChart3, fila: Clock3, carteira: UsersRound };
  // Primária por último, como no cabeçalho de página do kit.
  const acoesOrdenadas = [...acoes].sort((x, y) => Number(!!x.primaria) - Number(!!y.primaria));
  const tomDestaque = slaResumo.vencidos > 0 ? "danger" : aguardando > 0 ? "warning" : "success";
  const IconeDestaque = slaResumo.vencidos > 0 ? AlertTriangle : aguardando > 0 ? BellRing : CheckCircle2;

  return (
    <div id="dashboard-print-root" className="wb-page min-h-full">
      <div className="ref-dashboard">
        {/* Cabeçalho de página */}
        <section className="ref-welcome">
          <div>
            <h1>Dashboard</h1>
            <p>{saudacao}, {user.first_name || "bem-vindo"}! {dataFormatada} · atualizado às {horaAtualizada}.</p>
          </div>
          {/* Sem clientes, o PainelVazio já traz a ação principal: uma só por tela. */}
          {(responsavel || total > 0) && <div className="dash-actions">
            {acoesOrdenadas.map(({ label, href, icone, primaria }) => {
              const Icone = ICONE_ACAO[icone] || Plus;
              return (
                <Link key={label} href={href} className={primaria ? "cx-btn cx-btn-primary" : "cx-btn cx-btn-outline"}>
                  <Icone className="h-4 w-4" aria-hidden="true" /> {label}
                </Link>
              );
            })}
          </div>}
        </section>

        {/* Imobiliária nova: o que fazer primeiro (some quando tudo estiver feito). */}
        {isAdmin && <PrimeirosPassos tenantId={user.tenant_id} />}

        {!responsavel && total === 0 ? (
          <PainelVazio podeCadastrar={!isCorrespondente} />
        ) : (<>
        {/* Indicadores: operação e metas, 4 por linha (acima dos gráficos) */}
        <KpisOperacao main={main} propostas={propostasData == null ? null : asList(propostasData)} total={total} carteiraHref={carteiraHref} responsavelNome={responsavelNome} />
        <MetasGerenciais aprovacao={taxaAprovacao} resolucao={taxaResolucao} meta={meta} slaResumo={slaResumo} alertas={activeAlerts} totalPeriodo={totalPeriodo} />

        <p role="status" className={`dash-alert dash-alert-${tomDestaque}`}>
          <IconeDestaque className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{destaque}</span>
          {activeAlerts > 0 ? <a href="#alertas">Ver quem espera retorno</a> : null}
        </p>

        {/* Gráficos grandes, no painel escuro */}
        <section aria-labelledby="desempenho-title" className="dash-section">
          <DashboardSectionHeader id="desempenho-title" titulo="Desempenho" descricao={`Ritmo, conversão e desfecho · ${period.label.toLowerCase()} com comparação equivalente.`} />
          <div className="dash-charts">
            <GraficoEvolucao
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


        <section aria-labelledby="prioridades-title" className="dash-section">
          <DashboardSectionHeader id="prioridades-title" titulo="Prioridades e responsáveis" descricao="Uma fila única, ordenada pelo risco de prazo e pronta para ação." />
          <CentralAtencao clientes={filaClientes} alertas={avisos} sla={sla} href={filaHref} />
        </section>

        <section aria-labelledby="dia-title" className="dash-section">
          <DashboardSectionHeader id="dia-title" titulo="Operação do dia" descricao="Quem entrou, o que vence e o que está disponível para oferecer." />
          <ListasOperacao imoveis={listaImoveis} tarefas={!(isAdmin || isCorrespondente) || tarefasData == null ? null : asList(tarefasData)} recentes={recentesData == null ? null : asList(recentesData)} />
        </section>

        <section aria-labelledby="negocio-title" className="dash-section">
          <DashboardSectionHeader id="negocio-title" titulo={isAdmin ? "Caixa, portfólio e equipe" : "Carteira e oportunidades"} descricao="Visão integrada do que sustenta o próximo resultado." />
          <div className="dash-negocio">
            {isAdmin ? (
              <FluxoCaixaCard fluxo={fluxo} periodoLabel={period.label} />
            ) : isCorrespondente ? (
              <BlocoRitmo entradasPeriodo={totalPeriodo} periodoLabel={period.label} taxaAprovacao={taxaAprovacao} aguardando={aguardando} />
            ) : (
              <BlocoCarteira total={total} esteMes={main.clientesEsteMes} aguardando={aguardando} imoveisDisponiveis={imoveisDisponiveis} />
            )}
            <PortfolioCard
              imoveisTotal={listaImoveis?.length ?? null}
              imoveisDisponiveis={imoveisDisponiveis}
              contratosAluguel={listaAlugueis?.length ?? null}
              renda={main.rendaAnalysis}
              indisponivel={listaImoveis == null || listaAlugueis == null}
            />
            {isAdmin ? (
              <RankingEquipe usuarios={analytics?.topUsuarios} periodoLabel={period.label} />
            ) : (
              <PainelTaxas taxaAprovacao={taxaAprovacao} taxaResolucao={taxaResolucao} taxaRejeicao={taxaRejeicao} />
            )}
          </div>
        </section>

        {isSuperAdmin && sysStats ? (
          <section className="dash-section wb-panel p-6">
            <DashboardSectionHeader titulo="Visão global da instalação" descricao="Indicadores exclusivos da administração da plataforma." />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat rotulo="Registros" valor={fmt(sysStats.totalRegistros)} />
              <MiniStat rotulo="Usuários" valor={fmt(sysStats.totalUsuarios)} />
              <MiniStat rotulo="Atividade recente" valor={fmt(sysStats.atividadeRecente)} />
              <MiniStat rotulo="Usuários recentes" valor={fmt(sysStats.usuariosRecentes)} />
            </div>
          </section>
        ) : null}

        </>)}

        <BannerFinanciamento />
      </div>
    </div>
  );
}

// Painel ainda sem clientes: explica o que vai aparecer e oferece UMA ação.
function PainelVazio({ podeCadastrar }) {
  return (
    <section className="dash-vazio crm-card" aria-labelledby="dash-vazio-titulo">
      <h2 id="dash-vazio-titulo">Seu painel ganha vida com o primeiro cliente</h2>
      <p>
        Assim que você cadastrar clientes, aparecem aqui quantos estão em atendimento, quem espera retorno,
        a taxa de aprovação e a evolução mês a mês.
      </p>
      {podeCadastrar && (
        <Link href="/clientes/adicionar" className="cx-btn cx-btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" /> Cadastrar primeiro cliente
        </Link>
      )}
    </section>
  );
}

// Título de seção no padrão do kit: título forte e descrição esmaecida.
function DashboardSectionHeader({ id, titulo, descricao }) {
  return (
    <div className="dash-section-head">
      <h2 id={id}>{titulo}</h2>
      {descricao ? <p>{descricao}</p> : null}
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
