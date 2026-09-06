"use client";

import { FormIntro } from "@/components/ui/form-intro";

import { useState } from "react";

const STATUS_MAP = {
  agendada: { label: "Agendada", color: "bg-blue-50 text-sky-700 border-blue-200" },
  realizada: { label: "Realizada", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelada: { label: "Cancelada", color: "bg-red-50 text-red-700 border-red-200" },
  reagendada: { label: "Reagendada", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

// Client Component: lista de visitas (recebida via SSR) + form de criação e
// ações de status, tudo via proxy `/api/backend/visitas`.
export function VisitasManager({ initialVisitas, clientes, imoveis }) {
  const [visitas, setVisitas] = useState(initialVisitas || []);
  const [form, setForm] = useState({ cliente_id: "", imovel_id: "", data_visita: "", observacoes: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.cliente_id || !form.imovel_id || !form.data_visita) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/backend/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erro ao agendar visita");
      const nova = await res.json();
      setVisitas((prev) => [...prev, nova.data || nova]);
      setForm({ cliente_id: "", imovel_id: "", data_visita: "", observacoes: "" });
    } catch (err) {
      setError(err.message || "Erro ao agendar visita");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await fetch(`/api/backend/visitas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setVisitas((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
    } catch {
      setError("Erro ao atualizar visita");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir esta visita?")) return;
    try {
      await fetch(`/api/backend/visitas/${id}`, { method: "DELETE" });
      setVisitas((prev) => prev.filter((v) => v.id !== id));
    } catch {
      setError("Erro ao excluir visita");
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="crm-form rounded-xl border border-cx-border bg-cx-surface p-4 grid gap-3 sm:grid-cols-4">
        <div className="crm-form-heading"><FormIntro title="Agendar visita" description="Preencha os dados abaixo. Campos com * são obrigatórios." /></div>
        <label className="block "><span className="crm-field-label mb-2 block">Cliente *</span>
<select
          value={form.cliente_id}
          onChange={(e) => setForm((p) => ({ ...p, cliente_id: e.target.value }))}
          className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text outline-none focus:border-caixa-orange/50"
          required
        >
          <option value="">Cliente...</option>
          {(clientes || []).map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
</label>
        <label className="block "><span className="crm-field-label mb-2 block">Imóvel *</span>
<select
          value={form.imovel_id}
          onChange={(e) => setForm((p) => ({ ...p, imovel_id: e.target.value }))}
          className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text outline-none focus:border-caixa-orange/50"
          required
        >
          <option value="">Imóvel...</option>
          {(imoveis || []).map((i) => (
            <option key={i.id} value={i.id}>{i.nome_imovel || i.endereco}</option>
          ))}
        </select>
</label>
        <label className="block "><span className="crm-field-label mb-2 block">Data e horário *</span>
<input
          type="datetime-local"
          value={form.data_visita}
          onChange={(e) => setForm((p) => ({ ...p, data_visita: e.target.value }))}
          className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text outline-none focus:border-caixa-orange/50"
          required
        />
</label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-cx-orange px-4 py-2 text-sm font-semibold text-white hover:bg-cx-orange-dark disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Agendar visita"}
        </button>
        <label className="block sm:col-span-4"><span className="crm-field-label mb-2 block">Observações</span>
<input
          type="text"
          placeholder="Observações"
          value={form.observacoes}
          onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
          className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text placeholder-[#9aa6b4] outline-none focus:border-caixa-orange/50 "
        />
</label>
      </form>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {visitas.length === 0 ? (
          <p className="text-cx-muted text-sm">Nenhuma visita encontrada.</p>
        ) : (
          visitas.map((v) => {
            const s = STATUS_MAP[v.status] || STATUS_MAP.agendada;
            return (
              <div key={v.id} className="rounded-xl border border-cx-border bg-cx-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${s.color}`}>{s.label}</span>
                      <span className="text-sm font-semibold text-cx-text">{v.cliente?.nome || "Cliente"}</span>
                    </div>
                    <p className="text-xs text-cx-muted">
                      {v.imovel?.nome_imovel || v.imovel?.endereco || "Imóvel"} — {v.data_visita ? new Date(v.data_visita).toLocaleString("pt-BR") : ""}
                    </p>
                    {v.observacoes && <p className="text-xs text-cx-muted">{v.observacoes}</p>}
                  </div>
                  <div className="flex gap-2 text-xs">
                    {v.status === "agendada" && (
                      <>
                        <button onClick={() => updateStatus(v.id, "realizada")} className="text-emerald-700 hover:underline">Realizada</button>
                        <button onClick={() => updateStatus(v.id, "cancelada")} className="text-red-700 hover:underline">Cancelar</button>
                      </>
                    )}
                    <button onClick={() => handleDelete(v.id)} className="text-cx-muted hover:text-red-700 hover:underline">Excluir</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
