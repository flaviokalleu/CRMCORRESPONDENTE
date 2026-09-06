"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

// Página pública de cadastro SaaS (fora do grupo `(app)` — sem sessão
// exigida). Client Component: busca planos via proxy `/api/backend/...`
// (rota pública do Go) e envia o cadastro para a Route Handler BFF
// `/api/auth/register`, que grava o cookie httpOnly igual o login.
export default function RegistroPage() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [empresa, setEmpresa] = useState({ nome: "", slug: "", cnpj: "", email: "", telefone: "" });
  const [admin, setAdmin] = useState({ first_name: "", last_name: "", email: "", password: "", confirm_password: "", telefone: "" });
  const [planId, setPlanId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/backend/tenant/plans")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = data?.plans || data || [];
        if (Array.isArray(list)) setPlans(list);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!empresa.nome || !empresa.slug || !empresa.cnpj || !empresa.email) {
      setError("Preencha todos os dados da empresa.");
      return;
    }
    if (!admin.first_name || !admin.last_name || !admin.email || !admin.password) {
      setError("Preencha todos os dados do administrador.");
      return;
    }
    if (admin.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (admin.password !== admin.confirm_password) {
      setError("As senhas não coincidem.");
      return;
    }
    if (!planId) {
      setError("Selecione um plano.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa,
          admin: {
            first_name: admin.first_name,
            last_name: admin.last_name,
            email: admin.email,
            password: admin.password,
            telefone: admin.telefone,
          },
          plan_id: planId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Erro ao realizar cadastro. Tente novamente.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message || "Erro de conexão");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-register-page min-h-screen bg-cx-bg flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-cx-text text-center mb-6">Crie sua conta no CRM IMOB</h1>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-cx-border bg-cx-surface p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-cx-muted">Dados da empresa</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome da empresa" value={empresa.nome} onChange={(v) => setEmpresa((p) => ({ ...p, nome: v, slug: slugify(v) }))} />
              <Field label="Slug" value={empresa.slug} onChange={(v) => setEmpresa((p) => ({ ...p, slug: slugify(v) }))} />
              <Field label="CNPJ" value={empresa.cnpj} onChange={(v) => setEmpresa((p) => ({ ...p, cnpj: v }))} />
              <Field label="E-mail da empresa" type="email" value={empresa.email} onChange={(v) => setEmpresa((p) => ({ ...p, email: v }))} />
              <Field label="Telefone" value={empresa.telefone} onChange={(v) => setEmpresa((p) => ({ ...p, telefone: v }))} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-cx-muted">Dados do administrador</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" value={admin.first_name} onChange={(v) => setAdmin((p) => ({ ...p, first_name: v }))} />
              <Field label="Sobrenome" value={admin.last_name} onChange={(v) => setAdmin((p) => ({ ...p, last_name: v }))} />
              <Field label="E-mail" type="email" value={admin.email} onChange={(v) => setAdmin((p) => ({ ...p, email: v }))} />
              <Field label="Telefone" value={admin.telefone} onChange={(v) => setAdmin((p) => ({ ...p, telefone: v }))} />
              <Field label="Senha" type="password" value={admin.password} onChange={(v) => setAdmin((p) => ({ ...p, password: v }))} />
              <Field label="Confirmar senha" type="password" value={admin.confirm_password} onChange={(v) => setAdmin((p) => ({ ...p, confirm_password: v }))} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-cx-muted">Plano</h2>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full rounded-lg border border-cx-border bg-cx-surface px-3 py-2.5 text-sm text-cx-text outline-none focus:border-caixa-orange/50"
            >
              <option value="">Selecione um plano...</option>
              {plans.map((p) => (
                <option key={p.id || p.slug} value={p.id || p.slug}>
                  {p.name || p.nome} {p.price != null ? `- R$ ${Number(p.price).toFixed(2)}/mês` : ""}
                </option>
              ))}
            </select>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-cx-orange px-5 py-3 text-sm font-semibold text-white hover:bg-cx-orange-dark disabled:opacity-50"
          >
            {submitting ? "Criando conta..." : "Criar conta"}
          </button>

          <p className="text-center text-sm text-cx-muted">
            Já tem conta?{" "}
            <Link href="/login" className="text-cx-orange-text hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-xs text-cx-muted mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-cx-border bg-cx-surface px-3 py-2.5 text-sm text-cx-text outline-none focus:border-caixa-orange/50"
      />
    </div>
  );
}
