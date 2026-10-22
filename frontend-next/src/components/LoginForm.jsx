"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn } from "@/components/icons";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // "Lembrar-me": mantém a sessão depois de fechar o navegador e guarda o
  // e-mail para o próximo acesso. Desmarcado, a sessão acaba ao fechar.
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("webba_login_email");
        if (saved) { setFormData((prev) => ({ ...prev, email: saved })); setRemember(true); }
      } catch { /* armazenamento indisponível: segue sem lembrar */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const { login } = useAuth();
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!formData.email?.trim() || !formData.password) {
      setError("Informe e-mail e senha para entrar.");
      setIsLoading(false);
      return;
    }

    const result = await login({ email: formData.email.trim(), password: formData.password, remember });
    setIsLoading(false);

    if (result.success) {
      try {
        if (remember) localStorage.setItem("webba_login_email", formData.email.trim());
        else localStorage.removeItem("webba_login_email");
      } catch { /* ignora */ }
      router.push("/dashboard");
      router.refresh();
    } else {
      setError(result.error || "Erro ao fazer login");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="lg-form" noValidate>
      <div className="lg-field">
        <label htmlFor="email" className="lg-label">E-mail</label>
        <div className="lg-input-wrap">
          <Mail className="lg-input-icon" />
          <Input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
            placeholder="seu@email.com.br"
            className="lg-input"
          />
        </div>
      </div>

      <div className="lg-field">
        <label htmlFor="password" className="lg-label">Senha</label>
        <div className="lg-input-wrap lg-pass">
          <Lock className="lg-input-icon" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
            placeholder="Sua senha"
            className="lg-input lg-input-pass"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="lg-pass-btn"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </div>

      <div className="lg-row">
        <label className="lg-check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>Lembrar-me</span>
        </label>
        <Link href="/esqueci-senha">Esqueci a senha</Link>
      </div>

      {error && (
        <p role="alert" className="lg-msg">{error}</p>
      )}

      <Button type="submit" disabled={isLoading} className="lg-submit w-full" size="lg">
        {isLoading ? (
          <span className="lg-btn-inner"><Loader2 className="h-4 w-4 animate-spin" />Entrando…</span>
        ) : (
          <span className="lg-btn-inner">Entrar <LogIn className="h-4 w-4" /></span>
        )}
      </Button>
    </form>
  );
}
