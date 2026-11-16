"use client";

import { FormIntro } from "@/components/ui/form-intro";
import { focarPrimeiroErro } from "@/components/ui/form-field";
import { cnpjValido, emailValido } from "@/lib/validar";
import { maskCep, maskCnpj, maskPhone, soDigitos } from "@/lib/masks";
import { Building, CheckCircle2, AlertCircle } from "@/components/icons";

import { useEffect, useRef, useState } from "react";

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const MASCARAS = { cnpj: maskCnpj, telefone: maskPhone, cep: maskCep };

// O backend devolve o caminho do logo ("/uploads/tenants/1/logo_….png"); o
// navegador chega lá pelo proxy do Next.
const logoUrl = (path) => (path ? `/api/backend${path.startsWith("/") ? "" : "/"}${path}` : null);

// Client Component: form de edição das configurações do tenant, via proxy
// `/api/backend/tenant-settings/settings`. O identificador interno (slug)
// não aparece: não é editável e não diz nada para quem usa.
export function ConfiguracoesEmpresaForm({ initialData }) {
  const [form, setForm] = useState({
    nome: initialData?.nome || "",
    cnpj: maskCnpj(initialData?.cnpj || ""),
    email: initialData?.email || "",
    telefone: maskPhone(initialData?.telefone || ""),
    endereco: initialData?.endereco || "",
    cidade: initialData?.cidade || "",
    estado: initialData?.estado || "",
    cep: maskCep(initialData?.cep || ""),
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [erros, setErros] = useState({});
  const [saving, setSaving] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [logo, setLogo] = useState(logoUrl(initialData?.logo));
  const [logoFalhou, setLogoFalhou] = useState(false);
  const [logoMsg, setLogoMsg] = useState({ type: "", text: "" });
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const inputLogo = useRef(null);

  // Cancela a busca de CEP se a pessoa sair da tela no meio.
  const cepAbort = useRef(null);
  useEffect(() => () => cepAbort.current?.abort(), []);

  // Cidade e UF pelo CEP (ViaCEP, chamado do navegador). Falhou? Em silêncio:
  // a pessoa preenche à mão, como antes.
  const buscarCep = async (cep) => {
    cepAbort.current?.abort();
    const ctrl = new AbortController();
    cepAbort.current = ctrl;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: ctrl.signal });
      if (!res.ok) return;
      const d = await res.json();
      if (d?.erro) return;
      setForm((p) => ({
        ...p,
        cidade: d.localidade || p.cidade,
        estado: d.uf || p.estado,
        endereco: p.endereco || [d.logradouro, d.bairro].filter(Boolean).join(", "),
      }));
    } catch {
      // sem rede, CEP inexistente ou cancelado: segue sem preencher
    } finally {
      if (cepAbort.current === ctrl) setBuscandoCep(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const mascara = MASCARAS[name];
    const valor = mascara ? mascara(value) : value;
    setForm((p) => ({ ...p, [name]: valor }));
    setErros((p) => (p[name] ? { ...p, [name]: undefined } : p));
    if (message.type === "success") setMessage({ type: "", text: "" });
    if (name === "cep" && soDigitos(valor).length === 8 && soDigitos(valor) !== soDigitos(form.cep)) {
      buscarCep(soDigitos(valor));
    }
  };

  const enviarLogo = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoMsg({ type: "", text: "" });
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) {
      setLogoMsg({ type: "error", text: "Use uma imagem PNG, JPG ou WEBP." });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setLogoMsg({ type: "error", text: "O logo deve ter no máximo 5 MB." });
      return;
    }
    setEnviandoLogo(true);
    try {
      const fd = new FormData();
      fd.append("logo", f);
      const res = await fetch("/api/backend/tenant-settings/settings/logo", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Não foi possível enviar o logo.");
      setLogo(logoUrl(data?.logo));
      setLogoFalhou(false);
      setLogoMsg({ type: "success", text: "Logo atualizado." });
    } catch (err) {
      setLogoMsg({ type: "error", text: err.message || "Não foi possível enviar o logo." });
    } finally {
      setEnviandoLogo(false);
      if (inputLogo.current) inputLogo.current.value = "";
    }
  };

  // Ordem dos campos na tela, para levar o foco ao primeiro erro.
  const ORDEM = ["settings-nome", "settings-cnpj", "settings-telefone", "settings-email", "settings-cep", "settings-endereco", "settings-cidade", "settings-estado"];
  const validar = () => {
    const e = {};
    if (!form.nome.trim()) e.nome = "Escreva o nome da empresa.";
    if (form.cnpj && !cnpjValido(form.cnpj)) e.cnpj = "CNPJ inválido. Confira os números.";
    const tel = soDigitos(form.telefone);
    if (tel && (tel.length < 10 || tel.length > 11)) e.telefone = "Escreva o telefone com DDD.";
    if (!form.email.trim()) e.email = "Escreva o e-mail da empresa.";
    else if (!emailValido(form.email)) e.email = "Confira o e-mail. Exemplo: contato@imobiliaria.com";
    if (form.cep && soDigitos(form.cep).length !== 8) e.cep = "O CEP tem 8 números. Exemplo: 70000-000";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setMessage({ type: "", text: "" });
    const novos = validar();
    if (Object.keys(novos).length) {
      setErros(novos);
      focarPrimeiroErro(Object.fromEntries(Object.keys(novos).map((k) => [`settings-${k}`, true])), ORDEM);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/backend/tenant-settings/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.campo && ORDEM.includes(`settings-${data.campo}`)) {
          setErros({ [data.campo]: data.error });
          focarPrimeiroErro({ [`settings-${data.campo}`]: true }, ORDEM);
          throw new Error("Confira o campo marcado.");
        }
        throw new Error(data.error || "Não foi possível salvar. Confira os dados e tente de novo.");
      }
      setMessage({ type: "success", text: "Pronto! Os dados da empresa foram salvos." });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Não foi possível salvar. Tente de novo." });
    } finally {
      setSaving(false);
    }
  };

  const mostrarLogo = logo && !logoFalhou;

  return (
    <form onSubmit={handleSubmit} noValidate className="crm-form crm-form-composed space-y-4">
      <div className="crm-card rounded-xl border border-cx-border bg-cx-surface p-5 space-y-4">
        <FormIntro title="Logo da empresa" description="Aparece no topo dos documentos que você gera pelo sistema." />
        <div className="flex flex-wrap items-center gap-4">
          <span className="empresa-logo">
            {mostrarLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt="Logo atual da empresa"
                ref={(img) => { if (img && img.complete && img.naturalWidth === 0) setLogoFalhou(true); }}
                onError={() => setLogoFalhou(true)}
              />
            ) : (
              <Building className="h-6 w-6" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <label htmlFor="settings-logo" className="block text-sm text-cx-muted mb-2">
              {mostrarLogo ? "Trocar o logo" : "Enviar o logo"}
            </label>
            <input
              ref={inputLogo}
              id="settings-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={enviarLogo}
              disabled={enviandoLogo}
              aria-describedby="settings-logo-dica"
              className="block w-full text-sm text-cx-muted file:mr-3 file:rounded-lg file:border-0 file:bg-cx-blue-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-cx-blue hover:file:bg-cx-border"
            />
            <p id="settings-logo-dica" className="form-dica">
              {enviandoLogo ? "Enviando…" : "PNG, JPG ou WEBP, até 5 MB. Salva na hora, sem precisar clicar em Salvar."}
            </p>
            {logoMsg.text && (
              <p role={logoMsg.type === "success" ? "status" : "alert"} className="form-aviso mt-2" data-tom={logoMsg.type === "success" ? "ok" : "erro"}>
                {logoMsg.text}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="crm-card grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-cx-border bg-cx-surface p-5">
        <div className="md:col-span-2"><FormIntro title="Dados da empresa" description="Nome e contatos que seus clientes vão ver." /></div>
        <Field label="Nome da empresa" name="nome" value={form.nome} onChange={handleChange} className="md:col-span-2" erro={erros.nome} maxLength={255} />
        <Field label="CNPJ" name="cnpj" value={form.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" inputMode="numeric" erro={erros.cnpj} />
        <Field label="Telefone" name="telefone" value={form.telefone} onChange={handleChange} placeholder="(00) 00000-0000" type="tel" erro={erros.telefone} />
        <Field label="E-mail" name="email" value={form.email} onChange={handleChange} type="email" className="md:col-span-2" erro={erros.email} maxLength={255} />
      </div>

      <div className="crm-card grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-cx-border bg-cx-surface p-5">
        <div className="md:col-span-2"><FormIntro title="Endereço" description="Digite o CEP: cidade e estado são preenchidos sozinhos." /></div>
        <Field
          label="CEP"
          name="cep"
          value={form.cep}
          onChange={handleChange}
          placeholder="00000-000"
          inputMode="numeric"
          dica={buscandoCep ? "Buscando o endereço…" : null}
          erro={erros.cep}
        />
        <div className="hidden md:block" aria-hidden="true" />
        <Field label="Endereço" name="endereco" value={form.endereco} onChange={handleChange} placeholder="Rua, número e bairro" className="md:col-span-2" erro={erros.endereco} maxLength={255} />
        <Field label="Cidade" name="cidade" value={form.cidade} onChange={handleChange} erro={erros.cidade} maxLength={255} />
        <div>
          <label htmlFor="settings-estado" className="block text-sm text-cx-muted mb-2">Estado</label>
          <select
            id="settings-estado"
            name="estado"
            value={form.estado}
            onChange={handleChange}
            className="w-full rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text outline-none focus:border-caixa-orange/50"
          >
            <option value="">Selecione</option>
            {ESTADOS.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-acoes">
        <button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar dados da empresa"}
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

function Field({ label, name, value, onChange, type = "text", placeholder, inputMode, dica, erro, maxLength, className = "" }) {
  const ids = [erro && `settings-${name}-erro`, dica && `settings-${name}-dica`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={`settings-${name}`} className="block text-sm text-cx-muted mb-2">{label}</label>
      <input
        type={type}
        id={`settings-${name}`}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={erro ? true : undefined}
        aria-describedby={ids}
        className="w-full rounded-lg border border-cx-border bg-cx-surface px-3 py-2 text-sm text-cx-text outline-none focus:border-caixa-orange/50"
      />
      {erro && (
        <p id={`settings-${name}-erro`} className="crm-field-error" role="alert">
          <AlertCircle aria-hidden="true" /> {erro}
        </p>
      )}
      {dica && <p id={`settings-${name}-dica`} className="form-dica" role="status">{dica}</p>}
    </div>
  );
}
