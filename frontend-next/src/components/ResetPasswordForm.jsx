"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, Save } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MIN = 8;

export function ResetPasswordForm({ token }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | saving | done
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < MIN) { setError(`A senha precisa ter pelo menos ${MIN} caracteres.`); return; }
    if (password !== confirm) { setError("As duas senhas não são iguais."); return; }
    setStatus("saving");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Não foi possível salvar a nova senha."); setStatus("idle"); return; }
      setStatus("done");
    } catch {
      setError("Não foi possível falar com o servidor. Tente novamente.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="lg-form">
        <div role="status" className="lg-notice">
          <CheckCircle className="lg-notice-icon" />
          <p>Senha alterada. Entre com a nova senha.</p>
        </div>
        <Link href="/login" className="lg-link-btn">Ir para o login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="lg-form" noValidate>
      <div className="lg-field">
        <label htmlFor="password" className="lg-label">Nova senha</label>
        <div className="lg-input-wrap lg-pass">
          <Lock className="lg-input-icon" />
          <Input id="password" type={show ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
            required minLength={MIN} autoComplete="new-password" placeholder="Pelo menos 8 caracteres" className="lg-input lg-input-pass" />
          <button type="button" onClick={() => setShow(!show)} className="lg-pass-btn" aria-label={show ? "Ocultar senha" : "Mostrar senha"} aria-pressed={show}>
            {show ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </div>
      <div className="lg-field">
        <label htmlFor="confirm" className="lg-label">Confirmar nova senha</label>
        <div className="lg-input-wrap">
          <Lock className="lg-input-icon" />
          <Input id="confirm" type={show ? "text" : "password"} value={confirm} onChange={(e) => { setConfirm(e.target.value); if (error) setError(""); }}
            required autoComplete="new-password" placeholder="Repita a senha" className="lg-input" />
        </div>
      </div>
      {error && <p role="alert" className="lg-msg">{error}</p>}
      <Button type="submit" disabled={status === "saving"} className="lg-submit w-full" size="lg">
        {status === "saving"
          ? <span className="lg-btn-inner"><Loader2 className="h-4 w-4 animate-spin" />Salvando…</span>
          : <span className="lg-btn-inner">Salvar nova senha <Save className="h-4 w-4" /></span>}
      </Button>
    </form>
  );
}
