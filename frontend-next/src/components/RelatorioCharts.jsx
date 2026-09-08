"use client";

// Gráficos da tela de Relatórios, em SVG inline — não há biblioteca de
// gráficos no projeto (`grep recharts|chart package.json` não achou nada) e
// os dados são pequenos (12 meses, poucas categorias), então SVG evita somar
// peso ao bundle. Cores vêm de `lib/chart-colors.js` (paleta categórica já
// validada no projeto para o cartão branco — ver comentário lá) e dos tokens
// `cx-*`/`wb-*` do Tailwind; nada de cor solta aqui (skill `dataviz`).
import { useId, useState } from "react";
import { Inbox } from "lucide-react";
import { CATEGORICAL, CHART_CHROME } from "@/lib/chart-colors";
import { cn } from "@/lib/utils";

const numeroPt = new Intl.NumberFormat("pt-BR");

// Estado vazio compartilhado pelos três painéis de gráfico — mesma
// composição (ícone + texto) usada nas tabelas de ClientesLista/Propostas,
// para a tela inteira ter a mesma "família" de vazio.
function GraficoVazio({ mensagem }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center">
      <Inbox className="size-6 text-cx-muted" aria-hidden="true" />
      <p className="text-xs text-cx-muted">{mensagem}</p>
    </div>
  );
}

// Série temporal (evolução de clientes por mês) — área preenchida + linha.
// Interação: 12 botões HTML transparentes sobrepostos ao SVG (não `rect`
// dentro do próprio SVG) para o hover/foco funcionar com teclado sem truque
// de tabIndex em elemento SVG, que tem suporte inconsistente entre
// navegadores.
export function SerieTemporalChart({ tendencias }) {
  const [hover, setHover] = useState(null);
  const dados = tendencias || [];
  if (dados.length === 0) return <GraficoVazio mensagem="Sem histórico de clientes ainda." />;

  const W = 600;
  const H = 200;
  const padTop = 12;
  const padBottom = 24;
  const padX = 4;
  const plotH = H - padTop - padBottom;
  const max = Math.max(1, ...dados.map((d) => d.total));
  const n = dados.length;
  const xStep = n > 1 ? (W - padX * 2) / (n - 1) : 0;

  const pontos = dados.map((d, i) => ({
    ...d,
    x: padX + i * xStep,
    y: padTop + plotH - (d.total / max) * plotH,
  }));

  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const base = padTop + plotH;
  const area = `${linha} L${pontos[pontos.length - 1].x},${base} L${pontos[0].x},${base} Z`;

  // Só rotula o 1º, o meio e o último mês — 12 rótulos no eixo colidiriam
  // (grade recessiva: eixo não compete com o dado, regra da skill dataviz).
  const marcados = new Set([0, Math.floor((n - 1) / 2), n - 1]);
  const gradeY = [0, 0.5, 1];

  const ativo = hover !== null ? pontos[hover] : pontos[pontos.length - 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-48 w-full" role="img" aria-label="Evolução de clientes por mês">
        {gradeY.map((f) => (
          <line key={f} x1={padX} x2={W - padX} y1={padTop + plotH * (1 - f)} y2={padTop + plotH * (1 - f)} stroke={CHART_CHROME.gridline} strokeWidth="1" />
        ))}
        <path d={area} fill={CATEGORICAL[0]} fillOpacity="0.12" stroke="none" />
        <path d={linha} fill="none" stroke={CATEGORICAL[0]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Linha-guia + marcador do ponto em foco/hover. */}
        <line x1={ativo.x} x2={ativo.x} y1={padTop} y2={base} stroke={CHART_CHROME.axis} strokeWidth="1" strokeDasharray="2 2" />
        <circle cx={ativo.x} cy={ativo.y} r="4" fill="#ffffff" stroke={CATEGORICAL[0]} strokeWidth="2" />
        {pontos.map((p, i) => marcados.has(i) && (
          <text key={i} x={p.x} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="10" fill={CHART_CHROME.textMuted}>
            {mesLabel(p.mes)}
          </text>
        ))}
      </svg>
      {/* Faixas de hit-test acessíveis (foco por teclado + mouse), uma por mês. */}
      <div className="absolute inset-x-1 top-0 flex h-[calc(100%-24px)]">
        {pontos.map((p, i) => (
          <button
            key={p.mes}
            type="button"
            className="flex-1 outline-none"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={`${mesLabel(p.mes)}: ${numeroPt.format(p.total)} clientes`}
          />
        ))}
      </div>
      <div
        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg border border-cx-border bg-cx-surface px-2.5 py-1.5 text-xs whitespace-nowrap text-cx-text shadow-sm"
        style={{ left: `${(ativo.x / W) * 100}%`, top: `${(ativo.y / H) * 100}%` }}
      >
        <span className="block font-semibold capitalize">{mesLabel(ativo.mes)}</span>
        <span className="text-cx-muted">{numeroPt.format(ativo.total)} {ativo.total === 1 ? "cliente" : "clientes"}</span>
      </div>
    </div>
  );
}

function mesLabel(mes) {
  const [ano, m] = String(mes).split("-").map(Number);
  if (!ano || !m) return mes;
  return new Date(ano, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

// Rosca de distribuição (origem, tipo de imóvel) com legenda percentual.
// Anel desenhado com stroke-dasharray sobre um círculo — técnica padrão para
// donut em SVG puro. Cada fatia usa uma cor fixa da paleta categórica
// (nunca ciclada); "Outros" (agregado pelo chamador) usa o cinza neutro do
// chrome de gráficos, não uma cor de série.
export function RoscaChart({ dados, totalLabel, vazioMsg }) {
  const gapId = useId();
  const total = (dados || []).reduce((s, d) => s + d.valor, 0);
  if (!dados || dados.length === 0 || total === 0) return <GraficoVazio mensagem={vazioMsg} />;

  const R = 45;
  const CX = 60;
  const CY = 60;
  const circunferencia = 2 * Math.PI * R;
  const gap = 2.5; // folga entre fatias (regra "2px de folga" da skill dataviz)

  // `reduce` acumulando no próprio retorno (em vez de mutar uma variável de
  // fora do map): a regra react-hooks/immutability do compilador do React
  // proíbe reatribuir uma variável fechada por closure depois que a
  // renderização "terminou" de ler seu valor inicial.
  const fatias = dados.reduce((acc, d, i) => {
    const frac = d.valor / total;
    const comprimento = Math.max(frac * circunferencia - gap, 0);
    const acumulado = acc.length ? acc[acc.length - 1].acumulado : 0;
    const cor = d.label === "Outros" ? CHART_CHROME.textMuted : CATEGORICAL[i % CATEGORICAL.length];
    acc.push({ ...d, frac, comprimento, offset: -acumulado, acumulado: acumulado + frac * circunferencia, cor });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
      <svg viewBox="0 0 120 120" className="size-32 shrink-0" role="img" aria-label={`Distribuição: ${dados.map((d) => `${d.label} ${Math.round((d.valor / total) * 100)}%`).join(", ")}`}>
        <g transform="rotate(-90 60 60)">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={CHART_CHROME.gridline} strokeWidth="16" />
          {fatias.map((f) => (
            <circle
              key={gapId + f.label}
              cx={CX} cy={CY} r={R} fill="none"
              stroke={f.cor} strokeWidth="16" strokeLinecap="round"
              strokeDasharray={`${f.comprimento} ${circunferencia - f.comprimento}`}
              strokeDashoffset={f.offset}
            />
          ))}
        </g>
        <text x="60" y="56" textAnchor="middle" fontSize="20" fontWeight="700" fill={CHART_CHROME.textPrimary}>{numeroPt.format(total)}</text>
        <text x="60" y="72" textAnchor="middle" fontSize="10" fill={CHART_CHROME.textSecondary}>{totalLabel}</text>
      </svg>
      <ul className="w-full min-w-0 space-y-1.5">
        {fatias.map((f) => (
          <li key={f.label} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: f.cor }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-cx-text">{f.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-cx-muted">{Math.round(f.frac * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Funil de conversão — 3 etapas do MESMO total (não categorias distintas),
// por isso usa um único matiz (cx-blue) em opacidades decrescentes em vez da
// paleta categórica: a cor aqui segue a ordem/magnitude, não identidade.
const FUNIL_TONS = ["bg-cx-blue", "bg-cx-blue/70", "bg-cx-blue/45"];

export function FunilChart({ etapas }) {
  return (
    <ul className="space-y-3">
      {etapas.map((e, i) => (
        <li key={e.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-xs text-cx-muted">{e.label}</span>
          <span className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-cx-bg">
            <span
              className={cn("block h-full rounded-full", FUNIL_TONS[i % FUNIL_TONS.length])}
              style={{ width: `${Math.max(e.pct, e.valor > 0 ? 2 : 0)}%` }}
            />
          </span>
          <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-cx-text">{numeroPt.format(e.valor)}</span>
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-cx-muted">{e.pct}%</span>
        </li>
      ))}
    </ul>
  );
}

// Ranking horizontal (ex.: clientes por profissão) — barras de uma só cor,
// o comprimento é que carrega a magnitude (mesma leitura das barras de
// "Desempenho da equipe" do mockup, sem inventar avatar/pessoa que não existe
// nesta resposta de API).
export function RankingBars({ itens }) {
  if (!itens || itens.length === 0) return <GraficoVazio mensagem="Sem dados de perfil suficientes." />;
  const max = Math.max(...itens.map((i) => i.valor));
  return (
    <ul className="space-y-2.5">
      {itens.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs text-cx-text" title={item.label}>{item.label}</span>
          <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-cx-bg">
            <span className="block h-full rounded-full bg-cx-blue" style={{ width: `${max ? (item.valor / max) * 100 : 0}%` }} />
          </span>
          <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-cx-text">{numeroPt.format(item.valor)}</span>
        </li>
      ))}
    </ul>
  );
}
