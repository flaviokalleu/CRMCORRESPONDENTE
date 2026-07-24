"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, MapPin, BedDouble, Bath, Tag, FileText, ImagePlus, Star,
  KeyRound, Save, Loader2, CheckCircle, AlertCircle, X, Coins, Home,
} from "lucide-react";
import { TIPOS_PADRAO, imovelImageUrl } from "@/lib/imovel-meta";

// Form de imóvel (criação + edição). Envia multipart/form-data — o backend Go
// lê via c.GetPostForm; JSON chega vazio. Uploads: imagem_capa (1), imagens (N),
// documentacao (1). Booleans vão como "true"/"false" (parseBoolVal aceita true/1).

const SITUACOES = [
  { value: "disponivel", label: "Disponível" },
  { value: "reservado", label: "Reservado" },
  { value: "vendido", label: "Vendido" },
  { value: "alugado", label: "Alugado" },
  { value: "indisponivel", label: "Indisponível" },
];

const onlyDigits = (s) => (s || "").toString().replace(/\D/g, "");
const formatMilhar = (digits) => {
  const d = onlyDigits(digits);
  if (!d) return "";
  return Number(d).toLocaleString("pt-BR");
};

const fieldCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-orange-500/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-orange-500/25 [&>option]:bg-[#0f1a30]";

function Label({ children, icon: Icon }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <header className="mb-4 flex items-center gap-3 border-b border-white/[0.07] pb-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/55">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-white">{title}</h3>
          {subtitle && <p className="text-[11px] text-white/40">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-orange-500" : "bg-white/15"}`}>
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

function SwitchRow({ checked, onChange, title, desc, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="h-4 w-4 text-white/40" />}
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          {desc && <p className="text-[11px] text-white/40">{desc}</p>}
        </div>
      </div>
      <Switch checked={checked} onChange={onChange} />
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
    quartos: c.quartos != null ? String(c.quartos) : "",
    banheiro: c.banheiro != null ? String(c.banheiro) : "",
    vendaDigits: onlyDigits(c.valor_venda != null ? String(Math.round(Number(c.valor_venda))) : ""),
    avalDigits: onlyDigits(c.valor_avaliacao != null ? String(Math.round(Number(c.valor_avaliacao))) : ""),
    exclusivo: !!c.exclusivo,
    tem_inquilino: !!c.tem_inquilino,
    descricao_imovel: c.descricao_imovel ?? "",
    observacoes: c.observacoes ?? "",
    tags: c.tags ?? "",
  };
}

export function ImovelForm({ mode = "create", imovelId, initial }) {
  const router = useRouter();
  const [form, setForm] = useState(() => buildInitial(initial));
  const [capa, setCapa] = useState(null);
  const [galeria, setGaleria] = useState([]);
  const [documentacao, setDocumentacao] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (name, value) => setForm((p) => ({ ...p, [name]: value }));
  const onText = (e) => set(e.target.name, e.target.value);

  const capaPreview = useMemo(() => (capa ? URL.createObjectURL(capa) : null), [capa]);
  const galeriaPreviews = useMemo(() => galeria.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })), [galeria]);

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
    setError("");
    setSuccess("");

    if (!form.nome_imovel.trim() || !form.endereco.trim() || !form.vendaDigits || !form.situacao_imovel) {
      setError("Preencha nome, endereço, valor de venda e situação.");
      return;
    }

    const fd = new FormData();
    const put = (k, v) => { if (v !== undefined && v !== null && v.toString().trim() !== "") fd.append(k, v); };

    put("nome_imovel", form.nome_imovel);
    put("tipo", form.tipo);
    put("situacao_imovel", form.situacao_imovel);
    put("endereco", form.endereco);
    put("localizacao", form.localizacao);
    put("quartos", onlyDigits(form.quartos) || "0");
    put("banheiro", onlyDigits(form.banheiro) || "0");
    put("valor_venda", form.vendaDigits);
    if (form.avalDigits) put("valor_avaliacao", form.avalDigits);
    fd.append("exclusivo", form.exclusivo ? "true" : "false");
    fd.append("tem_inquilino", form.tem_inquilino ? "true" : "false");
    put("descricao_imovel", form.descricao_imovel);
    put("observacoes", form.observacoes);
    put("tags", form.tags);

    if (capa) fd.append("imagem_capa", capa);
    galeria.forEach((f) => fd.append("imagens", f));
    if (documentacao) fd.append("documentacao", documentacao);

    setLoading(true);
    try {
      const url = mode === "edit" ? `/api/backend/imoveis/${imovelId}` : "/api/backend/imoveis/";
      const res = await fetch(url, { method: mode === "edit" ? "PUT" : "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.message || `Erro (${res.status})`);
      }
      const saved = await res.json().catch(() => ({}));
      setSuccess(mode === "edit" ? "Imóvel atualizado." : "Imóvel cadastrado.");
      router.refresh();
      if (mode === "create" && saved?.id) {
        router.push(`/imovel/${saved.id}`);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setError(err.message || "Erro ao salvar imóvel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-5">
      {(error || success) && (
        <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm ${success ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
          {success ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {success || error}
        </div>
      )}

      <Section icon={Building2} title="Dados do imóvel" subtitle="Identificação e características">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <Label icon={Home}>Nome do imóvel *</Label>
            <input name="nome_imovel" value={form.nome_imovel} onChange={onText} className={fieldCls} placeholder="Ex.: Apartamento Jardim Europa" required />
          </label>
          <label className="block">
            <Label icon={Building2}>Tipo</Label>
            <select name="tipo" value={form.tipo} onChange={onText} className={fieldCls}>
              <option value="">Selecione</option>
              {tiposOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block">
            <Label icon={KeyRound}>Situação *</Label>
            <select name="situacao_imovel" value={form.situacao_imovel} onChange={onText} className={fieldCls}>
              {SITUACOES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <Label icon={MapPin}>Endereço *</Label>
            <input name="endereco" value={form.endereco} onChange={onText} className={fieldCls} placeholder="Rua, número, bairro" required />
          </label>
          <label className="block sm:col-span-2">
            <Label icon={MapPin}>Localização (cidade/região)</Label>
            <input name="localizacao" value={form.localizacao} onChange={onText} className={fieldCls} placeholder="Valparaíso de Goiás - GO" />
          </label>
          <label className="block">
            <Label icon={BedDouble}>Quartos</Label>
            <input name="quartos" value={form.quartos} onChange={(e) => set("quartos", onlyDigits(e.target.value))} className={fieldCls} inputMode="numeric" placeholder="0" />
          </label>
          <label className="block">
            <Label icon={Bath}>Banheiros</Label>
            <input name="banheiro" value={form.banheiro} onChange={(e) => set("banheiro", onlyDigits(e.target.value))} className={fieldCls} inputMode="numeric" placeholder="0" />
          </label>
        </div>
      </Section>

      <Section icon={Coins} title="Valores & condição" subtitle="Preço e disponibilidade">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <Label icon={Coins}>Valor de venda (R$) *</Label>
            <div className="flex items-stretch overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/25">
              <span className="flex items-center border-r border-white/10 px-3 text-xs font-semibold text-white/40">R$</span>
              <input value={formatMilhar(form.vendaDigits)} onChange={(e) => set("vendaDigits", onlyDigits(e.target.value))} inputMode="numeric" className="w-full bg-transparent px-3 py-2.5 text-sm tabular-nums text-white placeholder-white/25 outline-none" placeholder="300.000" />
            </div>
          </label>
          <label className="block">
            <Label icon={Coins}>Valor de avaliação (R$)</Label>
            <div className="flex items-stretch overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/25">
              <span className="flex items-center border-r border-white/10 px-3 text-xs font-semibold text-white/40">R$</span>
              <input value={formatMilhar(form.avalDigits)} onChange={(e) => set("avalDigits", onlyDigits(e.target.value))} inputMode="numeric" className="w-full bg-transparent px-3 py-2.5 text-sm tabular-nums text-white placeholder-white/25 outline-none" placeholder="320.000" />
            </div>
          </label>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SwitchRow icon={Star} title="Imóvel exclusivo" desc="Destaque na carteira" checked={form.exclusivo} onChange={(v) => set("exclusivo", v)} />
          <SwitchRow icon={KeyRound} title="Possui inquilino" desc="Imóvel atualmente locado" checked={form.tem_inquilino} onChange={(v) => set("tem_inquilino", v)} />
        </div>
      </Section>

      <Section icon={FileText} title="Descrição" subtitle="Detalhes, diferenciais e observações">
        <div className="space-y-3">
          <label className="block">
            <Label icon={FileText}>Descrição</Label>
            <textarea name="descricao_imovel" value={form.descricao_imovel} onChange={onText} rows={3} className={`${fieldCls} resize-y`} placeholder="Diferenciais, acabamento, lazer…" />
          </label>
          <label className="block">
            <Label icon={FileText}>Observações internas</Label>
            <textarea name="observacoes" value={form.observacoes} onChange={onText} rows={2} className={`${fieldCls} resize-y`} placeholder="Notas internas (não públicas)" />
          </label>
          <label className="block">
            <Label icon={Tag}>Tags</Label>
            <input name="tags" value={form.tags} onChange={onText} className={fieldCls} placeholder="piscina, financiável, aceita permuta" />
          </label>
        </div>
      </Section>

      <Section icon={ImagePlus} title="Imagens & documentos" subtitle="Capa, galeria e documentação">
        {(capaExistente || imagensExistentes.length > 0) && (
          <div className="mb-4">
            <Label>Imagens atuais</Label>
            <div className="flex flex-wrap gap-2">
              {capaExistente && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capaExistente} alt="capa atual" className="h-16 w-24 rounded-lg border border-orange-500/40 object-cover" />
              )}
              {imagensExistentes.map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={u} alt={`imagem ${i + 1}`} className="h-16 w-24 rounded-lg border border-white/10 object-cover" />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Capa */}
          <div>
            <Label icon={ImagePlus}>Imagem de capa</Label>
            <label className="group flex h-32 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-center transition-colors hover:border-orange-500/40">
              {capaPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capaPreview} alt="preview capa" className="h-full w-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-white/25 group-hover:text-orange-400" />
                  <span className="text-[11px] text-white/30">Selecionar capa</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setCapa(e.target.files?.[0] ?? null)} />
            </label>
            {capa && (
              <button type="button" onClick={() => setCapa(null)} className="mt-1 inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70">
                <X className="h-3 w-3" /> remover capa
              </button>
            )}
          </div>

          {/* Documentação */}
          <div>
            <Label icon={FileText}>Documentação (PDF)</Label>
            <label className="group flex h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-center transition-colors hover:border-orange-500/40">
              <FileText className="h-6 w-6 text-white/25 group-hover:text-orange-400" />
              <span className="px-2 text-[11px] text-white/30">{documentacao ? documentacao.name : "Selecionar documento"}</span>
              <input type="file" className="hidden" onChange={(e) => setDocumentacao(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        {/* Galeria */}
        <div className="mt-4">
          <Label icon={ImagePlus}>Galeria de imagens</Label>
          <label className="group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-5 text-center transition-colors hover:border-orange-500/40">
            <ImagePlus className="h-6 w-6 text-white/25 group-hover:text-orange-400" />
            <span className="text-[11px] text-white/30">Selecionar várias imagens</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setGaleria(Array.from(e.target.files))} />
          </label>
          {galeriaPreviews.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {galeriaPreviews.map((g, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={g.url} alt={g.name} className="h-16 w-24 rounded-lg border border-white/10 object-cover" />
              ))}
              <button type="button" onClick={() => setGaleria([])} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/40 hover:text-white/70">
                <X className="h-3 w-3" /> limpar
              </button>
            </div>
          )}
        </div>
      </Section>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:text-white">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "edit" ? "Salvar alterações" : "Cadastrar imóvel"}
        </button>
      </div>
    </form>
  );
}
