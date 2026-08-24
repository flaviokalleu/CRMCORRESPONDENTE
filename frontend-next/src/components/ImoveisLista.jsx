"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2, BedDouble, Bath, MapPin, Search, Plus, Star, ImageOff, Eye,
} from "lucide-react";
import { situacaoInfo, formatBRL, imovelImageUrl } from "@/lib/imovel-meta";

function ImovelCover({ src, alt }) {
  const [erro, setErro] = useState(false);
  if (!src || erro) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-cx-surface text-cx-muted">
        <ImageOff className="h-8 w-8" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} onError={() => setErro(true)} className="h-full w-full object-cover" />;
}

function SituacaoBadge({ situacao }) {
  const info = situacaoInfo(situacao);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-black/40 px-2 py-1 text-[11px] font-medium text-white/85 backdrop-blur-sm">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: info.dot }} />
      {info.label}
    </span>
  );
}

export function ImoveisLista({ initialData }) {
  const [imoveis] = useState(Array.isArray(initialData) ? initialData : initialData?.imoveis ?? initialData?.data ?? []);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [situacao, setSituacao] = useState("");

  const tipos = useMemo(
    () => [...new Set(imoveis.map((i) => i.tipo).filter(Boolean))].sort(),
    [imoveis]
  );
  const situacoes = useMemo(
    () => [...new Set(imoveis.map((i) => i.situacao_imovel).filter(Boolean))].sort(),
    [imoveis]
  );

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return imoveis.filter((i) => {
      if (tipo && i.tipo !== tipo) return false;
      if (situacao && i.situacao_imovel !== situacao) return false;
      if (term) {
        const hay = `${i.nome_imovel || ""} ${i.endereco || ""} ${i.localizacao || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [imoveis, q, tipo, situacao]);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-cx-text">Imóveis</h1>
          <p className="text-sm text-cx-muted">
            {filtrados.length} de {imoveis.length} {imoveis.length === 1 ? "imóvel" : "imóveis"}
          </p>
        </div>
        <Link href="/imoveis/adicionar" className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500">
          <Plus className="h-4 w-4" /> Adicionar imóvel
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-cx-border bg-cx-surface p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cx-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, endereço ou localização…"
            className="w-full rounded-lg border border-cx-border bg-cx-surface py-2.5 pl-9 pr-3 text-sm text-cx-text placeholder-[#9aa6b4] outline-none transition-colors focus:border-cx-blue focus:ring-2 focus:ring-cx-blue/20"
          />
        </div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2.5 text-sm text-cx-text outline-none transition-colors focus:border-cx-blue [&>option]:bg-white [&>option]:text-cx-text">
          <option value="">Todos os tipos</option>
          {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={situacao} onChange={(e) => setSituacao(e.target.value)} className="rounded-lg border border-cx-border bg-cx-surface px-3 py-2.5 text-sm text-cx-text outline-none transition-colors focus:border-cx-blue [&>option]:bg-white [&>option]:text-cx-text">
          <option value="">Todas as situações</option>
          {situacoes.map((s) => <option key={s} value={s}>{situacaoInfo(s).label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-cx-border bg-cx-surface py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cx-border bg-cx-surface text-cx-muted">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-cx-text">Nenhum imóvel encontrado</p>
            <p className="text-xs text-cx-muted">{q || tipo || situacao ? "Ajuste a busca ou os filtros." : "Cadastre o primeiro imóvel."}</p>
          </div>
          {!q && !tipo && !situacao && (
            <Link href="/imoveis/adicionar" className="mt-1 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
              <Plus className="h-4 w-4" /> Adicionar imóvel
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((i) => (
            <article key={i.id} className="group flex flex-col overflow-hidden rounded-2xl border border-cx-border bg-cx-surface transition-colors hover:border-cx-border">
              <div className="relative aspect-[16/10] overflow-hidden">
                <ImovelCover src={imovelImageUrl(i.imagem_capa)} alt={i.nome_imovel} />
                <div className="absolute left-2.5 top-2.5">
                  <SituacaoBadge situacao={i.situacao_imovel} />
                </div>
                {i.exclusivo && (
                  <div className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-cx-orange px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
                    <Star className="h-3 w-3" /> Exclusivo
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-lg font-semibold tabular-nums text-cx-text">{formatBRL(i.valor_venda)}</span>
                  {i.tipo && <span className="rounded-md bg-cx-surface px-2 py-0.5 text-[10px] font-medium text-cx-muted">{i.tipo}</span>}
                </div>
                <h3 className="truncate text-sm font-medium text-cx-muted" title={i.nome_imovel}>{i.nome_imovel || "—"}</h3>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-cx-muted" title={i.endereco}>
                  <MapPin className="h-3 w-3 shrink-0" /> {i.endereco || "Sem endereço"}
                </p>

                <div className="mt-3 flex items-center gap-4 border-t border-cx-border/[0.12] pt-3 text-xs text-cx-muted">
                  <span className="inline-flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5 text-cx-muted" /> {i.quartos ?? 0}</span>
                  <span className="inline-flex items-center gap-1.5"><Bath className="h-3.5 w-3.5 text-cx-muted" /> {i.banheiro ?? 0}</span>
                  <Link href={`/imovel/${i.id}`} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-cx-border px-2.5 py-1.5 text-xs font-semibold text-cx-muted transition-colors hover:border-cx-border hover:text-cx-text">
                    <Eye className="h-3.5 w-3.5" /> Detalhes
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
