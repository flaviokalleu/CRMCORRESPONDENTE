"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Mail, Lock, Eye, EyeOff, Phone, User, Loader2 } from "@/components/icons";
import { maskPhone, soDigitos } from "@/lib/masks";

const slugify = (t) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "imobiliaria";

// Centavos só quando existem (R$ 297,90 não pode aparecer como R$ 298).
const brl = (v) => {
  const n = Number(v) || 0;
  const casas = Number.isInteger(n) ? 0 : 2;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: casas, maximumFractionDigits: casas }).format(n);
};

// Cadastro em 5 campos (lei de Hick): o que não é preciso para começar —
// CNPJ, endereço, logo — fica para "Minha empresa", depois de entrar.
export function CadastroForm({ planos, planoInicial }) {
  const router = useRouter();
  const [v, setV] = useState({ empresa: "", nome: "", email: "", telefone: "", senha: "" });
  const [planId, setPlanId] = useState(planoInicial);
  const [trocandoPlano, setTrocandoPlano] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const focar = (k) => document.getElementById(`cad-${k}`)?.focus();

  const plano = planos.find((p) => p.id === planId);
  const set = (k) => (e) => {
    const valor = k === "telefone" ? maskPhone(e.target.value) : e.target.value;
    setV((o) => ({ ...o, [k]: valor }));
    if (erros[k]) setErros((o) => ({ ...o, [k]: undefined }));
  };

  function validar() {
    const e = {};
    if (v.empresa.trim().length < 2) e.empresa = "Informe o nome da imobiliária.";
    if (v.nome.trim().split(/\s+/).length < 2) e.nome = "Informe nome e sobrenome.";
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "Confira o e-mail.";
    if (v.senha.length < 6) e.senha = "Use pelo menos 6 caracteres.";
    else if (new TextEncoder().encode(v.senha).length > 72) e.senha = "Use no máximo 72 caracteres.";
    const fone = soDigitos(v.telefone);
    if (fone && (fone.length < 10 || fone.length > 11)) e.telefone = "Escreva o WhatsApp com DDD. Ex.: (61) 99999-9999";
    return e;
  }

  async function enviar(ev) {
    ev.preventDefault();
    setErroGeral("");
    const e = validar();
    setErros(e);
    const primeiro = ["empresa", "nome", "email", "telefone", "senha"].find((k) => e[k]);
    if (primeiro) {
      focar(primeiro);
      return;
    }
    if (!planId) {
      setErroGeral("Escolha um plano.");
      return;
    }
    setEnviando(true);
    const [first, ...resto] = v.nome.trim().split(/\s+/);
    const email = v.email.trim().toLowerCase();
    const corpo = (slug) => ({
      empresa: { nome: v.empresa.trim(), slug, email, telefone: soDigitos(v.telefone) },
      admin: { first_name: first, last_name: resto.join(" "), email, password: v.senha, telefone: soDigitos(v.telefone) },
      plan_id: Number(planId),
    });
    try {
      let slug = slugify(v.empresa);
      let res;
      let dados;
      // Endereço da empresa repetido: tenta com um final numérico, sem incomodar a pessoa.
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo(slug)) });
        dados = await res.json().catch(() => ({}));
        if (res.status === 409 && /slug/i.test(dados.error || "")) {
          slug = `${slugify(v.empresa).slice(0, 34)}-${Math.floor(100 + Math.random() * 900)}`;
          continue;
        }
        break;
      }
      if (!res.ok) {
        // O servidor diz qual campo errou (`campo`); e-mail/usuário em uso vêm com 409.
        const campo = { password: "senha", username: "email" }[dados.campo] || dados.campo;
        if (res.status === 409 && (campo === "email" || /e-?mail/i.test(dados.error || ""))) {
          setErros({ email: "Este e-mail já tem conta. Entre ou use outro e-mail." });
          focar("email");
        } else if (campo && Object.hasOwn(v, campo)) {
          setErros({ [campo]: dados.error });
          focar(campo);
        } else {
          setErroGeral(dados.error || "Não foi possível criar a conta. Tente de novo.");
        }
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErroGeral("Sem conexão. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const campo = (k, rotulo, Icone, props = {}) => (
    <div className="lg-field">
      <label htmlFor={`cad-${k}`} className="lg-label">{rotulo}</label>
      <div className="lg-input-wrap">
        <Icone className="lg-input-icon" />
        <Input
          id={`cad-${k}`}
          value={v[k]}
          onChange={set(k)}
          aria-invalid={erros[k] ? true : undefined}
          aria-describedby={erros[k] ? `cad-${k}-erro` : undefined}
          className="lg-input"
          {...props}
        />
      </div>
      {erros[k] && <p id={`cad-${k}-erro`} className="lg-msg">{erros[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={enviar} className="lg-form" noValidate>
      {campo("empresa", "Nome da imobiliária", Building2, { autoComplete: "organization", placeholder: "Ex.: Imobiliária Central", maxLength: 255 })}
      {campo("nome", "Seu nome e sobrenome", User, { autoComplete: "name", placeholder: "Ex.: Maria Souza", maxLength: 255 })}
      {campo("email", "E-mail", Mail, { type: "email", autoComplete: "email", inputMode: "email", placeholder: "seu@email.com.br", maxLength: 255 })}
      {campo("telefone", "WhatsApp (opcional)", Phone, { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "(61) 99999-9999", maxLength: 16 })}

      <div className="lg-field">
        <label htmlFor="cad-senha" className="lg-label">Crie uma senha</label>
        <div className="lg-input-wrap lg-pass">
          <Lock className="lg-input-icon" />
          <Input
            id="cad-senha"
            type={verSenha ? "text" : "password"}
            value={v.senha}
            onChange={set("senha")}
            autoComplete="new-password"
            placeholder="Pelo menos 6 caracteres"
            maxLength={72}
            aria-invalid={erros.senha ? true : undefined}
            aria-describedby={erros.senha ? "cad-senha-erro" : undefined}
            className="lg-input lg-input-pass"
          />
          <button type="button" onClick={() => setVerSenha((x) => !x)} className="lg-pass-btn" aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"} aria-pressed={verSenha}>
            {verSenha ? <EyeOff /> : <Eye />}
          </button>
        </div>
        {erros.senha && <p id="cad-senha-erro" className="lg-msg">{erros.senha}</p>}
      </div>

      {plano && !trocandoPlano && (
        <p className="cad-plano">
          Plano <strong>{plano.nome}</strong> · {brl(plano.preco_mensal)}/mês depois do teste.{" "}
          {planos.length > 1 && (
            <button type="button" className="cad-plano-trocar" onClick={() => setTrocandoPlano(true)}>Trocar</button>
          )}
        </p>
      )}
      {(trocandoPlano || !plano) && (
        <fieldset className="cad-planos">
          <legend className="lg-label">Escolha o plano</legend>
          {planos.map((p) => (
            <label key={p.id} className="cad-plano-opcao" data-marcado={p.id === planId}>
              <input type="radio" name="plano" value={p.id} checked={p.id === planId} onChange={() => { setPlanId(p.id); setTrocandoPlano(false); }} />
              <span><strong>{p.nome}</strong> · {brl(p.preco_mensal)}/mês</span>
            </label>
          ))}
        </fieldset>
      )}

      {erroGeral && <p role="alert" className="lg-msg">{erroGeral}</p>}

      <Button type="submit" disabled={enviando} className="lg-submit w-full" size="lg">
        {enviando ? <span className="lg-btn-inner"><Loader2 className="h-4 w-4 animate-spin" />Criando sua conta…</span> : <span className="lg-btn-inner">Começar teste grátis</span>}
      </Button>
      <p className="cad-letras-miudas">Ao criar a conta você concorda com o uso dos seus dados para prestar o serviço, conforme a LGPD.</p>
    </form>
  );
}
