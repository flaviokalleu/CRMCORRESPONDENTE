"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Client Component: recebe a lista inicial (buscada no servidor via apiGet) e
// cuida de criar/concluir/excluir lembretes. Chamadas passam pelo proxy
// `/api/backend/...` (nunca direto no Go, nunca localStorage).
export function LembretesManager({ initialLembretes }) {
  const [lembretes, setLembretes] = useState(initialLembretes || []);
  const [showConcluidos, setShowConcluidos] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", data: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const ativos = lembretes.filter((l) => !l.concluido);
  const concluidos = lembretes.filter((l) => l.concluido);
  const lista = showConcluidos ? concluidos : ativos;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.data) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/backend/lembretes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erro ao criar lembrete");
      const novo = await res.json();
      setLembretes((prev) => [...prev, novo]);
      setForm({ titulo: "", descricao: "", data: "" });
      router.refresh();
    } catch (err) {
      setError(err.message || "Erro ao criar lembrete");
    } finally {
      setSaving(false);
    }
  };

  const handleConcluir = async (id) => {
    try {
      await fetch(`/api/backend/lembretes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "concluido" }),
      });
      setLembretes((prev) => prev.map((l) => (l.id === id ? { ...l, concluido: true } : l)));
    } catch {
      setError("Erro ao concluir lembrete");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir este lembrete?")) return;
    try {
      await fetch(`/api/backend/lembretes/${id}`, { method: "DELETE" });
      setLembretes((prev) => prev.filter((l) => l.id !== id));
    } catch {
      setError("Erro ao excluir lembrete");
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 grid gap-3 sm:grid-cols-4">
        <input
          type="text"
          placeholder="Título"
          value={form.titulo}
          onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-caixa-orange/50 sm:col-span-2"
          required
        />
        <input
          type="date"
          value={form.data}
          onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-caixa-orange/50"
          required
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-caixa-orange px-4 py-2 text-sm font-semibold text-white hover:bg-caixa-orange-dark disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Novo lembrete"}
        </button>
        <input
          type="text"
          placeholder="Descrição"
          value={form.descricao}
          onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-caixa-orange/50 sm:col-span-4"
        />
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => setShowConcluidos(false)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${!showConcluidos ? "bg-caixa-orange/20 text-caixa-orange" : "bg-white/5 text-white/40"}`}
        >
          Ativos ({ativos.length})
        </button>
        <button
          onClick={() => setShowConcluidos(true)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${showConcluidos ? "bg-caixa-orange/20 text-caixa-orange" : "bg-white/5 text-white/40"}`}
        >
          Concluídos ({concluidos.length})
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.04] text-left text-white/50">
              <th className="px-4 py-2">Título</th>
              <th className="px-4 py-2">Descrição</th>
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-white/30">
                  Nenhum lembrete.
                </td>
              </tr>
            ) : (
              lista.map((l) => (
                <tr key={l.id} className="border-t border-white/5">
                  <td className="px-4 py-2 text-white">{l.titulo}</td>
                  <td className="px-4 py-2 text-white/60">{l.descricao}</td>
                  <td className="px-4 py-2 text-white/60">{l.data ? new Date(l.data).toLocaleDateString("pt-BR") : ""}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {!l.concluido && (
                      <button onClick={() => handleConcluir(l.id)} className="text-emerald-400 hover:underline text-xs">
                        Concluir
                      </button>
                    )}
                    <button onClick={() => handleDelete(l.id)} className="text-red-400 hover:underline text-xs">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
