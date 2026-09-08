"use client";

import { FormIntro } from "@/components/ui/form-intro";
import { AVATAR_PLACEHOLDER, userPhotoUrl } from "@/lib/user-avatar";

import { useEffect, useRef, useState } from "react";

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
  // Foto: `arquivo` só existe enquanto o usuário acabou de escolher um; a
  // prévia mostra esse arquivo local, ou a foto já salva, ou o placeholder.
  const [arquivo, setArquivo] = useState(null);
  const [previa, setPrevia] = useState(userPhotoUrl(initialUser?.photo));
  const inputFoto = useRef(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  // A prévia local é uma object URL criada na hora da escolha. Guardamos a
  // última em um ref para revogar antes de criar a próxima — sem isso, cada
  // troca de arquivo vaza um blob na memória da aba. O efeito só cuida da
  // limpeza ao desmontar; criar a URL aqui evitaria um setState dentro de
  // efeito, que é o que a regra react-hooks/set-state-in-effect proíbe.
  const blobAtual = useRef(null);
  useEffect(() => () => {
    if (blobAtual.current) URL.revokeObjectURL(blobAtual.current);
  }, []);

  const escolherFoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Selecione um arquivo de imagem." });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "A foto deve ter no máximo 5 MB." });
      return;
    }
    setMessage({ type: "", text: "" });
    if (blobAtual.current) URL.revokeObjectURL(blobAtual.current);
    blobAtual.current = URL.createObjectURL(f);
    setPrevia(blobAtual.current);
    setArquivo(f);
  };

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
      // Com foto o envio precisa ser multipart (o Go lê o arquivo em
      // c.FormFile("photo")); sem foto, segue o JSON de sempre.
      let res;
      if (arquivo) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => { if (k !== "id") fd.append(k, v ?? ""); });
        if (password) fd.append("password", password);
        fd.append("photo", arquivo);
        res = await fetch(`/api/backend/user/${form.id}`, { method: "PUT", body: fd });
      } else {
        const payload = { ...form };
        if (password) payload.password = password;
        res = await fetch(`/api/backend/user/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error("Erro ao salvar informações");
      const salvo = await res.json().catch(() => null);
      if (salvo?.user?.photo) {
        // Nome do arquivo é fixo por usuário (usuario_{id}.ext), então o
        // navegador serviria a foto antiga do cache. O sufixo força a releitura.
        setPrevia(`${userPhotoUrl(salvo.user.photo)}?v=${Date.now()}`);
      }
      setArquivo(null);
      if (inputFoto.current) inputFoto.current.value = "";
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

        <div className="md:col-span-2 flex items-center gap-4">
          <span className="inline-flex h-16 w-16 shrink-0 overflow-hidden rounded-full border border-cx-border bg-cx-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previa || AVATAR_PLACEHOLDER}
              alt="Sua foto de perfil"
              width={64}
              height={64}
              className="h-full w-full object-cover"
              onError={(e) => { e.currentTarget.src = AVATAR_PLACEHOLDER; }}
            />
          </span>
          <div>
            <label htmlFor="settings-photo" className="block text-sm text-cx-muted mb-2">Foto de perfil</label>
            <input
              ref={inputFoto}
              id="settings-photo"
              name="photo"
              type="file"
              accept="image/*"
              onChange={escolherFoto}
              className="block w-full text-sm text-cx-muted file:mr-3 file:rounded-lg file:border-0 file:bg-cx-blue-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-cx-blue hover:file:bg-cx-border"
            />
            <p className="mt-1 text-xs text-cx-muted">JPG ou PNG, até 5 MB. A foto aparece na lista de clientes e no Kanban.</p>
          </div>
        </div>
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
