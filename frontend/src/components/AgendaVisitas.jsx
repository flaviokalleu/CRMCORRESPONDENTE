import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, MapPin, User, Clock, Plus, X, Check, XCircle, Star,
  ChevronDown, ChevronUp, Filter,
} from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";
const token = () => localStorage.getItem("authToken");
const headers = () => ({ Authorization: `Bearer ${token()}` });

const STATUS_MAP = {
  agendada: { label: "Agendada", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  realizada: { label: "Realizada", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  cancelada: { label: "Cancelada", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  reagendada: { label: "Reagendada", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
};

const formatDate = (d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const formatTime = (d) => new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const AgendaVisitas = () => {
  const [visitas, setVisitas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [imoveis, setImoveis] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ cliente_id: "", imovel_id: "", data_visita: "", observacoes: "" });
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  const fetchVisitas = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const { data } = await axios.get(`${API_URL}/visitas`, { headers: headers(), params });
      setVisitas(data.data || []);
    } catch { setVisitas([]); }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchVisitas(); }, [fetchVisitas]);

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
    if (!form.cliente_id || !form.imovel_id || !form.data_visita) return;
    try {
      await axios.post(`${API_URL}/visitas`, form, { headers: headers() });
      setShowForm(false);
      setForm({ cliente_id: "", imovel_id: "", data_visita: "", observacoes: "" });
      fetchVisitas();
    } catch { /* */ }
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`${API_URL}/visitas/${id}`, editData, { headers: headers() });
      setEditId(null);
      fetchVisitas();
    } catch { /* */ }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/visitas/${id}`, { headers: headers() });
      fetchVisitas();
    } catch { /* */ }
  };

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agenda de Visitas</h1>
          <p className="mt-1 text-sm text-white/40">Gerencie visitas a imóveis</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-caixa-orange px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-caixa-orange/20 transition-all hover:bg-caixa-orange/90"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Fechar" : "Nova Visita"}
        </button>
      </div>

      {/* Formulário de Nova Visita */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="mb-4 text-sm font-semibold text-white/70">Agendar Visita</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/50">Cliente *</label>
                  <select
                    value={form.cliente_id}
                    onChange={(e) => setForm(p => ({ ...p, cliente_id: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-caixa-orange/50"
                  >
                    <option value="">Selecionar...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/50">Imóvel *</label>
                  <select
                    value={form.imovel_id}
                    onChange={(e) => setForm(p => ({ ...p, imovel_id: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-caixa-orange/50"
                  >
                    <option value="">Selecionar...</option>
                    {imoveis.map(i => <option key={i.id} value={i.id}>{i.nome_imovel || i.endereco}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/50">Data e Hora *</label>
                  <input
                    type="datetime-local"
                    value={form.data_visita}
                    onChange={(e) => setForm(p => ({ ...p, data_visita: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-caixa-orange/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/50">Observações</label>
                  <input
                    type="text"
                    value={form.observacoes}
                    onChange={(e) => setForm(p => ({ ...p, observacoes: e.target.value }))}
                    placeholder="Notas..."
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-caixa-orange/50"
                  />
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={!form.cliente_id || !form.imovel_id || !form.data_visita}
                className="mt-4 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-40"
              >
                Agendar Visita
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtros */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilterStatus("")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${!filterStatus ? "bg-caixa-orange/20 text-caixa-orange" : "bg-white/5 text-white/40 hover:text-white"}`}
        >
          Todas
        </button>
        {Object.entries(STATUS_MAP).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${filterStatus === key ? "bg-caixa-orange/20 text-caixa-orange" : "bg-white/5 text-white/40 hover:text-white"}`}
          >
            {val.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-caixa-orange border-t-transparent" />
        </div>
      ) : visitas.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-white/10">
          <div className="text-center">
            <Calendar className="mx-auto h-10 w-10 text-white/10" />
            <p className="mt-2 text-sm text-white/30">Nenhuma visita encontrada</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {visitas.map((v) => {
            const s = STATUS_MAP[v.status] || STATUS_MAP.agendada;
            const isEditing = editId === v.id;
            return (
              <motion.div
                key={v.id}
                layout
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${s.color}`}>
                        {s.label}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {v.cliente?.nome || "Cliente"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {v.imovel?.nome_imovel || v.imovel?.endereco || "Imóvel"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(v.data_visita)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(v.data_visita)}
                      </span>
                      {v.corretor && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {v.corretor.first_name} {v.corretor.last_name}
                        </span>
                      )}
                    </div>
                    {v.observacoes && <p className="text-xs text-white/30">{v.observacoes}</p>}
                    {v.nota_avaliacao && (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} className={`h-3 w-3 ${n <= v.nota_avaliacao ? "text-amber-400 fill-amber-400" : "text-white/10"}`} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    {v.status === "agendada" && (
                      <>
                        <button
                          onClick={() => { setEditId(isEditing ? null : v.id); setEditData({ status: "realizada", feedback_cliente: "", nota_avaliacao: 5 }); }}
                          className="rounded p-1.5 text-white/20 hover:bg-emerald-500/20 hover:text-emerald-400"
                          title="Marcar como realizada"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleUpdate(v.id, { status: "cancelada" }) || axios.put(`${API_URL}/visitas/${v.id}`, { status: "cancelada" }, { headers: headers() }).then(fetchVisitas)}
                          className="rounded p-1.5 text-white/20 hover:bg-red-500/20 hover:text-red-400"
                          title="Cancelar"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="rounded p-1.5 text-white/20 hover:bg-red-500/20 hover:text-red-400"
                      title="Excluir"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Form inline para marcar como realizada */}
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 overflow-hidden border-t border-white/10 pt-3"
                    >
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs text-white/40">Feedback do cliente</label>
                          <input
                            value={editData.feedback_cliente || ""}
                            onChange={(e) => setEditData(p => ({ ...p, feedback_cliente: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
                            placeholder="Como foi a visita?"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-white/40">Nota (1-5)</label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                onClick={() => setEditData(p => ({ ...p, nota_avaliacao: n }))}
                                className="p-1"
                              >
                                <Star className={`h-5 w-5 ${n <= (editData.nota_avaliacao || 0) ? "text-amber-400 fill-amber-400" : "text-white/20"}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => handleUpdate(v.id)}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                          >
                            Confirmar Realizada
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AgendaVisitas;
