"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, UserCheck, User, KeyRound } from "@/components/icons";
import { maskPhone, soDigitos } from "@/lib/masks";
import { FormField, FormAlert, focarPrimeiroErro } from "@/components/ui/form-field";
import { FormActions } from "@/components/ui/form-actions";

// Cadastro de corretor ou correspondente (mesma tela, prop `tipo`).
// Envia multipart/form-data: os DTOs do Go (CreateRequest) só têm tags `form`,
// então JSON com first_name/pix_account não seria lido. Campos:
// username, email, first_name, last_name, telefone, password, address,
// pix_account e — só corretor — creci.
const TIPOS = {
  corretor: { endpoint: "/api/backend/corretor", nome: "corretor", lista: "/corretores/lista", novo: "/corretores/adicionar", creci: true },
  correspondente: { endpoint: "/api/backend/correspondente", nome: "correspondente", lista: "/correspondentes/lista", novo: "/correspondentes/adicionar", creci: false },
};

const VAZIO = {
  first_name: "", last_name: "", telefone: "", email: "", creci: "", pix_account: "", address: "",
  username: "", password: "", confirmPassword: "",
};
const ORDEM = ["first_name", "telefone", "email", "username", "password", "confirmPassword"];
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="crm-form-section crm-card">
      <header className="flex items-center gap-3 border-b">
        <span className="flex shrink-0 items-center justify-center border"><Icon aria-hidden="true" /></span>
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function UsuarioForm({ tipo = "corretor" }) {
  const cfg = TIPOS[tipo];
  const router = useRouter();
  const [form, setForm] = useState(VAZIO);
  const [erros, setErros] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verSenha, setVerSenha] = useState(false);

  const set = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    setErros((p) => (p[name] ? { ...p, [name]: undefined } : p));
  };
  const onText = (e) => set(e.target.name, e.target.value);

  // Sugere o usuário a partir do e-mail enquanto a pessoa não digitou um.
  const onEmail = (e) => {
    const email = e.target.value;
    const sugestaoAntiga = form.email.split("@")[0].toLowerCase();
    set("email", email);
    if (!form.username || form.username === sugestaoAntiga) {
      setForm((p) => ({ ...p, username: email.split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "") }));
    }
  };

  const confirmou = form.confirmPassword.length > 0;
  const senhasIguais = form.password === form.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const novos = {};
    if (!form.first_name.trim()) novos.first_name = "Escreva o nome.";
    if (soDigitos(form.telefone).length < 10) novos.telefone = "Escreva o telefone com DDD.";
    if (!form.email.trim()) novos.email = "Escreva o e-mail.";
    else if (!EMAIL_OK.test(form.email.trim())) novos.email = "Confira o e-mail. Exemplo: joao@email.com";
    if (!form.username.trim()) novos.username = "Escolha um nome de usuário.";
    if (form.password.length < 6) novos.password = "A senha precisa ter pelo menos 6 caracteres.";
    if (!senhasIguais) novos.confirmPassword = "As duas senhas não são iguais.";
    if (Object.keys(novos).length) {
      setErros(novos);
      focarPrimeiroErro(novos, ORDEM);
      return;
    }

    const fd = new FormData();
    const put = (k, v) => { if (v && v.toString().trim() !== "") fd.append(k, v.toString().trim()); };
    put("first_name", form.first_name);
    put("last_name", form.last_name);
    put("telefone", form.telefone);
    put("email", form.email);
    if (cfg.creci) put("creci", form.creci);
    put("pix_account", form.pix_account);
    put("address", form.address);
    put("username", form.username);
    fd.append("password", form.password);

    setLoading(true);
    try {
      const res = await fetch(cfg.endpoint, { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setErros({ email: "Este e-mail ou usuário já está em uso.", username: "Este e-mail ou usuário já está em uso." });
          focarPrimeiroErro({ email: true }, ORDEM);
          return;
        }
        throw new Error(data.message || data.error || `Erro (${res.status})`);
      }
      toast.success(`${form.first_name.trim()} já pode entrar no sistema.`, {
        description: `Usuário: ${form.username.trim()}`,
        action: { label: "Cadastrar outro", onClick: () => router.push(cfg.novo) },
        duration: 8000,
      });
      router.push(cfg.lista);
      router.refresh();
    } catch (err) {
      setError(err.message || `Não foi possível cadastrar o ${cfg.nome}. Tente de novo.`);
      (document.getElementById("conteudo") || window).scrollTo({ top: 0, behavior: "smooth" }); // a página rola dentro do <main> do layout
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="crm-form crm-form-composed mx-auto max-w-3xl space-y-5">
      {error && <FormAlert titulo="Não deu para salvar">{error}</FormAlert>}

      <Section icon={User} title="Dados da pessoa" subtitle="Quem é e como falar com ela">
        <FormField id="first_name" label="Nome" required error={erros.first_name}>
          <input name="first_name" autoComplete="given-name" value={form.first_name} onChange={onText} placeholder="Ex.: João" />
        </FormField>
        <FormField id="last_name" label="Sobrenome" optional>
          <input name="last_name" autoComplete="family-name" value={form.last_name} onChange={onText} placeholder="Ex.: Pereira" />
        </FormField>
        <FormField id="telefone" label="Telefone (WhatsApp)" required error={erros.telefone}>
          <input name="telefone" type="tel" inputMode="tel" autoComplete="tel" value={form.telefone}
            onChange={(e) => set("telefone", maskPhone(e.target.value))} placeholder="(61) 99999-9999" />
        </FormField>
        <FormField id="email" label="E-mail" required error={erros.email}>
          <input name="email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={onEmail} placeholder="joao@email.com" />
        </FormField>
        {cfg.creci && (
          <FormField id="creci" label="CRECI" optional>
            <input name="creci" value={form.creci} onChange={onText} placeholder="Ex.: 12345-F" />
          </FormField>
        )}
        <FormField id="pix_account" label="Chave PIX" optional hint="Para receber comissões.">
          <input name="pix_account" value={form.pix_account} onChange={onText} placeholder="CPF, e-mail ou telefone" />
        </FormField>
        <FormField id="address" label="Endereço" optional className="sm:col-span-2">
          <input name="address" autoComplete="street-address" value={form.address} onChange={onText} />
        </FormField>
      </Section>

      <Section icon={KeyRound} title="Acesso ao sistema" subtitle={`Como o ${cfg.nome} vai entrar no CRM`}>
        <FormField id="username" label="Usuário" required error={erros.username}
          hint="Usado para entrar no sistema. Sem espaços." className="sm:col-span-2">
          <input name="username" autoComplete="off" autoCapitalize="none" value={form.username}
            onChange={(e) => set("username", e.target.value.replace(/\s/g, ""))} placeholder="joao.pereira" />
        </FormField>
        <FormField id="password" label="Senha" required error={erros.password} hint="Pelo menos 6 caracteres." semClonar>
          <div className="crm-password">
            <input id="password" name="password" type={verSenha ? "text" : "password"} autoComplete="new-password"
              aria-invalid={erros.password ? true : undefined}
              aria-describedby={erros.password ? "password-erro password-dica" : "password-dica"}
              value={form.password} onChange={onText} />
            <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Esconder senha" : "Mostrar senha"} aria-pressed={verSenha}>
              {verSenha ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </FormField>
        <FormField id="confirmPassword" label="Repita a senha" required
          error={erros.confirmPassword || (confirmou && !senhasIguais ? "As duas senhas ainda não são iguais." : undefined)}
          ok={confirmou && senhasIguais ? "As senhas são iguais." : undefined}>
          <input name="confirmPassword" type={verSenha ? "text" : "password"} autoComplete="new-password"
            value={form.confirmPassword} onChange={onText} />
        </FormField>
      </Section>

      <FormActions loading={loading} icon={UserCheck} submitLabel={`Cadastrar ${cfg.nome}`} loadingLabel="Cadastrando…" cancelHref={cfg.lista} />
    </form>
  );
}
