"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Percent, RotateCcw, Table2 } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

// toFixed() sempre devolve ponto decimal; em pt-BR o separador é vírgula.
const formatNumber = (value, digits) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value || 0);

const formatPercent = (value) => `${formatNumber(value, 2)}%`;

// Máscara de moeda no padrão brasileiro: o usuário digita só dígitos e eles
// entram pela direita em centavos (12 → 0,12 → 1,23 → 12,34), que é como o
// simulador da Caixa e a maioria dos bancos se comporta. Guardamos o valor em
// state como number; a máscara é só apresentação.
const digitsToNumber = (str) => {
  const digits = String(str).replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
};

const maskMoney = (value) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    value || 0,
  );

const PRAZOS_RAPIDOS = [120, 180, 240, 300, 360, 420];

const ETAPAS = [
  { id: 1, titulo: "Imóvel", descricao: "Valor e entrada" },
  { id: 2, titulo: "Condições", descricao: "Prazo, juros e sistema" },
  { id: 3, titulo: "Resultado", descricao: "Sua simulação" },
];

// Client Component: simulador de financiamento em etapas, no espírito do
// simulador habitacional da Caixa — uma pergunta de cada vez, resumo sempre
// visível e resultado em destaque.
//
// O CÁLCULO continua sendo do backend Go (POST /simulacoes/calcular via proxy)
// e as entradas são exatamente as mesmas de antes (valor, entrada, prazo, taxa,
// sistema). Este componente mudou só de forma, não de contrato: nada de motor
// de elegibilidade / faixas MCMV aqui.
export function SimuladorForm() {
  const [etapa, setEtapa] = useState(1);
  const [valorImovel, setValorImovel] = useState(0);
  const [valorEntrada, setValorEntrada] = useState(0);
  const [prazoMeses, setPrazoMeses] = useState("360");
  const [taxaJurosAnual, setTaxaJurosAnual] = useState("9.37");
  const [sistema, setSistema] = useState("SAC");

  const [resultado, setResultado] = useState(null);
  const [showTabela, setShowTabela] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const valorFinanciado = Math.max(0, valorImovel - valorEntrada);
  const percentualEntrada = valorImovel > 0 ? (valorEntrada / valorImovel) * 100 : 0;
  const prazoNum = parseInt(prazoMeses, 10) || 0;
  const taxaNum = parseFloat(taxaJurosAnual) || 0;

  // Validação por etapa: o botão "Continuar" só libera quando a etapa atual
  // está consistente, então erro de digitação aparece antes de gastar um POST.
  const erroEtapa1 = useMemo(() => {
    if (valorImovel <= 0) return "Informe o valor do imóvel.";
    if (valorEntrada >= valorImovel) return "A entrada precisa ser menor que o valor do imóvel.";
    return "";
  }, [valorImovel, valorEntrada]);

  const erroEtapa2 = useMemo(() => {
    if (prazoNum < 12 || prazoNum > 420) return "O prazo deve ficar entre 12 e 420 meses.";
    if (taxaNum <= 0) return "Informe uma taxa de juros maior que zero.";
    return "";
  }, [prazoNum, taxaNum]);

  const setEntradaPorPercentual = (pct) => {
    setValorEntrada(Math.round(valorImovel * (pct / 100) * 100) / 100);
  };

  const calcular = async () => {
    setLoading(true);
    setError("");
    setResultado(null);

    try {
      const res = await fetch("/api/backend/simulacoes/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor_imovel: valorImovel,
          valor_entrada: valorEntrada,
          prazo_meses: prazoNum,
          taxa_juros_anual: taxaNum,
          sistema,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || "Erro ao calcular simulação");

      setResultado(data?.data ?? data);
      setEtapa(3);
    } catch (err) {
      setError(err.message || "Erro ao calcular simulação");
    } finally {
      setLoading(false);
    }
  };

  const recomecar = () => {
    setResultado(null);
    setShowTabela(false);
    setError("");
    setEtapa(1);
  };

  const avancar = () => {
    if (etapa === 1) {
      if (erroEtapa1) return;
      setEtapa(2);
      return;
    }
    if (etapa === 2) {
      if (erroEtapa2) return;
      calcular();
    }
  };

  return (
    <div className="cx-page min-h-full">
      <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-cx-blue sm:text-2xl">Simulador de Financiamento</h1>
        <p className="mt-1 text-sm text-cx-muted">
          Responda em três etapas e veja a prestação, o custo total e a tabela de amortização.
        </p>
      </header>

      <Stepper etapaAtual={etapa} />

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          {etapa === 1 && (
            <Card titulo="Sobre o imóvel" icone={Building2} passo="Etapa 1 de 3">
              <MoneyField
                label="Valor do imóvel"
                value={valorImovel}
                onChange={(v) => {
                  setValorImovel(v);
                  if (valorEntrada > v) setValorEntrada(0);
                }}
                autoFocus
                destaque
              />

              <MoneyField
                label="Valor de entrada"
                value={valorEntrada}
                onChange={setValorEntrada}
                hint={
                  valorImovel > 0
                    ? `${formatNumber(percentualEntrada, 1)}% do valor do imóvel`
                    : "Informe o valor do imóvel primeiro"
                }
              />

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-cx-muted">Ajustar entrada</span>
                  <span className="font-tabular text-xs text-cx-muted">
                    {formatNumber(percentualEntrada, 0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="1"
                  disabled={valorImovel <= 0}
                  value={Math.min(90, Math.round(percentualEntrada))}
                  onChange={(e) => setEntradaPorPercentual(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-cx-bg accent-cx-orange disabled:cursor-not-allowed disabled:opacity-40"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[10, 20, 30, 50].map((pct) => (
                    <Chip
                      key={pct}
                      ativo={Math.round(percentualEntrada) === pct}
                      disabled={valorImovel <= 0}
                      onClick={() => setEntradaPorPercentual(pct)}
                    >
                      {pct}%
                    </Chip>
                  ))}
                </div>
              </div>

              <Resumo label="Valor a financiar" valor={formatCurrency(valorFinanciado)} />
            </Card>
          )}

          {etapa === 2 && (
            <Card titulo="Condições do financiamento" icone={Percent} passo="Etapa 2 de 3">
              <div>
                <label className={labelClass} htmlFor="prazo">
                  Prazo
                </label>
                <div className="relative">
                  <input
                    id="prazo"
                    type="number"
                    inputMode="numeric"
                    min="12"
                    max="420"
                    value={prazoMeses}
                    onChange={(e) => setPrazoMeses(e.target.value)}
                    className={`${inputClass} pr-16`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cx-muted">
                    meses
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PRAZOS_RAPIDOS.map((p) => (
                    <Chip key={p} ativo={prazoNum === p} onClick={() => setPrazoMeses(String(p))}>
                      {p / 12} anos
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="taxa">
                  Taxa de juros anual
                </label>
                <div className="relative">
                  <input
                    id="taxa"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={taxaJurosAnual}
                    onChange={(e) => setTaxaJurosAnual(e.target.value)}
                    className={`${inputClass} pr-16`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cx-muted">
                    % a.a.
                  </span>
                </div>
              </div>

              <div>
                <span className={labelClass}>Sistema de amortização</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <SistemaOption
                    ativo={sistema === "SAC"}
                    onClick={() => setSistema("SAC")}
                    titulo="SAC"
                    descricao="Parcelas decrescentes. Paga menos juros no total."
                  />
                  <SistemaOption
                    ativo={sistema === "PRICE"}
                    onClick={() => setSistema("PRICE")}
                    titulo="PRICE"
                    descricao="Parcela fixa do começo ao fim. Previsível."
                  />
                </div>
              </div>

              <Resumo label="Valor a financiar" valor={formatCurrency(valorFinanciado)} />
            </Card>
          )}

          {etapa === 3 && resultado && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-cx-blue p-5 text-white">
                <span className="text-xs font-medium uppercase tracking-wide text-cx-muted">
                  {sistema === "SAC" ? "Primeira prestação" : "Prestação mensal"}
                </span>
                <p className="font-tabular mt-1 text-3xl font-bold text-cx-text sm:text-4xl">
                  {formatCurrency(resultado.primeira_parcela)}
                </p>
                <p className="mt-1.5 text-sm text-cx-muted">
                  {sistema === "SAC"
                    ? `Decresce até ${formatCurrency(resultado.ultima_parcela)} na última parcela.`
                    : "O valor se mantém igual durante todo o contrato."}
                </p>
                <p className="mt-3 text-xs text-cx-muted">
                  Renda mínima sugerida de {formatCurrency(resultado.renda_minima)}, considerando
                  comprometimento de até 30% da renda.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <ResultCard label="Valor financiado" value={formatCurrency(resultado.valor_financiado)} />
                <ResultCard label="Total pago" value={formatCurrency(resultado.total_pago)} />
                <ResultCard label="Total de juros" value={formatCurrency(resultado.total_juros)} />
                <ResultCard
                  label="Taxa mensal"
                  value={formatPercent((resultado.taxa_mensal || 0) * 100)}
                />
              </div>

              {Array.isArray(resultado.parcelas) && resultado.parcelas.length > 0 && (
                <div className="cx-card rounded-2xl p-5">
                  <button
                    type="button"
                    onClick={() => setShowTabela(!showTabela)}
                    className="flex items-center gap-2 text-sm font-semibold text-cx-text"
                  >
                    <Table2 className="h-4 w-4" aria-hidden="true" />
                    {showTabela ? "Ocultar" : "Mostrar"} tabela de amortização
                    <span className="text-xs font-normal text-cx-muted">
                      ({resultado.parcelas.length} parcelas)
                    </span>
                  </button>

                  {showTabela && (
                    <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-cx-border">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-cx-blue">
                          <tr className="text-cx-text">
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-right">Parcela</th>
                            <th className="px-3 py-2 text-right">Amortização</th>
                            <th className="px-3 py-2 text-right">Juros</th>
                            <th className="px-3 py-2 text-right">Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultado.parcelas.map((p) => (
                            <tr key={p.numero} className="border-t border-cx-border text-cx-muted">
                              <td className="px-3 py-2">{p.numero}</td>
                              <td className="font-tabular px-3 py-2 text-right font-medium text-cx-text">
                                {formatCurrency(p.parcela)}
                              </td>
                              <td className="font-tabular px-3 py-2 text-right text-emerald-700">
                                {formatCurrency(p.amortizacao)}
                              </td>
                              <td className="font-tabular px-3 py-2 text-right text-red-700">
                                {formatCurrency(p.juros)}
                              </td>
                              <td className="font-tabular px-3 py-2 text-right">
                                {formatCurrency(p.saldo_devedor)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-cx-muted">
                Simulação de caráter informativo. Os valores não constituem proposta de crédito nem
                garantem aprovação.
              </p>
            </div>
          )}

          {/* Navegação */}
          <div className="mt-4 flex items-center gap-3">
            {etapa > 1 && etapa < 3 && (
              <button
                type="button"
                onClick={() => setEtapa(etapa - 1)}
                className="inline-flex items-center gap-2 rounded-lg border border-cx-border px-4 py-2.5 text-sm font-medium text-cx-text hover:bg-cx-surface"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Voltar
              </button>
            )}

            {etapa < 3 && (
              <button
                type="button"
                onClick={avancar}
                disabled={loading || (etapa === 1 ? !!erroEtapa1 : !!erroEtapa2)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-cx-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-cx-orange-dark disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              >
                {loading ? "Calculando..." : etapa === 2 ? "Simular" : "Continuar"}
                {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}

            {etapa === 3 && (
              <>
                <button
                  type="button"
                  onClick={() => setEtapa(2)}
                  className="inline-flex items-center gap-2 rounded-lg border border-cx-border px-4 py-2.5 text-sm font-medium text-cx-text hover:bg-cx-surface"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Ajustar condições
                </button>
                <button
                  type="button"
                  onClick={recomecar}
                  className="inline-flex items-center gap-2 rounded-lg bg-cx-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-cx-orange-dark"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Nova simulação
                </button>
              </>
            )}
          </div>

          {(error || (etapa === 1 && erroEtapa1 && valorImovel > 0) || (etapa === 2 && erroEtapa2)) && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error || (etapa === 1 ? erroEtapa1 : erroEtapa2)}
            </p>
          )}
        </section>

        {/* Resumo lateral — acompanha o usuário nas três etapas, como o painel
            de acompanhamento do simulador da Caixa. */}
        <aside className="cx-card h-fit rounded-2xl p-5 lg:sticky lg:top-4">
          <h2 className="text-sm font-semibold text-cx-text">Resumo</h2>
          <dl className="mt-3 space-y-2.5">
            <ResumoLinha label="Valor do imóvel" valor={formatCurrency(valorImovel)} />
            <ResumoLinha
              label="Entrada"
              valor={`${formatCurrency(valorEntrada)}${
                valorImovel > 0 ? ` (${formatNumber(percentualEntrada, 1)}%)` : ""
              }`}
            />
            <ResumoLinha label="A financiar" valor={formatCurrency(valorFinanciado)} destaque />
            {etapa >= 2 && (
              <>
                <ResumoLinha
                  label="Prazo"
                  valor={prazoNum ? `${prazoNum} meses (${formatNumber(prazoNum / 12, 0)} anos)` : "—"}
                />
                <ResumoLinha label="Juros" valor={taxaNum ? `${formatNumber(taxaNum, 2)}% a.a.` : "—"} />
                <ResumoLinha label="Sistema" valor={sistema} />
              </>
            )}
          </dl>
        </aside>
      </div>
      </div>
    </div>
  );
}

/* ---------- Peças de UI ---------- */

const inputClass =
  "w-full rounded-lg border border-cx-border bg-cx-surface px-3 py-2.5 text-sm text-cx-text placeholder-[#9aa6b4] outline-none focus:border-cx-blue focus:ring-2 focus:ring-cx-blue/20";
const labelClass = "mb-1.5 block text-xs font-medium text-cx-muted";

function Stepper({ etapaAtual }) {
  return (
    <ol className="flex items-center gap-2">
      {ETAPAS.map((e, i) => {
        const concluida = etapaAtual > e.id;
        const ativa = etapaAtual === e.id;
        return (
          <li key={e.id} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ring-1 ${
                  concluida
                    ? "bg-cx-orange text-cx-text ring-cx-orange"
                    : ativa
                      ? "bg-cx-blue text-white ring-cx-blue"
                      : "bg-cx-surface text-cx-muted ring-cx-border"
                }`}
                aria-current={ativa ? "step" : undefined}
              >
                {concluida ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : e.id}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span
                  className={`block truncate text-xs font-semibold ${ativa ? "text-cx-text" : "text-cx-muted"}`}
                >
                  {e.titulo}
                </span>
                <span className="block truncate text-[0.65rem] text-cx-muted">{e.descricao}</span>
              </span>
            </div>
            {i < ETAPAS.length - 1 && (
              <span className="h-px flex-1 bg-cx-border" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Card({ titulo, icone: Icone, passo, children }) {
  return (
    <div className="cx-card space-y-4 rounded-2xl p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cx-blue-soft text-cx-blue">
          <Icone className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-cx-text">{titulo}</h2>
          <p className="text-[0.7rem] text-cx-muted">{passo}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function MoneyField({ label, value, onChange, hint, autoFocus, destaque }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-cx-muted">
          R$
        </span>
        <input
          type="text"
          inputMode="numeric"
          autoFocus={autoFocus}
          value={maskMoney(value)}
          onChange={(e) => onChange(digitsToNumber(e.target.value))}
          className={`${inputClass} font-tabular pl-10 ${destaque ? "py-3 text-lg font-semibold" : ""}`}
        />
      </div>
      {hint && <p className="mt-1.5 text-[0.7rem] text-cx-muted">{hint}</p>}
    </div>
  );
}

function Chip({ children, ativo, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        ativo
          ? "border-cx-orange bg-cx-orange text-cx-text"
          : "border-cx-border bg-cx-surface text-cx-muted hover:bg-cx-bg"
      }`}
    >
      {children}
    </button>
  );
}

function SistemaOption({ ativo, onClick, titulo, descricao }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-xl border p-3 text-left transition-colors ${
        ativo
          ? "border-cx-orange bg-cx-blue-soft"
          : "border-cx-border bg-cx-bg hover:bg-cx-surface"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-cx-text">
        <span
          className={`grid h-4 w-4 place-items-center rounded-full ring-1 ${
            ativo ? "bg-cx-orange ring-cx-orange" : "ring-cx-border"
          }`}
        >
          {ativo && <Check className="h-2.5 w-2.5 text-cx-text" aria-hidden="true" />}
        </span>
        {titulo}
      </span>
      <span className="mt-1 block text-[0.7rem] leading-relaxed text-cx-muted">{descricao}</span>
    </button>
  );
}

function Resumo({ label, valor }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-cx-border bg-cx-bg px-3.5 py-2.5">
      <span className="text-xs font-medium text-cx-muted">{label}</span>
      <span className="font-tabular text-base font-bold text-cx-text">{valor}</span>
    </div>
  );
}

function ResumoLinha({ label, valor, destaque }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-cx-muted">{label}</dt>
      <dd
        className={`font-tabular text-right text-xs ${
          destaque ? "text-sm font-bold text-cx-text" : "font-medium text-cx-muted"
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}

function ResultCard({ label, value }) {
  return (
    <div className="cx-card rounded-xl p-4">
      <span className="text-xs font-medium text-cx-muted">{label}</span>
      <p className="font-tabular mt-1 text-lg font-bold text-cx-text">{value}</p>
    </div>
  );
}
