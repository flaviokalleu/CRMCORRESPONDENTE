import Link from "next/link";
import {
  Users, CheckCircle2, Clock3, Percent, Wallet, TrendingUp, TrendingDown,
  Inbox, AlertTriangle, RefreshCw, Lightbulb, ExternalLink, Download, Plus,
  FileCheck2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TONE_SOFT, TONE_INK } from "@/lib/cliente-status";
import { cn } from "@/lib/utils";
import { SerieTemporalChart, RoscaChart, FunilChart, RankingBars } from "@/components/RelatorioCharts";

// Server Component: monta a tela de Relatórios a partir do JSON REAL de
// `/api/report/relatorio/dados` (backend-go/internal/modules/relatorios/
// analytics.go). Nenhum número aqui é inventado — o que o mockup mostrava e a
// API não tem (contratos fechados, valor em vendas, últimos contratos) foi
// deliberadamente OMITIDO em vez de simulado; ver relatorio-frontend.md para
// o mapeamento painel a painel.

const numeroPt = new Intl.NumberFormat("pt-BR");
const moedaPt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

// Agrupa um mapa {chave: contagem} em até `max` fatias por valor decrescente,
// somando o restante em "Outros" — evita o 6º matiz, que a paleta categórica
// do projeto (lib/chart-colors.js, CATEGORICAL) não cobre por decisão de
// design (comentário lá: "a 6ª série não vira cor gerada").
function distribuicaoOrdenada(mapa, max = 5) {
  const entradas = Object.entries(mapa || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (entradas.length === 0) return [];
  if (entradas.length <= max) return entradas.map(([label, valor]) => ({ label, valor }));
  const principais = entradas.slice(0, max - 1).map(([label, valor]) => ({ label, valor }));
  const resto = entradas.slice(max - 1).reduce((soma, [, v]) => soma + v, 0);
  return resto > 0 ? [...principais, { label: "Outros", valor: resto }] : principais;
}

// Top N sem agregação em "Outros" — usado no ranking, que é uma lista (não
// uma distribuição de 100%), então sobra sem contar não faz sentido mostrar.
function topN(mapa, n = 6) {
  return Object.entries(mapa || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, valor]) => ({ label, valor }));
}

// Variação percentual do total de clientes cadastrados no mês corrente vs. o
// anterior, DERIVADA de `tendencias` (a única série mensal que a API
// devolve) — nunca inventada. Só aparece quando os dois meses existem no
// array (o backend sempre manda 12 posições, mas ambas podem estar zeradas).
function variacaoMensal(tendencias) {
  if (!Array.isArray(tendencias) || tendencias.length < 2) return null;
  const atual = tendencias[tendencias.length - 1];
  const anterior = tendencias[tendencias.length - 2];
  if (!atual || !anterior) return null;
  if (anterior.total === 0) {
    if (atual.total === 0) return null;
    return { novo: true, positivo: true };
  }
  const variacao = Math.round(((atual.total - anterior.total) / anterior.total) * 100);
  return { novo: false, positivo: variacao >= 0, valor: variacao };
}

// Selo do ícone: cores de status (TONE_SOFT/TONE_INK, de cliente-status.js)
// não têm utilitária Tailwind própria — vêm por style inline, mesma solução
// já usada em PropostasManager (StatusPill). Quando a cor É uma utilitária
// existente (marca/neutro), usa-se a classe, não style: por isso este
// componente aceita as duas formas.
function StatCard({ icon: Icon, soft, ink, badgeClassName, valor, label, children }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-cx-border bg-cx-surface p-4">
      <span
        className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", badgeClassName)}
        style={badgeClassName ? undefined : { backgroundColor: soft, color: ink }}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums text-cx-text">{valor}</p>
        <p className="truncate text-xs text-cx-muted">{label}</p>
        {children}
      </div>
    </div>
  );
}

function PainelVazio({ Icon = Inbox, titulo, descricao, acao }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-cx-border bg-cx-surface p-10 text-center">
      <Icon className="size-8 text-cx-muted" aria-hidden="true" />
      <p className="text-sm font-medium text-cx-text">{titulo}</p>
      {descricao && <p className="text-xs text-cx-muted">{descricao}</p>}
      {acao}
    </div>
  );
}

function Cabecalho({ acoes = true }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-cx-text sm:text-2xl">Relatórios</h1>
        <p className="text-sm text-cx-muted">Acompanhe os indicadores da carteira de clientes e tome decisões com base em dados reais.</p>
      </div>
      {acoes && (
        <div className="flex flex-wrap items-center gap-2">
          {/* "Exportar" do mockup mapeado para as duas rotas reais que já
              existiam na página antiga (visualizar/baixar PDF) — nada novo,
              só reapresentado como botão com hover de verdade (o defeito
              original tinha hover idêntico ao estado normal). */}
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href="/api/backend/report/relatorio" target="_blank" rel="noreferrer" />}
            className="gap-2 border-cx-border text-cx-text"
          >
            <ExternalLink className="size-4" /> Visualizar online
          </Button>
          {/* <a> normal (não <Link>): é um download de arquivo via proxy do
              backend, não navegação entre páginas do app — next/link faria
              tentativa de transição client-side numa rota que não existe na
              árvore de páginas. Mesma exceção documentada já usada em
              PropostasManager.jsx para <img>. */}
          <Button
            nativeButton={false}
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            render={<a href="/api/backend/report/relatorio/download" />}
            className="gap-2 bg-cx-orange text-white hover:bg-cx-orange-dark"
          >
            <Download className="size-4" /> Baixar PDF
          </Button>
        </div>
      )}
    </div>
  );
}

export function RelatoriosDashboard({ dados, loadError }) {
  // Erro de carregamento (rede/servidor) — distinto de "carteira vazia".
  // `apiGet` devolve `null` nos dois casos de falha (fetch e status não-ok),
  // então tratamos qualquer `null` como erro e nunca como "zero clientes".
  if (loadError) {
    return (
      <div className="space-y-4">
        <Cabecalho acoes={false} />
        <PainelVazio
          Icon={AlertTriangle}
          titulo="Não foi possível carregar os relatórios"
          descricao="Verifique sua conexão e tente novamente."
          acao={(
            <Button nativeButton={false} render={<a href="/relatorio" />} className="gap-2 bg-cx-orange text-white hover:bg-cx-orange-dark">
              <RefreshCw className="size-4" /> Tentar novamente
            </Button>
          )}
        />
        <p role="alert" className="sr-only">Não foi possível carregar os relatórios. Tente novamente.</p>
      </div>
    );
  }

  const geral = dados?.geral || {};
  const total = geral.total || 0;

  // Vazio de verdade (carteira sem clientes) — mostra um convite, não cinco
  // cartões e seis gráficos zerados, que pareceriam quebrados.
  if (total === 0) {
    return (
      <div className="space-y-4">
        <Cabecalho acoes={false} />
        <PainelVazio
          titulo="Nenhum cliente cadastrado ainda"
          descricao="Assim que houver clientes na carteira, os indicadores aparecem aqui."
          acao={(
            <Button nativeButton={false} render={<Link href="/clientes/adicionar" />} className="gap-2 bg-cx-orange text-white hover:bg-cx-orange-dark">
              <Plus className="size-4" /> Cadastrar cliente
            </Button>
          )}
        />
      </div>
    );
  }

  const variacao = variacaoMensal(dados.tendencias);
  const origens = distribuicaoOrdenada(dados.origens);
  const tiposImovel = distribuicaoOrdenada(dados.tiposImovel);
  // Ranking substitui o "desempenho da equipe" do mockup (não existe
  // corretor por proposta nesta resposta): distribuição por profissão, a
  // dimensão de perfil mais parecida com "quem são essas pessoas".
  const profissoes = topN(dados.perfil?.profissao, 6);

  const funil = [
    { label: "Total de clientes", valor: geral.total, pct: 100 },
    { label: "Em análise", valor: geral.pendentes, pct: pct(geral.pendentes, geral.total) },
    { label: "Aprovados", valor: geral.aprovados, pct: pct(geral.aprovados, geral.total) },
  ];

  const documentos = [
    { label: "Documentos pessoais", valor: dados.documentos?.comDocumentosPessoais },
    { label: "Extrato bancário", valor: dados.documentos?.comExtratoBancario },
    { label: "Documentos de dependente", valor: dados.documentos?.comDocumentosDependente },
    { label: "Documentos de cônjuge", valor: dados.documentos?.comDocumentosConjuge },
  ];

  const recomendacoes = dados.recomendacoes || [];

  return (
    <div className="space-y-4">
      <Cabecalho />

      {/* Cartões de indicador — todos vêm de `geral`. A variação percentual
          (única do painel) é derivada de `tendencias` e só aparece quando há
          dois meses de dado real para comparar. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Users} badgeClassName="bg-cx-blue-soft text-cx-blue" valor={numeroPt.format(geral.total)} label="Total de clientes">
          {variacao && (
            <p className={cn("mt-1 flex items-center gap-1 text-[11px] font-semibold", variacao.positivo ? "text-wb-good" : "text-wb-bad")}>
              {variacao.positivo ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {variacao.novo ? "novo este mês" : `${variacao.positivo ? "+" : ""}${variacao.valor}% vs. mês anterior`}
            </p>
          )}
        </StatCard>
        <StatCard icon={CheckCircle2} soft={TONE_SOFT.positive} ink={TONE_INK.positive} valor={numeroPt.format(geral.aprovados)} label="Aprovados">
          <p className="mt-1 text-[11px] text-cx-muted">{geral.taxaAprovacao}% de taxa de aprovação</p>
        </StatCard>
        <StatCard icon={Clock3} soft={TONE_SOFT.attention} ink={TONE_INK.attention} valor={numeroPt.format(geral.pendentes)} label="Pendentes">
          <p className="mt-1 text-[11px] text-cx-muted">{pct(geral.pendentes, geral.total)}% da carteira</p>
        </StatCard>
        <StatCard icon={Percent} soft={TONE_SOFT.neutral} ink={TONE_INK.neutral} valor={`${geral.taxaAprovacao}%`} label="Taxa de aprovação">
          <p className="mt-1 text-[11px] text-cx-muted">{geral.taxaReprovacao}% de reprovação</p>
        </StatCard>
        <StatCard icon={Wallet} soft={TONE_SOFT.neutral} ink={TONE_INK.neutral} valor={moedaPt.format(geral.rendaMedia || 0)} label="Renda média">
          <p className="mt-1 text-[11px] text-cx-muted">{numeroPt.format(geral.clientesComRenda || 0)} com renda informada</p>
        </StatCard>
      </div>

      {/* Painéis — grade de 3 colunas no desktop, empilhado no celular. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="ring-cx-border bg-cx-surface p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-cx-text">Evolução de clientes</h2>
          <p className="text-xs text-cx-muted">Novos cadastros por mês, últimos 12 meses.</p>
          <div className="mt-3">
            <SerieTemporalChart tendencias={dados.tendencias} />
          </div>
        </Card>

        <Card className="ring-cx-border bg-cx-surface p-4">
          <h2 className="text-sm font-semibold text-cx-text">Clientes por origem</h2>
          <div className="mt-3">
            <RoscaChart dados={origens} totalLabel="clientes" vazioMsg="O campo de origem ainda não tem dados." />
          </div>
        </Card>

        <Card className="ring-cx-border bg-cx-surface p-4">
          <h2 className="text-sm font-semibold text-cx-text">Funil de conversão</h2>
          <div className="mt-4">
            <FunilChart etapas={funil} />
          </div>
        </Card>

        <Card className="ring-cx-border bg-cx-surface p-4">
          <h2 className="text-sm font-semibold text-cx-text">Interesse por tipo de imóvel</h2>
          <div className="mt-3">
            <RoscaChart dados={tiposImovel} totalLabel="clientes" vazioMsg="O campo de tipo de imóvel ainda não tem dados." />
          </div>
        </Card>

        <Card className="ring-cx-border bg-cx-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cx-text">Completude de documentos</h2>
            <FileCheck2 className="size-4 text-cx-muted" aria-hidden="true" />
          </div>
          <Table className="mt-2">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-0! text-[10px] font-semibold tracking-[0.1em] text-cx-muted uppercase">Documento</TableHead>
                <TableHead className="px-0! text-right text-[10px] font-semibold tracking-[0.1em] text-cx-muted uppercase">Completo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((d) => (
                <TableRow key={d.label} className="hover:bg-transparent">
                  <TableCell className="px-0! py-1.5! text-xs text-cx-text">{d.label}</TableCell>
                  <TableCell className="px-0! py-1.5! text-right text-xs font-semibold tabular-nums text-cx-text">{d.valor ?? 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="ring-cx-border bg-cx-surface p-4 lg:col-span-3">
          <h2 className="text-sm font-semibold text-cx-text">Clientes por profissão</h2>
          <p className="text-xs text-cx-muted">Top {profissoes.length || 0} profissões mais frequentes na carteira.</p>
          <div className="mt-3">
            <RankingBars itens={profissoes} />
          </div>
        </Card>
      </div>

      {/* Recomendações — o backend já calcula (Recomendacoes(a) em
          analytics.go); a página antiga nunca mostrava. */}
      <div className="flex flex-col gap-3 rounded-xl border border-cx-blue/20 bg-cx-blue-soft p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-cx-blue" aria-hidden="true" />
          <div className="min-w-0 text-sm text-cx-text">
            {recomendacoes.length > 0 ? (
              <ul className="list-disc space-y-1 pl-4">
                {recomendacoes.map((r) => <li key={r}>{r}</li>)}
              </ul>
            ) : (
              <p>Nenhuma recomendação no momento — os indicadores da carteira estão dentro do esperado.</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<a href="/api/backend/report/relatorio" target="_blank" rel="noreferrer" />}
          className="shrink-0 gap-2 border-cx-border bg-cx-surface text-cx-blue hover:bg-cx-bg"
        >
          Ver relatório completo <ExternalLink className="size-4" />
        </Button>
      </div>
    </div>
  );
}
