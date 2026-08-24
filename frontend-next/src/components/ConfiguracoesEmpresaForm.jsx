"use client";

import { useState } from "react";

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

// Client Component: form de edição das configurações do tenant, via proxy
// `/api/backend/tenant-settings/settings`.
export function ConfiguracoesEmpresaForm({ initialData }) {
  const [form, setForm] = useState({
    nome: initialData?.nome || "",
    slug: initialData?.slug || "",
    cnpj: initialData?.cnpj || "",
    email: initialData?.email || "",
    telefone: initialData?.telefone || "",
    endereco: initialData?.endereco || "",
    cidade: initialData?.cidade || "",
    estado: initialData?.estado || "",
    cep: initialData?.cep || "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch("/api/backend/tenant-settings/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erro ao salvar configurações");
      setMessage({ type: "success", text: "Configurações salvas com sucesso!" });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erro ao salvar configurações" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message.text && (
        <p className={`text-sm ${message.type === "success" ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-cx-border bg-cx-surface p-5">
        <Field label="Nome da empresa" name="nome" value={form.nome} onChange={handleChange} className="md:col-span-2" />
        <Field label="Slug" name="slug" value={form.slug} disabled />
        <Field label="CNPJ" name="cnpj" value={form.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" />
        <Field label="E-mail" name="email" value={form.email} onChange={handleChange} type="email" />
        <Field label="Telefone" name="telefone" value={form.telefone} onChange={handleChange} />
        <Field label="Endereço" name="endereco" value={form.endereco} onChange={handleChange} className="md:col-span-2" />
        <Field label="Cidade" name="cidade" value={form.cidade} onChange={handleChange} />
        <div>
          <label className="block text-sm text-cx-muted mb-1">Estado</label>
          <select
            name="estado"
            value={form.estado}
            onChange={handleChange}
            className="w-full rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text outline-none focus:border-caixa-orange/50"
          >
            <option value="">Selecione</option>
            {ESTADOS.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>
        <Field label="CEP" name="cep" value={form.cep} onChange={handleChange} />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-caixa-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-caixa-orange-dark disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar configurações"}
      </button>
    </form>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder, disabled, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-sm text-cx-muted mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-caixa-orange/50 ${
          disabled ? "border-cx-border bg-cx-surface text-cx-muted cursor-not-allowed" : "border-cx-border bg-cx-surface text-cx-text placeholder-[#9aa6b4]"
        }`}
      />
    </div>
  );
}
