"use client";

import { useState } from "react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatPercent = (value) => `${(value || 0).toFixed(2)}%`;

const inputClass =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-caixa-orange/50";
const labelClass = "mb-1 block text-xs font-medium text-white/50";

// Client Component: calculadora de financiamento (SAC/PRICE). O cálculo em
// si é feito pelo backend Go (POST /simulacoes/calcular) via proxy — este
// componente só coleta os dados e exibe o resultado.
export function SimuladorForm() {
  const [form, setForm] = useState({
    valor_imovel: "",
    valor_entrada: "",
    prazo_meses: "360",
    taxa_juros_anual: "9.37",
    sistema: "SAC",
  });
  const [resultado, setResultado] = useState(null);
  const [showTabela, setShowTabela] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const percentualEntrada =
    form.valor_imovel && form.valor_entrada
      ? ((parseFloat(form.valor_entrada) / parseFloat(form.valor_imovel)) * 100).toFixed(1)
      : "0.0";

  const calcular = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResultado(null);

    try {
      const res = await fetch("/api/backend/simulacoes/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor_imovel: parseFloat(form.valor_imovel),
          valor_entrada: parseFloat(form.valor_entrada),
          prazo_meses: parseInt(form.prazo_meses, 10),
          taxa_juros_anual: parseFloat(form.taxa_juros_anual),
          sistema: form.sistema,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || "Erro ao calcular simulação");

      setResultado(data?.data ?? data);
    } catch (err) {
      setError(err.message || "Erro ao calcular simulação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Simulador de Financiamento</h1>
        <p className="mt-1 text-sm text-white/40">Simule financiamentos com tabelas SAC e PRICE.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={calcular} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-1">
          <h2 className="mb-2 text-sm font-semibold text-white/70">Dados do Financiamento</h2>

          <div>
            <label className={labelClass}>Valor do Imóvel (R$)</label>
            <input
              type="number"
              name="valor_imovel"
              className={inputClass}
              value={form.valor_imovel}
              onChange={handleChange}
              placeholder="300000"
            />
          </div>

          <div>
            <label className={labelClass}>Valor de Entrada (R$) — {percentualEntrada}%</label>
            <input
              type="number"
              name="valor_entrada"
              className={inputClass}
              value={form.valor_entrada}
              onChange={handleChange}
              placeholder="60000"
            />
          </div>

          <div>
            <label className={labelClass}>Prazo (meses)</label>
            <input
              type="number"
              name="prazo_meses"
              className={inputClass}
              value={form.prazo_meses}
              onChange={handleChange}
              min="12"
              max="420"
            />
          </div>

          <div>
            <label className={labelClass}>Taxa de Juros Anual (%)</label>
            <input
              type="number"
              step="0.01"
              name="taxa_juros_anual"
              className={inputClass}
              value={form.taxa_juros_anual}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className={labelClass}>Sistema de Amortização</label>
            <div className="flex gap-2">
              {["SAC", "PRICE"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, sistema: s }))}
                  className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                    form.sistema === s
                      ? "border-caixa-orange/50 bg-caixa-orange/20 text-caixa-orange"
                      : "border-white/10 bg-white/5 text-white/40 hover:text-white/70"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !form.valor_imovel || !form.valor_entrada}
            className="w-full rounded-md bg-caixa-orange py-2.5 text-sm font-semibold text-white hover:bg-caixa-orange/90 disabled:opacity-40"
          >
            {loading ? "Calculando..." : "Calcular Simulação"}
          </button>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </form>

        <div className="space-y-4 lg:col-span-2">
          {resultado ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <ResultCard label="Primeira Parcela" value={formatCurrency(resultado.primeira_parcela)} />
                <ResultCard label="Última Parcela" value={formatCurrency(resultado.ultima_parcela)} />
                <ResultCard label="Total Pago" value={formatCurrency(resultado.total_pago)} />
                <ResultCard label="Total de Juros" value={formatCurrency(resultado.total_juros)} />
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <ResultCard label="Valor Financiado" value={formatCurrency(resultado.valor_financiado)} />
                <ResultCard label="Taxa Mensal" value={formatPercent((resultado.taxa_mensal || 0) * 100)} />
                <ResultCard label="Renda Mínima (30%)" value={formatCurrency(resultado.renda_minima)} />
              </div>

              {Array.isArray(resultado.parcelas) && resultado.parcelas.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <button
                    type="button"
                    onClick={() => setShowTabela(!showTabela)}
                    className="text-sm font-semibold text-white/70"
                  >
                    {showTabela ? "Ocultar" : "Mostrar"} Tabela de Amortização
                  </button>

                  {showTabela && (
                    <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-white/10">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-caixa-primary">
                          <tr className="text-white/40">
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-right">Parcela</th>
                            <th className="px-3 py-2 text-right">Amortização</th>
                            <th className="px-3 py-2 text-right">Juros</th>
                            <th className="px-3 py-2 text-right">Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultado.parcelas.map((p) => (
                            <tr key={p.numero} className="border-t border-white/5 text-white/70">
                              <td className="px-3 py-2">{p.numero}</td>
                              <td className="px-3 py-2 text-right font-medium text-white">
                                {formatCurrency(p.parcela)}
                              </td>
                              <td className="px-3 py-2 text-right text-emerald-400">
                                {formatCurrency(p.amortizacao)}
                              </td>
                              <td className="px-3 py-2 text-right text-red-400">{formatCurrency(p.juros)}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(p.saldo_devedor)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-white/10">
              <p className="text-sm text-white/30">
                Preencha os dados e clique em &quot;Calcular&quot; para ver os resultados.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <span className="text-xs font-medium text-white/40">{label}</span>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}
