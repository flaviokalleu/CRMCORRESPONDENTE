"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2, FileText, ImagePlus, Star, KeyRound, Save, Coins,
} from "@/components/icons";
import { TIPOS_PADRAO, imovelImageUrl } from "@/lib/imovel-meta";
import { soDigitos } from "@/lib/masks";
import { FormField, FormAlert, focarPrimeiroErro } from "@/components/ui/form-field";
import { MoneyInput } from "@/components/ui/money-input";
import { FormActions, QuickChoice } from "@/components/ui/form-actions";
import { Dropzone } from "@/components/ui/dropzone";

// Form de imóvel (criação + edição). Envia multipart/form-data — o backend Go
// lê via c.GetPostForm; JSON chega vazio. Uploads: imagem_capa (1), imagens (N),
// documentacao (1). Booleans vão como "true"/"false" (parseBoolVal aceita true/1).
// valor_venda / valor_avaliacao vão em reais inteiros, só dígitos.

const SITUACOES = [
  { value: "disponivel", label: "Disponível" },
  { value: "reservado", label: "Reservado" },
  { value: "vendido", label: "Vendido" },
  { value: "alugado", label: "Alugado" },
  { value: "indisponivel", label: "Indisponível" },
];

// Escolha rápida: "4+" grava 4; quem tem mais digita no campo ao lado.
const CONTAGEM = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4+" },
];

const formatMilhar = (digits) => {
  const d = soDigitos(digits);
  return d ? Number(d).toLocaleString("pt-BR") : "";
};

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="crm-form-section crm-card">
      <header className="flex items-center gap-3 border-b">
        <span className="flex shrink-0 items-center justify-center border">
          <Icon aria-hidden="true" />
        </span>
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function SwitchRow({ checked, onChange, title, desc, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-cx-border bg-cx-surface px-4 py-3">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="h-4 w-4 text-cx-muted" aria-hidden="true" />}
        <div>
          <p className="text-sm font-medium text-cx-text">{title}</p>
          {desc && <p className="text-xs text-cx-muted">{desc}</p>}
        </div>
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={title} onClick={() => onChange(!checked)}
        className="relative h-6 w-11 shrink-0 rounded-full">
        <span className="absolute h-5 w-5 rounded-full bg-white" />
      </button>
    </div>
  );
}

// Quartos/banheiros: pílulas 1/2/3/4+ e, ao lado, campo para números maiores.
function Contagem({ id, value, onChange, label }) {
  const outro = Number(value) > 4;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <QuickChoice id={id} label={label} value={outro ? "" : value} onChange={onChange} opcoes={CONTAGEM} />
      <input
        aria-label={`${label}: outro número`}
        className="crm-count-other"
        inputMode="numeric"
        placeholder="Outro"
        value={outro ? value : ""}
        onChange={(e) => onChange(soDigitos(e.target.value).slice(0, 2))}
      />
    </div>
  );
}

function buildInitial(initial) {
  const c = initial || {};
  return {
    nome_imovel: c.nome_imovel ?? "",
    tipo: c.tipo ?? "",
    situacao_imovel: (c.situacao_imovel ?? "disponivel").toString().toLowerCase(),
    endereco: c.endereco ?? "",
    localizacao: c.localizacao ?? "",
    quartos: c.quartos != null && Number(c.quartos) > 0 ? String(c.quartos) : "",
    banheiro: c.banheiro != null && Number(c.banheiro) > 0 ? String(c.banheiro) : "",
    vendaDigits: soDigitos(c.valor_venda != null ? String(Math.round(Number(c.valor_venda))) : ""),
    avalDigits: soDigitos(c.valor_avaliacao != null ? String(Math.round(Number(c.valor_avaliacao))) : ""),
    exclusivo: !!c.exclusivo,
    tem_inquilino: !!c.tem_inquilino,
    descricao_imovel: c.descricao_imovel ?? "",
    observacoes: c.observacoes ?? "",
    tags: c.tags ?? "",
  };
}

// O Go recusa sem nome, endereço ou tipo ("Dados inválidos").
const ORDEM_CAMPOS = ["nome_imovel", "tipo", "situacao_imovel", "endereco", "localizacao", "quartos", "banheiro", "valor_venda", "valor_avaliacao", "descricao_imovel", "observacoes", "tags", "imagem_capa", "documentacao", "imagens"];
const FOTOS = "image/jpeg,image/png,image/webp";

export function ImovelForm({ mode = "create", imovelId, initial }) {
  const router = useRouter();
  const [form, setForm] = useState(() => buildInitial(initial));
  const [capa, setCapa] = useState([]);
  const [galeria, setGaleria] = useState([]);
  const [documentacao, setDocumentacao] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [erros, setErros] = useState({});
  // Trava contra clique duplo: o estado `loading` só desabilita o botão no
  // próximo render, e dois cliques rápidos criavam dois imóveis.
  const enviando = useRef(false);

  const set = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    const chave = name === "vendaDigits" ? "valor_venda" : name;
    setErros((p) => (p[chave] ? { ...p, [chave]: undefined } : p));
  };
  const onText = (e) => set(e.target.name, e.target.value);

  // Imagens já existentes (modo edição).
  const imagensExistentes = useMemo(() => {
    const arr = Array.isArray(initial?.imagens) ? initial.imagens : [];
    return arr.map((p) => imovelImageUrl(p)).filter(Boolean);
  }, [initial]);
  const capaExistente = initial?.imagem_capa ? imovelImageUrl(initial.imagem_capa) : null;

  const tiposOptions = useMemo(() => {
    const set = new Set(TIPOS_PADRAO);
    if (form.tipo) set.add(form.tipo);
    return [...set];
  }, [form.tipo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviando.current) return;
    setError("");

    const novos = {};
    if (!form.nome_imovel.trim()) novos.nome_imovel = "Dê um nome para reconhecer o imóvel.";
    if (!form.tipo) novos.tipo = "Escolha o tipo do imóvel.";
    if (!form.endereco.trim()) novos.endereco = "Escreva a rua, o número e o bairro.";
    if (!form.vendaDigits || Number(form.vendaDigits) <= 0) novos.valor_venda = "Informe o valor de venda.";
    if (Object.keys(novos).length) {
      setErros(novos);
      focarPrimeiroErro(novos, ORDEM_CAMPOS);
      return;
    }

    const fd = new FormData();
    // Na edição o campo apagado vai vazio, para o backend limpar o valor
    // (antes era omitido e o valor antigo voltava).
    const put = (k, v) => {
      const vazio = v === undefined || v === null || v.toString().trim() === "";
      if (!vazio || mode === "edit") fd.append(k, vazio ? "" : v);
    };

    put("nome_imovel", form.nome_imovel);
    put("tipo", form.tipo);
    put("situacao_imovel", form.situacao_imovel);
    put("endereco", form.endereco);
    put("localizacao", form.localizacao);
    put("quartos", soDigitos(form.quartos) || "0");
    put("banheiro", soDigitos(form.banheiro) || "0");
    put("valor_venda", form.vendaDigits);
    put("valor_avaliacao", form.avalDigits);
    fd.append("exclusivo", form.exclusivo ? "true" : "false");
    fd.append("tem_inquilino", form.tem_inquilino ? "true" : "false");
    put("descricao_imovel", form.descricao_imovel);
    put("observacoes", form.observacoes);
    put("tags", form.tags);

    if (capa[0]) fd.append("imagem_capa", capa[0]);
    galeria.forEach((f) => fd.append("imagens", f));
    if (documentacao[0]) fd.append("documentacao", documentacao[0]);

    enviando.current = true;
    setLoading(true);
    try {
      const url = mode === "edit" ? `/api/backend/imoveis/${imovelId}` : "/api/backend/imoveis/";
      const res = await fetch(url, { method: mode === "edit" ? "PUT" : "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error || data.message || "Não foi possível salvar o imóvel. Tente de novo.";
        // Erro de um campo: mostra embaixo dele e leva o foco até lá.
        if (data.campo && ORDEM_CAMPOS.includes(data.campo)) {
          setErros({ [data.campo]: msg });
          focarPrimeiroErro({ [data.campo]: msg }, ORDEM_CAMPOS);
          return;
        }
        throw new Error(msg);
      }
      const saved = await res.json().catch(() => ({}));
      router.refresh();
      if (mode === "create") {
        toast.success("Imóvel cadastrado.", {
          action: { label: "Cadastrar outro", onClick: () => router.push("/imoveis/adicionar") },
          duration: 8000,
        });
        router.push(saved?.id ? `/imovel/${saved.id}` : "/imoveis/lista");
      } else {
        // As fotos novas já subiram: limpa a escolha para não reenviar
        // as mesmas fotos (duplicadas) num segundo "Salvar".
        setCapa([]);
        setGaleria([]);
        setDocumentacao([]);
        toast.success("Alterações salvas.");
      }
    } catch (err) {
      setError(err.message || "Não foi possível salvar o imóvel. Tente de novo.");
      (document.getElementById("conteudo") || window).scrollTo({ top: 0, behavior: "smooth" }); // a página rola dentro do <main> do layout
    } finally {
      enviando.current = false;
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="crm-form crm-form-composed mx-auto max-w-3xl space-y-5">
      {error && <FormAlert titulo="Não deu para salvar">{error}</FormAlert>}

      <Section icon={Building2} title="Dados do imóvel" subtitle="Como reconhecer e onde fica">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="nome_imovel" label="Nome do imóvel" required error={erros.nome_imovel}
            hint="Um nome curto para achar depois na lista." className="sm:col-span-2">
            <input name="nome_imovel" maxLength={255} value={form.nome_imovel} onChange={onText} placeholder="Ex.: Apartamento Jardim Europa" />
          </FormField>
          <FormField id="tipo" label="Tipo" required error={erros.tipo}>
            <select name="tipo" value={form.tipo} onChange={onText}>
              <option value="">Escolha o tipo</option>
              {tiposOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField id="situacao_imovel" label="Situação" error={erros.situacao_imovel}>
            <select name="situacao_imovel" value={form.situacao_imovel} onChange={onText}>
              {SITUACOES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FormField>
          <FormField id="endereco" label="Rua, número e bairro" required error={erros.endereco} className="sm:col-span-2">
            <input name="endereco" maxLength={255} autoComplete="street-address" value={form.endereco} onChange={onText} placeholder="Ex.: Rua das Flores, 123, Centro" />
          </FormField>
          <FormField id="localizacao" label="Cidade – UF" error={erros.localizacao} className="sm:col-span-2">
            <input name="localizacao" maxLength={255} value={form.localizacao} onChange={onText} placeholder="Ex.: Valparaíso de Goiás – GO" />
          </FormField>
          <div className="crm-field">
            <p className="crm-field-label">Quartos</p>
            <Contagem id="quartos" label="Quartos" value={form.quartos} onChange={(v) => set("quartos", v)} />
            {erros.quartos && <p className="crm-field-error" role="alert">{erros.quartos}</p>}
          </div>
          <div className="crm-field">
            <p className="crm-field-label">Banheiros</p>
            <Contagem id="banheiro" label="Banheiros" value={form.banheiro} onChange={(v) => set("banheiro", v)} />
            {erros.banheiro && <p className="crm-field-error" role="alert">{erros.banheiro}</p>}
          </div>
        </div>
      </Section>

      <Section icon={Coins} title="Valores" subtitle="Preço e disponibilidade">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="valor_venda" label="Valor de venda" required error={erros.valor_venda}>
            <MoneyInput semCentavos value={formatMilhar(form.vendaDigits)} onChange={(v) => set("vendaDigits", soDigitos(v))} placeholder="300.000" />
          </FormField>
          <FormField id="valor_avaliacao" label="Valor de avaliação" optional error={erros.valor_avaliacao} hint="Quanto o banco avaliou, se já souber.">
            <MoneyInput semCentavos value={formatMilhar(form.avalDigits)} onChange={(v) => set("avalDigits", soDigitos(v))} placeholder="320.000" />
          </FormField>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SwitchRow icon={Star} title="Imóvel exclusivo" desc="Só a sua imobiliária vende" checked={form.exclusivo} onChange={(v) => set("exclusivo", v)} />
          <SwitchRow icon={KeyRound} title="Tem inquilino morando" desc="O imóvel está alugado agora" checked={form.tem_inquilino} onChange={(v) => set("tem_inquilino", v)} />
        </div>
      </Section>

      <Section icon={FileText} title="Descrição" subtitle="Diferenciais e anotações">
        <div className="space-y-4">
          <FormField id="descricao_imovel" label="Descrição" optional error={erros.descricao_imovel}>
            <textarea name="descricao_imovel" maxLength={10000} value={form.descricao_imovel} onChange={onText} rows={3} placeholder="Diferenciais, acabamento, lazer…" />
          </FormField>
          <FormField id="observacoes" label="Anotações internas" optional error={erros.observacoes} hint="Só a equipe vê. O cliente não vê.">
            <textarea name="observacoes" maxLength={10000} value={form.observacoes} onChange={onText} rows={2} />
          </FormField>
          <FormField id="tags" label="Palavras-chave" optional error={erros.tags} hint="Separe por vírgula. Ajudam a achar o imóvel na busca.">
            <input name="tags" maxLength={255} value={form.tags} onChange={onText} placeholder="piscina, financiável, aceita permuta" />
          </FormField>
        </div>
      </Section>

      <Section icon={ImagePlus} title="Fotos e documentos" subtitle="Capa, galeria e documentação">
        {(capaExistente || imagensExistentes.length > 0) && (
          <div className="crm-field mb-4">
            <p className="crm-field-label">Fotos atuais</p>
            <div className="crm-thumbs">
              {capaExistente && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capaExistente} alt="Capa atual" />
              )}
              {imagensExistentes.map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt={`Foto ${i + 1}`} />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="crm-field">
            <p className="crm-field-label">Foto de capa</p>
            {erros.imagem_capa && <p className="crm-field-error" role="alert">{erros.imagem_capa}</p>}
            <Dropzone id="imagem_capa" imagem accept={FOTOS} files={capa} onChange={setCapa} texto="Toque para escolher a foto principal" />
          </div>
          <div className="crm-field">
            <p className="crm-field-label">Documentação (PDF)</p>
            {erros.documentacao && <p className="crm-field-error" role="alert">{erros.documentacao}</p>}
            <Dropzone id="documentacao" accept={`application/pdf,${FOTOS}`} files={documentacao} onChange={setDocumentacao} texto="Toque para escolher o documento" />
          </div>
        </div>

        <div className="crm-field mt-4">
          <p className="crm-field-label">Mais fotos</p>
          {erros.imagens && <p className="crm-field-error" role="alert">{erros.imagens}</p>}
          <Dropzone id="imagens" imagem multiple accept={FOTOS} files={galeria} onChange={setGaleria} texto="Toque para escolher várias fotos" />
        </div>
      </Section>

      <FormActions
        loading={loading}
        icon={Save}
        submitLabel={mode === "edit" ? "Salvar alterações" : "Cadastrar imóvel"}
      />
    </form>
  );
}
