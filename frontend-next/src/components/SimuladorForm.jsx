"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Percent, RotateCcw, Table2 } from "@/components/icons";
import { FormField, focarPrimeiroErro } from "@/components/ui/form-field";
import { MoneyInput } from "@/components/ui/money-input";
import { maskMoney as mascararDigitos, parseMoney } from "@/lib/masks";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

// toFixed() sempre devolve ponto decimal; em pt-BR o separador é vírgula.
const formatNumber = (value, digits) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value || 0);

const formatPercent = (value) => `${formatNumber(value, 2)}%`;

// Máscara de moeda pt-BR (@/lib/masks): dígitos entram pela direita em
// centavos (12 → 0,12 → 1,23). O state guarda number; a máscara é só tela.
const numeroParaMascara = (value) => (value > 0 ? mascararDigitos(String(Math.round(value * 100))) : "");

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
  const [taxaJurosAnual, setTaxaJurosAnual] = useState("9,37");
  const [sistema, setSistema] = useState("SAC");

  const [resultado, setResultado] = useState(null);
  const [showTabela, setShowTabela] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Erros só aparecem depois que a pessoa tenta avançar (não grita antes).
  const [tentou, setTentou] = useState(false);

  const valorFinanciado = Math.max(0, valorImovel - valorEntrada);
  const percentualEntrada = valorImovel > 0 ? (valorEntrada / valorImovel) * 100 : 0;
  const prazoNum = parseInt(prazoMeses, 10) || 0;
  // pt-BR: "1.000,5" → 1000.5 (antes virava 1%, em silêncio). Sem vírgula,
  // o ponto é o separador decimal ("9.37").
  const taxaTexto = String(taxaJurosAnual);
  const taxaNum = parseFloat(taxaTexto.includes(",") ? taxaTexto.replace(/\./g, "").replace(",", ".") : taxaTexto) || 0;

  // Validação por etapa, campo a campo. O botão fica sempre ativo: ao tocar
  // com algo faltando, o erro aparece embaixo do campo e o foco vai até ele.
  const errosEtapa1 = useMemo(() => {
    const e = {};
    if (valorImovel <= 0) e["valor-imovel"] = "Informe o valor do imóvel.";
    else if (valorEntrada >= valorImovel) e["valor-entrada"] = "A entrada precisa ser menor que o valor do imóvel.";
    return e;
  }, [valorImovel, valorEntrada]);

  const errosEtapa2 = useMemo(() => {
    const e = {};
    if (prazoNum < 12 || prazoNum > 420) e.prazo = "O prazo deve ficar entre 12 e 420 meses (1 a 35 anos).";
    if (taxaNum <= 0) e.taxa = "Informe os juros ao ano. Exemplo: 9,37";
    else if (taxaNum > 50) e.taxa = "Juros ao ano acima de 50% não existem em financiamento imobiliário. Confira o número.";
    return e;
  }, [prazoNum, taxaNum]);
  const erroVisivel = (id) => (tentou ? (etapa === 1 ? errosEtapa1 : errosEtapa2)[id] : undefined);

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
    setTentou(false);
    setEtapa(1);
  };

  const avancar = () => {
    const erros = etapa === 1 ? errosEtapa1 : errosEtapa2;
    if (Object.keys(erros).length) {
      setTentou(true);
      focarPrimeiroErro(erros, etapa === 1 ? ["valor-imovel", "valor-entrada"] : ["prazo", "taxa"]);
      return;
    }
    setTentou(false);
    if (etapa === 1) setEtapa(2);
    else calcular();
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
      <p className="crm-step-label" aria-live="polite">
        Etapa {etapa} de 3 · {ETAPAS[etapa - 1].titulo}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          {etapa === 1 && (
            <Card titulo="Sobre o imóvel" icone={Building2} passo="Etapa 1 de 3">
              <MoneyField
                id="valor-imovel"
                label="Valor do imóvel"
                error={erroVisivel("valor-imovel")}
                value={valorImovel}
                onChange={(v) => {
                  setValorImovel(v);
                  if (valorEntrada > v) setValorEntrada(0);
                }}
                autoFocus
                destaque
              />

              <MoneyField
                id="valor-entrada"
                label="Valor de entrada"
                error={erroVisivel("valor-entrada")}
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
                  <label htmlFor="entrada-pct" className="text-sm font-semibold text-cx-text">Ajustar entrada</label>
                  <span className="font-tabular text-xs text-cx-muted">
                    {formatNumber(percentualEntrada, 0)}%
                  </span>
                </div>
                <input
                  id="entrada-pct"
                  type="range"
                  min="0"
                  max="90"
                  step="1"
                  disabled={valorImovel <= 0}
                  value={Math.min(90, Math.round(percentualEntrada))}
                  onChange={(e) => setEntradaPorPercentual(Number(e.target.value))}
                  className="w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                />
                <div className="crm-choices mt-2">
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
                <FormField id="prazo" label="Prazo" error={erroVisivel("prazo")} semClonar>
                  <div className="crm-suffix">
                    <input
                      id="prazo"
                      type="text"
                      inputMode="numeric"
                      value={prazoMeses}
                      onChange={(e) => setPrazoMeses(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      aria-invalid={erroVisivel("prazo") ? true : undefined}
                      aria-describedby={erroVisivel("prazo") ? "prazo-erro" : undefined}
                    />
                    <span aria-hidden="true">meses</span>
                  </div>
                </FormField>
                <div className="crm-choices mt-2">
                  {PRAZOS_RAPIDOS.map((p) => (
                    <Chip key={p} ativo={prazoNum === p} onClick={() => setPrazoMeses(String(p))}>
                      {p / 12} anos
                    </Chip>
                  ))}
                </div>
              </div>

              <FormField id="taxa" label="Juros ao ano" hint="Use a taxa que o banco informou. Exemplo: 9,37" error={erroVisivel("taxa")} semClonar>
                <div className="crm-suffix">
                  <input
                    id="taxa"
                    type="text"
                    inputMode="decimal"
                    value={taxaJurosAnual}
                    onChange={(e) => setTaxaJurosAnual(e.target.value.replace(/[^\d,.]/g, ""))}
                    aria-invalid={erroVisivel("taxa") ? true : undefined}
                    aria-describedby={erroVisivel("taxa") ? "taxa-erro taxa-dica" : "taxa-dica"}
                  />
                  <span aria-hidden="true">% ao ano</span>
                </div>
              </FormField>

              <div>
                <p className="mb-2 text-sm font-semibold text-cx-text">Como as parcelas mudam</p>
                <div className="crm-options" role="radiogroup">
                  <SistemaOption
                    ativo={sistema === "SAC"}
                    onClick={() => setSistema("SAC")}
                    titulo="Parcelas que diminuem (SAC)"
                    descricao="Começa mais alta e cai todo mês. Paga menos juros no total."
                  />
                  <SistemaOption
                    ativo={sistema === "PRICE"}
                    onClick={() => setSistema("PRICE")}
                    titulo="Parcelas iguais (PRICE)"
                    descricao="O mesmo valor do começo ao fim. Mais fácil de planejar."
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
                              <td className="font-tabular px-3 py-2 text-right">
                                {formatCurrency(p.amortizacao)}
                              </td>
                              <td className="font-tabular px-3 py-2 text-right">
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
                disabled={loading}
                aria-busy={loading || undefined}
                className="cx-btn cx-btn-primary flex-1 sm:flex-none"
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
                  className="cx-btn cx-btn-primary"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Nova simulação
                </button>
              </>
            )}
          </div>

          {error && (
            <p className="crm-alert mt-3" data-tom="erro" role="alert">
              {error}
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
                <ResumoLinha label="Juros" valor={taxaNum ? `${formatNumber(taxaNum, 2)}% ao ano` : "—"} />
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
                <span className="block truncate text-xs text-cx-muted">{e.descricao}</span>
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
          <p className="text-xs text-cx-muted">{passo}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function MoneyField({ id, label, value, onChange, hint, error, autoFocus, destaque }) {
  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <MoneyInput
        grande={destaque}
        autoFocus={autoFocus}
        value={numeroParaMascara(value)}
        onChange={(v) => onChange(parseMoney(v))}
      />
    </FormField>
  );
}

function Chip({ children, ativo, disabled, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={!!ativo} className="crm-choice">
      {children}
    </button>
  );
}

function SistemaOption({ ativo, onClick, titulo, descricao }) {
  return (
    <button type="button" role="radio" onClick={onClick} aria-checked={ativo} className="crm-option">
      <span className="crm-option-mark">{ativo && <Check aria-hidden="true" />}</span>
      <span>
        <span className="crm-option-title">{titulo}</span>
        <span className="crm-option-desc">{descricao}</span>
      </span>
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
