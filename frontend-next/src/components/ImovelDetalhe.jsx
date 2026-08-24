"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BedDouble, Bath, MapPin, Star, KeyRound, Building2, Tag,
  Pencil, Trash2, Loader2, ImageOff, ChevronLeft, ChevronRight, Coins,
} from "lucide-react";
import { situacaoInfo, formatBRL, imovelImageUrl } from "@/lib/imovel-meta";

function Spec({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-cx-border bg-cx-surface p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-cx-muted">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </p>
      <p className="mt-1 text-sm text-cx-text">{value ?? "—"}</p>
    </div>
  );
}

export function ImovelDetalhe({ imovel }) {
  const router = useRouter();
  const info = situacaoInfo(imovel.situacao_imovel);

  const imagens = [
    imovel.imagem_capa,
    ...(Array.isArray(imovel.imagens) ? imovel.imagens : []),
  ].filter(Boolean).map(imovelImageUrl);

  const [idx, setIdx] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [erroImg, setErroImg] = useState({});

  const excluir = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/backend/imoveis/${imovel.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/imoveis/lista");
      router.refresh();
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const temImagem = imagens.length > 0 && !erroImg[idx];

  return (
    <div className="p-6">
      {/* Topo */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/imoveis/lista" className="inline-flex items-center gap-1.5 text-xs text-cx-muted transition-colors hover:text-cx-muted">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para lista
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-cx-text">{imovel.nome_imovel}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-cx-border bg-cx-surface px-2 py-1 text-[11px] font-medium text-cx-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: info.dot }} />
              {info.label}
            </span>
            {imovel.exclusivo && (
              <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-700">
                <Star className="h-3 w-3" /> Exclusivo
              </span>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-cx-muted">
            <MapPin className="h-3.5 w-3.5" /> {imovel.endereco}{imovel.localizacao ? ` · ${imovel.localizacao}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/imoveis/editar/${imovel.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-cx-border px-3 py-2 text-sm font-semibold text-cx-muted transition-colors hover:border-cx-border hover:text-cx-text">
            <Pencil className="h-4 w-4" /> Editar
          </Link>
          {confirming ? (
            <div className="inline-flex items-center gap-1.5">
              <button onClick={excluir} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Confirmar
              </button>
              <button onClick={() => setConfirming(false)} className="rounded-lg border border-cx-border px-3 py-2 text-sm text-cx-muted hover:text-cx-text">Cancelar</button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-cx-border px-3 py-2 text-sm font-semibold text-cx-muted transition-colors hover:border-red-200 hover:text-red-700">
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Galeria */}
        <div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-cx-border bg-cx-surface">
            {temImagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagens[idx]} alt={imovel.nome_imovel} onError={() => setErroImg((e) => ({ ...e, [idx]: true }))} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-cx-muted">
                <ImageOff className="h-10 w-10" />
                <span className="text-xs">Sem imagem</span>
              </div>
            )}
            {imagens.length > 1 && (
              <>
                <button onClick={() => setIdx((i) => (i - 1 + imagens.length) % imagens.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/80 hover:bg-black/70">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setIdx((i) => (i + 1) % imagens.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/80 hover:bg-black/70">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {imagens.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {imagens.map((u, i) => (
                <button key={i} onClick={() => setIdx(i)} className={`h-14 w-20 overflow-hidden rounded-lg border ${i === idx ? "border-orange-500/60" : "border-cx-border"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`thumb ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-cx-border bg-cx-surface p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cx-muted">Valor de venda</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-cx-text">{formatBRL(imovel.valor_venda)}</p>
            {imovel.valor_avaliacao ? (
              <p className="mt-1 text-xs text-cx-muted">Avaliação: {formatBRL(imovel.valor_avaliacao)}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Spec icon={BedDouble} label="Quartos" value={imovel.quartos} />
            <Spec icon={Bath} label="Banheiros" value={imovel.banheiro} />
            <Spec icon={Building2} label="Tipo" value={imovel.tipo} />
            <Spec icon={KeyRound} label="Inquilino" value={imovel.tem_inquilino ? "Sim" : "Não"} />
          </div>

          {imovel.tags && (
            <div className="flex flex-wrap gap-1.5">
              {String(imovel.tags).split(/[,;]/).map((t) => t.trim()).filter(Boolean).map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-cx-surface px-2 py-1 text-[11px] text-cx-muted">
                  <Tag className="h-3 w-3" /> {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Descrição */}
      {imovel.descricao_imovel && (
        <div className="mt-6 max-w-3xl">
          <h2 className="mb-2 text-sm font-semibold text-cx-text">Descrição</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-cx-muted">{imovel.descricao_imovel}</p>
        </div>
      )}
      {imovel.observacoes && (
        <div className="mt-4 max-w-3xl rounded-xl border border-cx-border bg-cx-surface p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cx-muted">Observações internas</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-cx-muted">{imovel.observacoes}</p>
        </div>
      )}
    </div>
  );
}
