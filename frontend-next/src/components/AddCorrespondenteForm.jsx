"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Portado de frontend/src/components/AddCorrespondente.jsx (simplificado:
// sem upload de foto — ver docs-wiring-clientes.md).
const initialState = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  address: "",
  pix_account: "",
  password: "",
  confirmPassword: "",
};

export function AddCorrespondenteForm() {
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }
    if (!formData.username || !formData.email || !formData.first_name || !formData.last_name || !formData.phone || !formData.password) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...payload } = formData;
      const res = await fetch("/api/backend/correspondente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || `Erro ao criar correspondente (${res.status})`);
      }

      setSuccess(true);
      setFormData(initialState);
      router.refresh();
    } catch (err) {
      setError(err.message || "Erro ao criar correspondente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-xl border border-cx-border bg-cx-surface p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Username *">
          <input name="username" value={formData.username} onChange={handleChange} required className="input" />
        </Field>
        <Field label="E-mail *">
          <input type="email" name="email" value={formData.email} onChange={handleChange} required className="input" />
        </Field>
        <Field label="Nome *">
          <input name="first_name" value={formData.first_name} onChange={handleChange} required className="input" />
        </Field>
        <Field label="Sobrenome *">
          <input name="last_name" value={formData.last_name} onChange={handleChange} required className="input" />
        </Field>
        <Field label="Telefone *">
          <input name="phone" value={formData.phone} onChange={handleChange} required className="input" placeholder="(00) 00000-0000" />
        </Field>
        <Field label="Endereço">
          <input name="address" value={formData.address} onChange={handleChange} className="input" />
        </Field>
        <Field label="PIX / Conta">
          <input name="pix_account" value={formData.pix_account} onChange={handleChange} className="input" />
        </Field>
        <Field label="Senha *">
          <input type="password" name="password" value={formData.password} onChange={handleChange} required className="input" />
        </Field>
        <Field label="Confirmar senha *">
          <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="input" />
        </Field>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
          Correspondente criado com sucesso!
        </div>
      )}

      <button type="submit" disabled={loading}
        className="rounded-lg bg-cx-orange hover:bg-cx-orange-dark disabled:opacity-60 px-5 py-2.5 text-sm font-semibold text-white transition-colors">
        {loading ? "Criando..." : "Criar correspondente"}
      </button>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 0.875rem;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-cx-muted">{label}</span>
      {children}
    </label>
  );
}
