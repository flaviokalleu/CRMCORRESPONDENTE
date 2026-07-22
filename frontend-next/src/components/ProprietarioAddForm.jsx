"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Client Component pequeno usado dentro da página Server de proprietários,
// só para permitir cadastro sem sair da página. Sempre via proxy
// (/api/backend/...), nunca o Go direto.
export function ProprietarioAddForm() {
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Informe o nome do proprietário" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/backend/proprietarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || "Erro ao cadastrar proprietário");

      setForm({ name: "", phone: "", address: "" });
      setMessage({ type: "success", text: "Proprietário cadastrado com sucesso." });
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erro ao cadastrar proprietário" });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-caixa-orange/50";

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-semibold text-white/70">Adicionar proprietário</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          className={inputClass}
          placeholder="Nome completo"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
        <input
          className={inputClass}
          placeholder="Telefone"
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
        />
        <input
          className={inputClass}
          placeholder="Endereço"
          value={form.address}
          onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
        />
      </div>
      {message.text && (
        <p className={`mt-3 text-xs ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-3 rounded-md bg-caixa-orange px-4 py-2 text-sm font-semibold text-white hover:bg-caixa-orange/90 disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar Proprietário"}
      </button>
    </form>
  );
}
