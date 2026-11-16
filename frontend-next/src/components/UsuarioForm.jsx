"use client";

import { useRef, useState } from "react";
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
const ORDEM = ["first_name", "last_name", "telefone", "email", "creci", "pix_account", "address", "username", "password", "confirmPassword"];
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mesma regra do Go (internal/validacao): minúsculas sem acento, números e . _ - @.
const USUARIO_OK = /^[a-z0-9._@-]{3,60}$/;
// Tira acento e o que não pode ir no nome de usuário ("João Silva" → "joaosilva").
const limparUsuario = (v) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9._@-]/g, "");
const MAX = 255; // tamanho das colunas no banco

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

// `inicial` presente = edição (PUT em /:id). Na edição a senha é opcional:
// em branco mantém a atual.
export function UsuarioForm({ tipo = "corretor", inicial = null }) {
  const cfg = TIPOS[tipo];
  const editando = !!inicial?.id;
  const router = useRouter();
  const [form, setForm] = useState(() => (editando
    ? { ...VAZIO, ...Object.fromEntries(Object.keys(VAZIO).map((k) => [k, k === "telefone" ? maskPhone(inicial[k] || "") : (inicial[k] ?? "")])), password: "", confirmPassword: "" }
    : VAZIO));
  const enviando = useRef(false); // trava contra dois cliques antes do React desabilitar o botão
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
    const sugestaoAntiga = limparUsuario(form.email.split("@")[0]);
    set("email", email);
    if (!editando && (!form.username || form.username === sugestaoAntiga)) {
      setForm((p) => ({ ...p, username: limparUsuario(email.split("@")[0]) }));
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
    else if (!USUARIO_OK.test(form.username)) novos.username = "Use de 3 a 60 letras minúsculas sem acento, números, ponto, hífen ou sublinhado.";
    if (!editando || form.password) {
      if (form.password.length < 6) novos.password = "A senha precisa ter pelo menos 6 caracteres.";
      if (!senhasIguais) novos.confirmPassword = "As duas senhas não são iguais.";
    }
    if (Object.keys(novos).length) {
      setErros(novos);
      focarPrimeiroErro(novos, ORDEM);
      return;
    }

    if (enviando.current) return;
    enviando.current = true;
    const fd = new FormData();
    // Na edição o campo vazio vai vazio (apaga o valor); no cadastro, vazio não vai.
    const put = (k, v) => { const t = (v ?? "").toString().trim(); if (editando || t !== "") fd.append(k, t); };
    put("first_name", form.first_name);
    put("last_name", form.last_name);
    put("telefone", form.telefone);
    put("email", form.email);
    if (cfg.creci) put("creci", form.creci);
    put("pix_account", form.pix_account);
    put("address", form.address);
    put("username", form.username);
    if (form.password) fd.append("password", form.password);

    setLoading(true);
    try {
      const res = await fetch(editando ? `${cfg.endpoint}/${inicial.id}` : cfg.endpoint, { method: editando ? "PUT" : "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // O Go diz qual campo está errado (`campo`): a mensagem vai embaixo dele.
        if (data.campo && ORDEM.includes(data.campo)) {
          const e = { [data.campo]: data.error };
          setErros(e);
          focarPrimeiroErro(e, ORDEM);
          return;
        }
        throw new Error(data.message || data.error || `Erro (${res.status})`);
      }
      if (editando) toast.success("Alterações salvas.");
      else toast.success(`${form.first_name.trim()} já pode entrar no sistema.`, {
        description: `Entra com o e-mail ${form.email.trim().toLowerCase()} e a senha que você criou.`,
        action: { label: "Cadastrar outro", onClick: () => router.push(cfg.novo) },
        duration: 8000,
      });
      router.push(cfg.lista);
      router.refresh();
    } catch (err) {
      setError(err.message || `Não foi possível cadastrar o ${cfg.nome}. Tente de novo.`);
      (document.getElementById("conteudo") || window).scrollTo({ top: 0, behavior: "smooth" }); // a página rola dentro do <main> do layout
    } finally {
      enviando.current = false;
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="crm-form crm-form-composed mx-auto max-w-3xl space-y-5">
      {error && <FormAlert titulo="Não deu para salvar">{error}</FormAlert>}

      <Section icon={User} title="Dados da pessoa" subtitle="Quem é e como falar com ela">
        <FormField id="first_name" label="Nome" required error={erros.first_name}>
          <input name="first_name" maxLength={MAX} autoComplete="given-name" value={form.first_name} onChange={onText} placeholder="Ex.: João" />
        </FormField>
        <FormField id="last_name" label="Sobrenome" optional error={erros.last_name}>
          <input name="last_name" maxLength={MAX} autoComplete="family-name" value={form.last_name} onChange={onText} placeholder="Ex.: Pereira" />
        </FormField>
        <FormField id="telefone" label="Telefone (WhatsApp)" required error={erros.telefone}>
          <input name="telefone" type="tel" inputMode="tel" autoComplete="tel" value={form.telefone}
            onChange={(e) => set("telefone", maskPhone(e.target.value))} placeholder="(61) 99999-9999" />
        </FormField>
        <FormField id="email" label="E-mail" required error={erros.email}>
          <input name="email" type="email" maxLength={MAX} inputMode="email" autoComplete="email" value={form.email} onChange={onEmail} placeholder="joao@email.com" />
        </FormField>
        {cfg.creci && (
          <FormField id="creci" label="CRECI" optional error={erros.creci}>
            <input name="creci" maxLength={MAX} value={form.creci} onChange={onText} placeholder="Ex.: 12345-F" />
          </FormField>
        )}
        <FormField id="pix_account" label="Chave PIX" optional hint="Para receber comissões." error={erros.pix_account}>
          <input name="pix_account" maxLength={MAX} value={form.pix_account} onChange={onText} placeholder="CPF, e-mail ou telefone" />
        </FormField>
        <FormField id="address" label="Endereço" optional className="sm:col-span-2" error={erros.address}>
          <input name="address" maxLength={MAX} autoComplete="street-address" value={form.address} onChange={onText} />
        </FormField>
      </Section>

      <Section icon={KeyRound} title="Acesso ao sistema" subtitle={`Como o ${cfg.nome} vai entrar no CRM`}>
        <FormField id="username" label="Usuário" required error={erros.username}
          hint="Aparece na lista da equipe. Só letras sem acento, números e ponto. Para entrar no sistema, a pessoa usa o e-mail." className="sm:col-span-2">
          <input name="username" autoComplete="off" autoCapitalize="none" maxLength={60} value={form.username}
            onChange={(e) => set("username", limparUsuario(e.target.value))} placeholder="joao.pereira" />
        </FormField>
        <FormField id="password" label={editando ? "Nova senha" : "Senha"} required={!editando} optional={editando} error={erros.password}
          hint={editando ? "Deixe em branco para manter a senha atual." : "Pelo menos 6 caracteres."} semClonar>
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
        <FormField id="confirmPassword" label="Repita a senha" required={!editando} optional={editando}
          error={erros.confirmPassword || (confirmou && !senhasIguais ? "As duas senhas ainda não são iguais." : undefined)}
          ok={confirmou && senhasIguais ? "As senhas são iguais." : undefined}>
          <input name="confirmPassword" type={verSenha ? "text" : "password"} autoComplete="new-password"
            value={form.confirmPassword} onChange={onText} />
        </FormField>
      </Section>

      <FormActions loading={loading} icon={UserCheck} submitLabel={editando ? "Salvar alterações" : `Cadastrar ${cfg.nome}`}
        loadingLabel={editando ? "Salvando…" : "Cadastrando…"} cancelHref={cfg.lista} />
    </form>
  );
}
