"use client";

import { FormIntro } from "@/components/ui/form-intro";

import { useState } from "react";

// Client Component: form de edição do perfil do usuário logado, via proxy
// `/api/backend/user/:id`.
export function ConfiguracoesUsuarioForm({ initialUser }) {
  const [form, setForm] = useState({
    id: initialUser?.id,
    first_name: initialUser?.first_name || "",
    last_name: initialUser?.last_name || "",
    email: initialUser?.email || "",
    telefone: initialUser?.telefone || "",
    address: initialUser?.address || "",
    pix_account: initialUser?.pix_account || "",
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (password && password.length < 6) {
      setMessage({ type: "error", text: "Senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (password && password !== confirmPassword) {
      setMessage({ type: "error", text: "Senhas não coincidem." });
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (password) payload.password = password;

      const res = await fetch(`/api/backend/user/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao salvar informações");
      setMessage({ type: "success", text: "Informações atualizadas com sucesso!" });
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Erro ao salvar informações" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="crm-form crm-form-composed space-y-4">
      {message.text && (
        <p className={`text-sm ${message.type === "success" ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>
      )}

      <div className="crm-card grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-cx-border bg-cx-surface p-5">
        <div className="md:col-span-2"><FormIntro title="Informações pessoais" description="Mantenha os dados de identificação e contato atualizados." /></div>
        <Field label="Nome" name="first_name" value={form.first_name} onChange={handleChange} />
        <Field label="Sobrenome" name="last_name" value={form.last_name} onChange={handleChange} />
        <Field label="E-mail" name="email" value={form.email} onChange={handleChange} type="email" />
        <Field label="Telefone" name="telefone" value={form.telefone} onChange={handleChange} />
        <Field label="Conta PIX" name="pix_account" value={form.pix_account} onChange={handleChange} />
        <Field label="Endereço" name="address" value={form.address} onChange={handleChange} className="md:col-span-2" />
      </div>

      <div className="crm-card grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-cx-border bg-cx-surface p-5">
        <div className="md:col-span-2"><FormIntro title="Segurança da conta" description="Preencha os dois campos somente se quiser alterar a senha." /></div>
        <div>
          <label className="block text-sm text-cx-muted mb-1">Nova senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Deixe em branco para manter"
            className="w-full rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text placeholder-[#9aa6b4] outline-none focus:border-caixa-orange/50"
          />
        </div>
        <div>
          <label className="block text-sm text-cx-muted mb-1">Confirmar senha</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text placeholder-[#9aa6b4] outline-none focus:border-caixa-orange/50"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-cx-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-cx-orange-dark disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

function Field({ label, name, value, onChange, type = "text", className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={`settings-${name}`} className="block text-sm text-cx-muted mb-2">{label}</label>
      <input
        type={type}
        id={`settings-${name}`}
        name={name}
        value={value || ""}
        onChange={onChange}
        className="w-full rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text placeholder-[#9aa6b4] outline-none focus:border-caixa-orange/50"
      />
    </div>
  );
}
