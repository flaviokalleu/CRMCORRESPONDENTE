import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator,
  ExternalLink,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Calendar,
  Percent,
  User,
  ChevronDown,
  ChevronUp,
  History,
  X,
} from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

// ─── Formatação ───
const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatPercent = (value) =>
  `${(value || 0).toFixed(2)}%`;

// ─── Componente de Input ───
const InputField = ({ icon: Icon, label, ...props }) => (
  <div>
    <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-white/50">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </label>
    <input
      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-caixa-orange/50 focus:ring-1 focus:ring-caixa-orange/30"
      {...props}
    />
  </div>
);

// ─── Card de Resultado ───
const ResultCard = ({ icon: Icon, label, value, color = "text-white" }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <div className="flex items-center gap-2 text-white/40">
      <Icon className="h-4 w-4" />
      <span className="text-xs font-medium">{label}</span>
    </div>
    <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
  </div>
);

const SimuladorCaixa = () => {
  const [tab, setTab] = useState("calculadora"); // "calculadora" | "caixa"
  const [form, setForm] = useState({
    valor_imovel: "",
    valor_entrada: "",
    prazo_meses: "360",
    taxa_juros_anual: "9.37",
    sistema: "SAC",
    cliente_id: "",
    observacoes: "",
  });
  const [resultado, setResultado] = useState(null);
  const [showTabela, setShowTabela] = useState(false);
  const [tabelaRange, setTabelaRange] = useState([1, 12]);
  const [clientes, setClientes] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Buscar clientes para vincular simulação
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const { data } = await axios.get(`${API_URL}/clientes`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 500 },
        });
        const lista = data.clientes || data.data || data || [];
        setClientes(Array.isArray(lista) ? lista : []);
      } catch {
        // Silenciar — lista vazia é ok
      }
    };
    fetchClientes();
  }, []);

  // Buscar histórico quando seleciona cliente
  const fetchHistorico = useCallback(async (clienteId) => {
    if (!clienteId) { setHistorico([]); return; }
    try {
      const token = localStorage.getItem("authToken");
      const { data } = await axios.get(`${API_URL}/simulacoes/cliente/${clienteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistorico(data.data || []);
    } catch {
      setHistorico([]);
    }
  }, []);

  useEffect(() => {
    if (form.cliente_id) fetchHistorico(form.cliente_id);
  }, [form.cliente_id, fetchHistorico]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const calcular = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const token = localStorage.getItem("authToken");
      const { data } = await axios.post(`${API_URL}/simulacoes/calcular`, {
        valor_imovel: parseFloat(form.valor_imovel),
        valor_entrada: parseFloat(form.valor_entrada),
        prazo_meses: parseInt(form.prazo_meses),
        taxa_juros_anual: parseFloat(form.taxa_juros_anual),
        sistema: form.sistema,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setResultado(data.data);
      setTabelaRange([1, Math.min(12, parseInt(form.prazo_meses))]);
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Erro ao calcular" });
    } finally {
      setLoading(false);
    }
  };

  const salvar = async () => {
    if (!resultado) return;
    setSaving(true);
    setMsg(null);
    try {
      const token = localStorage.getItem("authToken");
      await axios.post(`${API_URL}/simulacoes`, {
        cliente_id: form.cliente_id || null,
        valor_imovel: parseFloat(form.valor_imovel),
        valor_entrada: parseFloat(form.valor_entrada),
        prazo_meses: parseInt(form.prazo_meses),
        taxa_juros_anual: parseFloat(form.taxa_juros_anual),
        sistema: form.sistema,
        observacoes: form.observacoes,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setMsg({ type: "success", text: "Simulação salva com sucesso!" });
      if (form.cliente_id) fetchHistorico(form.cliente_id);
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  };

  const deletarSimulacao = async (id) => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.delete(`${API_URL}/simulacoes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistorico((prev) => prev.filter((s) => s.id !== id));
    } catch { /* ignorar */ }
  };

  const percentualEntrada = form.valor_imovel && form.valor_entrada
    ? ((parseFloat(form.valor_entrada) / parseFloat(form.valor_imovel)) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Simulador de Financiamento</h1>
        <p className="mt-1 text-sm text-white/40">
          Simule financiamentos com tabelas SAC e PRICE
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTab("calculadora")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            tab === "calculadora"
              ? "bg-caixa-orange text-white shadow-lg shadow-caixa-orange/20"
              : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Calculator className="h-4 w-4" />
          Calculadora
        </button>
        <button
          onClick={() => setTab("caixa")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            tab === "caixa"
              ? "bg-caixa-orange text-white shadow-lg shadow-caixa-orange/20"
              : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
          }`}
        >
          <ExternalLink className="h-4 w-4" />
          Simulador Caixa
        </button>
      </div>

      {/* Mensagem */}
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
              msg.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {msg.text}
            <button onClick={() => setMsg(null)}><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab: Calculadora Própria */}
      {tab === "calculadora" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Formulário */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-4 text-sm font-semibold text-white/70">Dados do Financiamento</h2>

              <div className="space-y-3">
                <InputField
                  icon={DollarSign}
                  label="Valor do Imóvel (R$)"
                  name="valor_imovel"
                  type="number"
                  placeholder="300000"
                  value={form.valor_imovel}
                  onChange={handleChange}
                />
                <InputField
                  icon={DollarSign}
                  label={`Valor de Entrada (R$) — ${percentualEntrada}%`}
                  name="valor_entrada"
                  type="number"
                  placeholder="60000"
                  value={form.valor_entrada}
                  onChange={handleChange}
                />
                <InputField
                  icon={Calendar}
                  label="Prazo (meses)"
                  name="prazo_meses"
                  type="number"
                  placeholder="360"
                  value={form.prazo_meses}
                  onChange={handleChange}
                  min="12"
                  max="420"
                />
                <InputField
                  icon={Percent}
                  label="Taxa de Juros Anual (%)"
                  name="taxa_juros_anual"
                  type="number"
                  step="0.01"
                  placeholder="9.37"
                  value={form.taxa_juros_anual}
                  onChange={handleChange}
                />

                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-white/50">
                    Sistema de Amortização
                  </label>
                  <div className="flex gap-2">
                    {["SAC", "PRICE"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setForm((prev) => ({ ...prev, sistema: s }))}
                        className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${
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
                  onClick={calcular}
                  disabled={loading || !form.valor_imovel || !form.valor_entrada}
                  className="w-full rounded-lg bg-caixa-orange py-3 text-sm font-semibold text-white shadow-lg shadow-caixa-orange/20 transition-all hover:bg-caixa-orange/90 disabled:opacity-40"
                >
                  {loading ? "Calculando..." : "Calcular Simulação"}
                </button>
              </div>
            </div>

            {/* Vincular a Cliente + Salvar */}
            {resultado && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="mb-4 text-sm font-semibold text-white/70">Salvar Simulação</h2>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-white/50">
                      <User className="h-3.5 w-3.5" />
                      Vincular a Cliente (opcional)
                    </label>
                    <select
                      name="cliente_id"
                      value={form.cliente_id}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-caixa-orange/50"
                    >
                      <option value="">Nenhum cliente</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.cpf ? `- ${c.cpf}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 text-xs font-medium text-white/50">Observações</label>
                    <textarea
                      name="observacoes"
                      value={form.observacoes}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Anotações sobre a simulação..."
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-caixa-orange/50"
                    />
                  </div>

                  <button
                    onClick={salvar}
                    disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-40"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Salvando..." : "Salvar Simulação"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Resultados */}
          <div className="lg:col-span-2 space-y-4">
            {resultado ? (
              <>
                {/* Cards de Resumo */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <ResultCard
                    icon={TrendingDown}
                    label="Primeira Parcela"
                    value={formatCurrency(resultado.primeira_parcela)}
                    color="text-caixa-orange"
                  />
                  <ResultCard
                    icon={TrendingUp}
                    label="Última Parcela"
                    value={formatCurrency(resultado.ultima_parcela)}
                  />
                  <ResultCard
                    icon={DollarSign}
                    label="Total Pago"
                    value={formatCurrency(resultado.total_pago)}
                  />
                  <ResultCard
                    icon={Percent}
                    label="Total de Juros"
                    value={formatCurrency(resultado.total_juros)}
                    color="text-red-400"
                  />
                </div>

                {/* Info adicional */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <ResultCard
                    icon={DollarSign}
                    label="Valor Financiado"
                    value={formatCurrency(resultado.valor_financiado)}
                  />
                  <ResultCard
                    icon={Percent}
                    label="Taxa Mensal"
                    value={formatPercent(resultado.taxa_mensal * 100)}
                  />
                  <ResultCard
                    icon={User}
                    label="Renda Mínima (30%)"
                    value={formatCurrency(resultado.renda_minima)}
                    color="text-amber-400"
                  />
                </div>

                {/* Gráfico simplificado — barra de proporção */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="mb-3 text-sm font-semibold text-white/70">Composição do Pagamento</h3>
                  <div className="flex h-8 overflow-hidden rounded-lg">
                    <div
                      className="bg-caixa-orange/80 flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(resultado.valor_financiado / resultado.total_pago) * 100}%` }}
                    >
                      Principal
                    </div>
                    <div
                      className="bg-red-500/60 flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(resultado.total_juros / resultado.total_pago) * 100}%` }}
                    >
                      Juros
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-white/40">
                    <span>Principal: {formatCurrency(resultado.valor_financiado)}</span>
                    <span>Juros: {formatCurrency(resultado.total_juros)}</span>
                  </div>
                </div>

                {/* Tabela de Amortização */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <button
                    onClick={() => setShowTabela(!showTabela)}
                    className="flex w-full items-center justify-between text-sm font-semibold text-white/70"
                  >
                    <span>Tabela de Amortização</span>
                    {showTabela ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <AnimatePresence>
                    {showTabela && resultado.parcelas && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
                          <span>Exibindo parcelas</span>
                          <input
                            type="number"
                            min={1}
                            max={resultado.parcelas.length}
                            value={tabelaRange[0]}
                            onChange={(e) => setTabelaRange([parseInt(e.target.value) || 1, tabelaRange[1]])}
                            className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-center text-white"
                          />
                          <span>a</span>
                          <input
                            type="number"
                            min={1}
                            max={resultado.parcelas.length}
                            value={tabelaRange[1]}
                            onChange={(e) => setTabelaRange([tabelaRange[0], parseInt(e.target.value) || 12])}
                            className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-center text-white"
                          />
                          <span>de {resultado.parcelas.length}</span>
                        </div>

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
                              {resultado.parcelas
                                .slice(tabelaRange[0] - 1, tabelaRange[1])
                                .map((p) => (
                                  <tr key={p.numero} className="border-t border-white/5 text-white/70 hover:bg-white/5">
                                    <td className="px-3 py-2">{p.numero}</td>
                                    <td className="px-3 py-2 text-right font-medium text-white">{formatCurrency(p.parcela)}</td>
                                    <td className="px-3 py-2 text-right text-emerald-400">{formatCurrency(p.amortizacao)}</td>
                                    <td className="px-3 py-2 text-right text-red-400">{formatCurrency(p.juros)}</td>
                                    <td className="px-3 py-2 text-right">{formatCurrency(p.saldo_devedor)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-white/10">
                <div className="text-center">
                  <Calculator className="mx-auto h-12 w-12 text-white/10" />
                  <p className="mt-3 text-sm text-white/30">
                    Preencha os dados e clique em "Calcular" para ver os resultados
                  </p>
                </div>
              </div>
            )}

            {/* Histórico de Simulações do Cliente */}
            {form.cliente_id && historico.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <button
                  onClick={() => setShowHistorico(!showHistorico)}
                  className="flex w-full items-center justify-between text-sm font-semibold text-white/70"
                >
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Simulações ({historico.length})
                  </span>
                  {showHistorico ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <AnimatePresence>
                  {showHistorico && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 space-y-2 overflow-hidden"
                    >
                      {historico.map((sim) => (
                        <div
                          key={sim.id}
                          className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3"
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-white">
                              {formatCurrency(sim.valor_imovel)} — {sim.sistema} {sim.prazo_meses}m
                            </p>
                            <p className="text-xs text-white/40">
                              Parcela: {formatCurrency(sim.primeira_parcela)} | Taxa: {sim.taxa_juros_anual}% a.a.
                              {sim.observacoes && ` | ${sim.observacoes}`}
                            </p>
                            <p className="text-[10px] text-white/20">
                              {new Date(sim.created_at).toLocaleDateString("pt-BR")}
                              {sim.user && ` por ${sim.user.first_name}`}
                            </p>
                          </div>
                          <button
                            onClick={() => deletarSimulacao(sim.id)}
                            className="rounded p-1.5 text-white/20 transition-colors hover:bg-red-500/20 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Simulador Caixa (iframe) */}
      {tab === "caixa" && (
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
              <iframe
                src="https://www8.caixa.gov.br/siopiinternet-web/simulaOperacaoInternet.do?method=inicializarCasoUso"
                title="Simulador Caixa Econômica Federal"
                className="h-[80vh] w-full"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
            <p className="mt-2 text-xs text-white/20">
              Simulador oficial da Caixa Econômica Federal. Os resultados podem variar conforme análise de crédito.
            </p>
          </div>

          {/* Painel lateral para anotar resultados do simulador da Caixa */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-4 text-sm font-semibold text-white/70">
                Anotar Resultado
              </h2>
              <p className="mb-4 text-xs text-white/30">
                Anote os resultados do simulador da Caixa e salve vinculado ao cliente
              </p>
              <div className="space-y-3">
                <InputField
                  icon={DollarSign}
                  label="Valor do Imóvel"
                  name="valor_imovel"
                  type="number"
                  value={form.valor_imovel}
                  onChange={handleChange}
                />
                <InputField
                  icon={DollarSign}
                  label="Valor de Entrada"
                  name="valor_entrada"
                  type="number"
                  value={form.valor_entrada}
                  onChange={handleChange}
                />
                <InputField
                  icon={Calendar}
                  label="Prazo (meses)"
                  name="prazo_meses"
                  type="number"
                  value={form.prazo_meses}
                  onChange={handleChange}
                />
                <InputField
                  icon={Percent}
                  label="Taxa Juros Anual (%)"
                  name="taxa_juros_anual"
                  type="number"
                  step="0.01"
                  value={form.taxa_juros_anual}
                  onChange={handleChange}
                />
                <div>
                  <label className="mb-1 text-xs font-medium text-white/50">Sistema</label>
                  <select
                    name="sistema"
                    value={form.sistema}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="SAC">SAC</option>
                    <option value="PRICE">PRICE</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-white/50">
                    <User className="h-3.5 w-3.5" />
                    Cliente
                  </label>
                  <select
                    name="cliente_id"
                    value={form.cliente_id}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="">Nenhum</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 text-xs font-medium text-white/50">Observações</label>
                  <textarea
                    name="observacoes"
                    value={form.observacoes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Cole aqui os resultados do simulador da Caixa..."
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none"
                  />
                </div>
                <button
                  onClick={async () => {
                    await calcular();
                    await salvar();
                  }}
                  disabled={saving || !form.valor_imovel || !form.valor_entrada}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  Calcular e Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimuladorCaixa;
