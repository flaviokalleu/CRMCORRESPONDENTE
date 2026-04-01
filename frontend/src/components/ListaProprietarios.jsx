import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Plus, Loader2, Trash2, Phone, MapPin, User, AlertTriangle, CheckCircle2 } from "lucide-react";

const API_URL = (process.env.REACT_APP_API_URL || "http://localhost:8000/api").replace(/\/+$/, "");
const CARD = "rgba(255,255,255,0.06)";
const BORDER = "rgba(255,255,255,0.10)";
const INPUT_BG = "rgba(255,255,255,0.05)";
const ACCENT_GRADIENT = "linear-gradient(135deg, #F97316, #EA580C)";

const inputClass = "w-full rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all";

const ListaProprietarios = () => {
  const [proprietarios, setProprietarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  const headers = useMemo(() => {
    const token = localStorage.getItem("authToken");
    return {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    };
  }, []);

  const carregar = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/proprietarios`, { headers, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao buscar proprietários");
      setProprietarios(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Erro ao buscar proprietários");
      setProprietarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Informe o nome do proprietário");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/proprietarios`, {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao cadastrar proprietário");

      setForm({ name: "", phone: "", address: "" });
      setSuccess("Proprietário cadastrado com sucesso");
      setProprietarios((prev) => [data, ...prev]);
    } catch (err) {
      setError(err.message || "Erro ao cadastrar proprietário");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Deseja realmente excluir este proprietário?");
    if (!confirmed) return;

    try {
      setError("");
      const response = await fetch(`${API_URL}/proprietarios/${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao excluir proprietário");
      setProprietarios((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || "Erro ao excluir proprietário");
    }
  };

  return (
    <div className="min-h-screen w-full bg-caixa-gradient relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-orange-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 md:px-6 lg:px-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20" style={{ background: ACCENT_GRADIENT }}>
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">PROPRIETÁRIOS</h1>
            <p className="text-white/60 text-base">Cadastre e gerencie os proprietários vinculados aos imóveis</p>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-300 text-sm">{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="text-emerald-300 text-sm">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-2xl p-5 backdrop-blur-xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-4 text-white font-semibold">
            <Plus className="w-4 h-4 text-orange-400" />
            Adicionar proprietário
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Nome completo"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className={inputClass}
              style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
            />
            <input
              type="text"
              placeholder="Telefone"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className={inputClass}
              style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
            />
            <input
              type="text"
              placeholder="Endereço"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className={inputClass}
              style={{ background: INPUT_BG, border: `1px solid ${BORDER}` }}
            />
            <div className="md:col-span-3">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 transition text-white font-semibold disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Salvar Proprietário
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl p-5 backdrop-blur-xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Lista de Proprietários</h2>
            <span className="text-sm text-white/60">{proprietarios.length} item(ns)</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-white/70"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>
          ) : proprietarios.length === 0 ? (
            <p className="text-white/60">Nenhum proprietário cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {proprietarios.map((item) => (
                <div key={item.id} className="rounded-xl p-4 bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-white font-semibold inline-flex items-center gap-2"><User className="w-4 h-4 text-orange-400" /> {item.name}</p>
                    <p className="text-white/70 text-sm inline-flex items-center gap-2"><Phone className="w-4 h-4 text-orange-400" /> {item.phone || 'Sem telefone'}</p>
                    <p className="text-white/60 text-sm inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-400" /> {item.address || 'Sem endereço'}</p>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-red-300 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition self-start md:self-auto">
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListaProprietarios;
