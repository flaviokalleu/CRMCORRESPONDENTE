"use client";

import { FormIntro } from "@/components/ui/form-intro";
import { FormField, focarPrimeiroErro } from "@/components/ui/form-field";
import { userPhotoUrl } from "@/lib/user-avatar";
import { maskPhone, soDigitos } from "@/lib/masks";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, AlertCircle } from "@/components/icons";

import { useEffect, useRef, useState } from "react";

// Client Component: perfil do usuário logado, via proxy `/api/backend/user`.
// Dados e foto: PUT /user/:id. Senha: PUT /user/me/senha, que exige a senha
// atual — o PUT /user/:id nunca aceitou senha (allow-list do Go), então a
// troca antiga dizia "salvo" e a senha continuava a mesma.
const ORDEM = ["settings-photo", "first_name", "last_name", "email", "telefone", "pix_account", "address", "senha_atual", "password", "confirmPassword"];
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = 255;

export function ConfiguracoesUsuarioForm({ initialUser }) {
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    id: initialUser?.id,
    first_name: initialUser?.first_name || "",
    last_name: initialUser?.last_name || "",
    email: initialUser?.email || "",
    telefone: maskPhone(initialUser?.telefone || ""),
    address: initialUser?.address || "",
    pix_account: initialUser?.pix_account || "",
  });
  // Foto: `arquivo` só existe enquanto o usuário acabou de escolher um; a
  // prévia mostra esse arquivo local, ou a foto já salva, ou o placeholder.
  const [arquivo, setArquivo] = useState(null);
  const [previa, setPrevia] = useState(userPhotoUrl(initialUser?.photo));
  const inputFoto = useRef(null);
  const [senha, setSenha] = useState({ senha_atual: "", password: "", confirmPassword: "" });
  const [erros, setErros] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  // A prévia local é uma object URL criada na hora da escolha. Guardamos a
  // última em um ref para revogar antes de criar a próxima — sem isso, cada
  // troca de arquivo vaza um blob na memória da aba.
  const blobAtual = useRef(null);
  useEffect(() => () => {
    if (blobAtual.current) URL.revokeObjectURL(blobAtual.current);
  }, []);

  const limparErro = (k) => setErros((p) => (p[k] ? { ...p, [k]: undefined } : p));

  const escolherFoto = (e) => {
    const f = e.target.files?.[0];
    limparErro("settings-photo");
    if (!f) return;
    const recusar = (texto) => {
      setErros((p) => ({ ...p, "settings-photo": texto }));
      e.target.value = "";
      setArquivo(null);
    };
    if (!f.type.startsWith("image/")) return recusar("Esse arquivo não é uma foto. Escolha uma imagem JPG ou PNG.");
    if (f.size > 5 * 1024 * 1024) return recusar("A foto deve ter no máximo 5 MB.");
    setMessage({ type: "", text: "" });
    if (blobAtual.current) URL.revokeObjectURL(blobAtual.current);
    blobAtual.current = URL.createObjectURL(f);
    setPrevia(blobAtual.current);
    setArquivo(f);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: name === "telefone" ? maskPhone(value) : value }));
    limparErro(name);
    if (message.type === "success") setMessage({ type: "", text: "" });
  };
  const mudarSenha = (e) => {
    const { name, value } = e.target;
    setSenha((p) => ({ ...p, [name]: value }));
    limparErro(name);
  };

  const trocandoSenha = !!(senha.senha_atual || senha.password || senha.confirmPassword);

  const validar = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "Escreva o seu nome.";
    if (!form.email.trim()) e.email = "Escreva o seu e-mail. É com ele que você entra no sistema.";
    else if (!EMAIL_OK.test(form.email.trim())) e.email = "Confira o e-mail. Exemplo: joao@email.com";
    const tel = soDigitos(form.telefone);
    if (tel && (tel.length < 10 || tel.length > 13)) e.telefone = "Escreva o celular com DDD. Exemplo: (61) 99999-9999";
    if (trocandoSenha) {
      if (!senha.senha_atual) e.senha_atual = "Para trocar a senha, digite a senha que você usa hoje.";
      if (senha.password.length < 6) e.password = "A nova senha precisa ter pelo menos 6 caracteres.";
      else if (senha.password !== senha.confirmPassword) e.confirmPassword = "As duas senhas não são iguais.";
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setMessage({ type: "", text: "" });
    const novos = validar();
    if (Object.keys(novos).length) {
      setErros(novos);
      focarPrimeiroErro(novos, ORDEM);
      return;
    }

    setSaving(true);
    // Erro do Go com `campo` vai para baixo do campo certo.
    const tratar = async (res) => {
      if (res.ok) return res.json().catch(() => null);
      const data = await res.json().catch(() => ({}));
      const campo = data.campo === "photo" ? "settings-photo" : data.campo;
      if (campo && ORDEM.includes(campo)) {
        setErros({ [campo]: data.error });
        focarPrimeiroErro({ [campo]: true }, ORDEM);
        throw new Error("");
      }
      throw new Error(data.error || "Não foi possível salvar. Confira os dados e tente de novo.");
    };
    try {
      // Com foto o envio precisa ser multipart (o Go lê c.FormFile("photo")).
      const dados = { ...form, email: form.email.trim().toLowerCase(), first_name: form.first_name.trim() };
      let res;
      if (arquivo) {
        const fd = new FormData();
        Object.entries(dados).forEach(([k, v]) => { if (k !== "id") fd.append(k, v ?? ""); });
        fd.append("photo", arquivo);
        res = await fetch(`/api/backend/user/${form.id}`, { method: "PUT", body: fd });
      } else {
        const { id: _id, ...payload } = dados;
        res = await fetch(`/api/backend/user/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const salvo = await tratar(res);
      if (salvo?.user?.photo) setPrevia(userPhotoUrl(salvo.user.photo));
      setArquivo(null);
      if (inputFoto.current) inputFoto.current.value = "";

      if (trocandoSenha) {
        await tratar(await fetch("/api/backend/user/me/senha", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senha_atual: senha.senha_atual, nova_senha: senha.password }),
        }));
        setSenha({ senha_atual: "", password: "", confirmPassword: "" });
      }
      setMessage({ type: "success", text: trocandoSenha ? "Pronto! Seus dados e sua nova senha foram salvos." : "Pronto! Seus dados foram salvos." });
      refresh(); // atualiza nome e foto no topo da tela
    } catch (err) {
      if (err.message) setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const campo = (name, label, props = {}) => (
    <FormField id={name} label={label} error={erros[name]} hint={props.hint} required={props.required} optional={props.optional} className={props.className}>
      <input name={name} value={form[name] || ""} onChange={handleChange} maxLength={MAX}
        type={props.type || "text"} placeholder={props.placeholder} autoComplete={props.autoComplete} inputMode={props.inputMode} />
    </FormField>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="crm-form crm-form-composed space-y-4">
      <div className="crm-card grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-cx-border bg-cx-surface p-5">
        <div className="md:col-span-2"><FormIntro title="Informações pessoais" description="Mantenha os dados de identificação e contato atualizados." /></div>

        <div className="md:col-span-2 flex items-center gap-4">
          <UserAvatar src={previa} name={`${form.first_name} ${form.last_name}`} size="lg" alt="Sua foto de perfil" />
          <FormField id="settings-photo" label="Foto de perfil" error={erros["settings-photo"]}
            hint="JPG ou PNG, até 5 MB. A foto aparece no topo da tela, na lista de clientes e no Kanban." className="min-w-0 flex-1">
            <input
              ref={inputFoto}
              name="photo"
              type="file"
              accept="image/*"
              onChange={escolherFoto}
              className="block w-full text-sm text-cx-muted file:mr-3 file:rounded-lg file:border-0 file:bg-cx-blue-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-cx-blue hover:file:bg-cx-border"
            />
          </FormField>
        </div>
        {campo("first_name", "Nome", { required: true, autoComplete: "given-name" })}
        {campo("last_name", "Sobrenome", { optional: true, autoComplete: "family-name" })}
        {campo("email", "E-mail", { required: true, type: "email", inputMode: "email", autoComplete: "email", hint: "É com ele que você entra no sistema." })}
        {campo("telefone", "Celular", { optional: true, type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "(00) 00000-0000" })}
        {campo("pix_account", "Chave PIX", { optional: true, hint: "Usada para receber suas comissões. Pode ser CPF, celular, e-mail ou chave aleatória." })}
        {campo("address", "Endereço", { optional: true, className: "md:col-span-2", autoComplete: "street-address", hint: "Rua, número, bairro e cidade. Aparece nos contratos e recibos." })}
      </div>

      <div className="crm-card grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-cx-border bg-cx-surface p-5">
        <div className="md:col-span-2"><FormIntro title="Trocar a senha" description="Preencha só se quiser mudar a senha. Para sua segurança, pedimos a senha atual." /></div>
        <FormField id="senha_atual" label="Senha atual" error={erros.senha_atual} className="md:col-span-2">
          <input name="senha_atual" type="password" autoComplete="current-password" value={senha.senha_atual} onChange={mudarSenha} />
        </FormField>
        <FormField id="password" label="Nova senha" error={erros.password} hint="Pelo menos 6 caracteres.">
          <input name="password" type="password" autoComplete="new-password" maxLength={72} value={senha.password} onChange={mudarSenha} />
        </FormField>
        <FormField id="confirmPassword" label="Repita a nova senha" error={erros.confirmPassword}>
          <input name="confirmPassword" type="password" autoComplete="new-password" maxLength={72} value={senha.confirmPassword} onChange={mudarSenha} />
        </FormField>
      </div>

      <div className="form-acoes">
        <button type="submit" disabled={saving} aria-busy={saving || undefined}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
        {message.text && (
          <p role={message.type === "success" ? "status" : "alert"} className="form-aviso" data-tom={message.type === "success" ? "ok" : "erro"}>
            {message.type === "success" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <AlertCircle className="h-4 w-4" aria-hidden="true" />}
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
