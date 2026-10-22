"use client";

import { useState } from "react";
import { Mail, Loader2, Send, CheckCircle } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Informe seu e-mail."); return; }
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Não foi possível enviar o link. Tente novamente."); setStatus("idle"); return; }
      setMessage(data.message);
      setStatus("sent");
    } catch {
      setError("Não foi possível falar com o servidor. Tente novamente.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="lg-notice">
        <CheckCircle className="lg-notice-icon" />
        <p>{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="lg-form" noValidate>
      <div className="lg-field">
        <label htmlFor="email" className="lg-label">E-mail</label>
        <div className="lg-input-wrap">
          <Mail className="lg-input-icon" />
          <Input id="email" type="email" name="email" value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
            required autoComplete="email" placeholder="seu@email.com.br" className="lg-input" aria-invalid={error ? true : undefined} />
        </div>
      </div>
      {error && <p role="alert" className="lg-msg">{error}</p>}
      <Button type="submit" disabled={status === "sending"} className="lg-submit w-full" size="lg">
        {status === "sending"
          ? <span className="lg-btn-inner"><Loader2 className="h-4 w-4 animate-spin" />Enviando…</span>
          : <span className="lg-btn-inner">Enviar link <Send className="h-4 w-4" /></span>}
      </Button>
    </form>
  );
}
