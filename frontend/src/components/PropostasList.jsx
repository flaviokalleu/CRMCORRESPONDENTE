import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, DollarSign, User, Building2, Plus, X, Check, XCircle,
  ArrowRightLeft, Clock, AlertTriangle,
} from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";
const token = () => localStorage.getItem("authToken");
const headers = () => ({ Authorization: `Bearer ${token()}` });

const formatCurrency = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const STATUS_MAP = {
  pendente: { label: "Pendente", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock },
  em_negociacao: { label: "Em Negociação", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: ArrowRightLeft },
  aceita: { label: "Aceita", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: Check },
  recusada: { label: "Recusada", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
  expirada: { label: "Expirada", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: AlertTriangle },
  cancelada: { label: "Cancelada", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: X },
};

const FORMA_MAP = { financiamento: "Financiamento", a_vista: "À Vista", fgts: "FGTS", misto: "Misto" };

const PropostasList = () => {
  const [propostas, setPropostas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [imoveis, setImoveis] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    cliente_id: "", imovel_id: "", valor_ofertado: "", forma_pagamento: "financiamento",
    data_validade: "", condicoes: "", observacoes: "",
  });

  const fetchPropostas = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const { data } = await axios.get(`${API_URL}/propostas`, { headers: headers(), params });
      setPropostas(data.data || []);
    } catch { setPropostas([]); }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchPropostas(); }, [fetchPropostas]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [c, i] = await Promise.all([
          axios.get(`${API_URL}/clientes`, { headers: headers(), params: { limit: 500 } }),
          axios.get(`${API_URL}/imoveis`, { headers: headers() }),
        ]);
        setClientes(c.data.clientes || c.data.data || c.data || []);
        setImoveis(i.data.imoveis || i.data.data || i.data || []);
      } catch { /* */ }
    };
    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!form.cliente_id || !form.imovel_id || !form.valor_ofertado) return;
    try {
      await axios.post(`${API_URL}/propostas`, form, { headers: headers() });
      setShowForm(false);
      setForm({ cliente_id: "", imovel_id: "", valor_ofertado: "", forma_pagamento: "financiamento", data_validade: "", condicoes: "", observacoes: "" });
      fetchPropostas();
    } catch { /* */ }
  };

  const handleStatusUpdate = async (id, newStatus, extra = {}) => {
    try {
      await axios.put(`${API_URL}/propostas/${id}`, { status: newStatus, ...extra }, { headers: headers() });
      fetchPropostas();
    } catch { /* */ }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/propostas/${id}`, { headers: headers() });
      fetchPropostas();
    } catch { /* */ }
  };

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Propostas</h1>
          <p className="mt-1 text-sm text-white/40">Pipeline de ofertas de compra</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-caixa-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-caixa-orange/20 transition-all hover:bg-caixa-orange/90"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Fechar" : "Nova Proposta"}
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 overflow-hidden">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-4 text-sm font-semibold text-white/70">Nova Proposta</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/50">Cliente *</label>
                  <select value={form.cliente_id} onChange={(e) => setForm(p => ({ ...p, cliente_id: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-caixa-orange/50">
                    <option value="">Selecionar...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/50">Imóvel *</label>
                  <select value={form.imovel_id} onChange={(e) => setForm(p => ({ ...p, imovel_id: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-caixa-orange/50">
                    <option value="">Selecionar...</option>
                    {imoveis.map(i => <option key={i.id} value={i.id}>{i.nome_imovel || i.endereco} {i.valor_venda ? `- ${formatCurrency(i.valor_venda)}` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/50">Valor Ofertado (R$) *</label>
                  <input type="number" value={form.valor_ofertado} onChange={(e) => setForm(p => ({ ...p, valor_ofertado: e.target.value }))} placeholder="250000" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-caixa-orange/50" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/50">Forma de Pagamento</label>
                  <select value={form.forma_pagamento} onChange={(e) => setForm(p => ({ ...p, forma_pagamento: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-caixa-orange/50">
                    {Object.entries(FORMA_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/50">Validade</label>
                  <input type="date" value={form.data_validade} onChange={(e) => setForm(p => ({ ...p, data_validade: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-caixa-orange/50" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/50">Observações</label>
                  <input type="text" value={form.observacoes} onChange={(e) => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Detalhes da proposta..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-caixa-orange/50" />
                </div>
              </div>
              <button onClick={handleCreate} disabled={!form.cliente_id || !form.imovel_id || !form.valor_ofertado} className="mt-4 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-40">
                Criar Proposta
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setFilterStatus("")} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${!filterStatus ? "bg-caixa-orange/20 text-caixa-orange" : "bg-white/5 text-white/40 hover:text-white"}`}>Todas</button>
        {Object.entries(STATUS_MAP).map(([key, val]) => (
          <button key={key} onClick={() => setFilterStatus(key)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${filterStatus === key ? "bg-caixa-orange/20 text-caixa-orange" : "bg-white/5 text-white/40 hover:text-white"}`}>{val.label}</button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-caixa-orange border-t-transparent" /></div>
      ) : propostas.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-white/10">
          <div className="text-center">
            <FileText className="mx-auto h-10 w-10 text-white/10" />
            <p className="mt-2 text-sm text-white/30">Nenhuma proposta encontrada</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {propostas.map((p) => {
            const s = STATUS_MAP[p.status] || STATUS_MAP.pendente;
            const StatusIcon = s.icon;
            return (
              <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${s.color}`}>
                        <StatusIcon className="h-3 w-3" /> {s.label}
                      </span>
                      <span className="text-lg font-bold text-caixa-orange">{formatCurrency(p.valor_ofertado)}</span>
                      {p.valor_contra_proposta && (
                        <span className="text-sm text-amber-400">Contra: {formatCurrency(p.valor_contra_proposta)}</span>
                      )}
                      {p.valor_aceito && (
                        <span className="text-sm text-emerald-400">Aceito: {formatCurrency(p.valor_aceito)}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{p.cliente?.nome || "Cliente"}</span>
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{p.imovel?.nome_imovel || "Imóvel"}</span>
                      {p.imovel?.valor_venda && <span className="text-white/20">Pedido: {formatCurrency(p.imovel.valor_venda)}</span>}
                      <span>{FORMA_MAP[p.forma_pagamento] || p.forma_pagamento}</span>
                      {p.data_validade && <span>Válida até: {new Date(p.data_validade).toLocaleDateString("pt-BR")}</span>}
                    </div>
                    {p.observacoes && <p className="text-xs text-white/30">{p.observacoes}</p>}
                    {p.motivo_recusa && <p className="text-xs text-red-400">Motivo: {p.motivo_recusa}</p>}
                  </div>
                  <div className="flex gap-1">
                    {(p.status === "pendente" || p.status === "em_negociacao") && (
                      <>
                        <button onClick={() => handleStatusUpdate(p.id, "aceita", { valor_aceito: p.valor_ofertado })} className="rounded p-1.5 text-white/20 hover:bg-emerald-500/20 hover:text-emerald-400" title="Aceitar"><Check className="h-4 w-4" /></button>
                        <button onClick={() => handleStatusUpdate(p.id, "em_negociacao")} className="rounded p-1.5 text-white/20 hover:bg-amber-500/20 hover:text-amber-400" title="Negociar"><ArrowRightLeft className="h-4 w-4" /></button>
                        <button onClick={() => handleStatusUpdate(p.id, "recusada")} className="rounded p-1.5 text-white/20 hover:bg-red-500/20 hover:text-red-400" title="Recusar"><XCircle className="h-4 w-4" /></button>
                      </>
                    )}
                    <button onClick={() => handleDelete(p.id)} className="rounded p-1.5 text-white/20 hover:bg-red-500/20 hover:text-red-400" title="Excluir"><X className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PropostasList;
