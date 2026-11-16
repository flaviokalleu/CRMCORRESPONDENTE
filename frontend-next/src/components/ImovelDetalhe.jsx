"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BedDouble, Bath, MapPin, Star, KeyRound, Building2, Tag,
  Pencil, Trash2, Loader2, ImageOff, ChevronLeft, ChevronRight, MessageCircle, ExternalLink, ImagePlus,
} from "@/components/icons";
import { situacaoInfo, formatBRL, imovelImageUrl } from "@/lib/imovel-meta";

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
  const [erroExcluir, setErroExcluir] = useState("");

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
      setErroExcluir("Não foi possível excluir. Tente de novo.");
    }
  };

  // Só imóvel disponível aparece na vitrine pública — os outros não têm link.
  const publico = (imovel.situacao_imovel || "").toLowerCase() === "disponivel";
  const enviarWhatsApp = () => {
    const link = `${window.location.origin}/imoveis/${imovel.id}`;
    const texto = `Olha este imóvel que separei para você: ${imovel.nome_imovel} — ${formatBRL(imovel.valor_venda)}${
      imovel.quartos ? `, ${imovel.quartos} quartos` : ""
    }.\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  };

  const temImagem = imagens.length > 0 && !erroImg[idx];

  return (
    <div className="p-6">
      {/* Topo: título + selos que quebram linha sem esmagar o texto. */}
      <Link href="/imoveis/lista" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-cx-muted hover:text-cx-text">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para imóveis
      </Link>
      <div className="mb-5 mt-1">
        <h1 className="text-2xl font-semibold tracking-tight text-cx-text">{imovel.nome_imovel}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`ass-selo ${info.tom}`}>{info.label}</span>
          {imovel.exclusivo && (
            <span className="ass-selo ass-tom-alerta">
              <Star className="h-3.5 w-3.5" aria-hidden="true" /> Exclusivo
            </span>
          )}
          <span className="flex items-center gap-1.5 text-sm text-cx-muted">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {imovel.endereco}{imovel.localizacao ? ` · ${imovel.localizacao}` : ""}
          </span>
        </div>

        {/* Uma ação principal (mandar para o cliente) e as secundárias ao lado. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {publico && (
            <button type="button" onClick={enviarWhatsApp} className="lst-botao lst-acao-whats">
              <MessageCircle aria-hidden="true" /> Enviar para um cliente
            </button>
          )}
          {publico && (
            <a href={`/imoveis/${imovel.id}`} target="_blank" rel="noreferrer" className="lst-botao">
              <ExternalLink aria-hidden="true" /> Ver no site
            </a>
          )}
          <Link href={`/imoveis/editar/${imovel.id}`} className="lst-botao">
            <Pencil aria-hidden="true" /> Editar
          </Link>
          {confirming ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <button onClick={excluir} disabled={deleting} className="lst-botao lst-botao-perigo">
                {deleting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />} Sim, excluir
              </button>
              <button onClick={() => setConfirming(false)} className="lst-botao">Não</button>
            </span>
          ) : (
            <button onClick={() => setConfirming(true)} className="lst-acao lst-acao-perigo" title="Excluir imóvel" aria-label="Excluir imóvel">
              <Trash2 aria-hidden="true" />
            </button>
          )}
        </div>
        {erroExcluir && <p className="lst-erro mt-2" role="alert">{erroExcluir}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Galeria */}
        <div>
          <div className={`relative overflow-hidden rounded-2xl border border-cx-border bg-cx-surface ${temImagem ? "aspect-video" : "h-40"}`}>
            {temImagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagens[idx]} alt={imovel.nome_imovel} onError={() => setErroImg((e) => ({ ...e, [idx]: true }))} className="h-full w-full object-cover" />
            ) : (
              <div className="lst-foto-vazia flex-col">
                <ImageOff aria-hidden="true" />
                <span>Este imóvel ainda não tem foto — anúncio com foto recebe muito mais contato.</span>
                <Link href={`/imoveis/editar/${imovel.id}`} className="lst-botao mt-1">
                  <ImagePlus aria-hidden="true" /> Adicionar fotos
                </Link>
              </div>
            )}
            {imagens.length > 1 && (
              <>
                <button onClick={() => setIdx((i) => (i - 1 + imagens.length) % imagens.length)} aria-label="Foto anterior" className="lst-acao absolute left-2 top-1/2 -translate-y-1/2">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setIdx((i) => (i + 1) % imagens.length)} aria-label="Próxima foto" className="lst-acao absolute right-2 top-1/2 -translate-y-1/2">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {imagens.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {imagens.map((u, i) => (
                <button key={i} onClick={() => setIdx(i)} aria-label={`Ver foto ${i + 1}`} className={`h-14 w-20 overflow-hidden rounded-lg border-2 ${i === idx ? "border-cx-blue" : "border-cx-border"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`thumb ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info: valor + características numa linha só (Miller: poucos blocos). */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-cx-border bg-cx-surface p-4">
            <p className="text-sm font-medium text-cx-muted">Valor de venda</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-cx-text">{formatBRL(imovel.valor_venda)}</p>
            {imovel.valor_avaliacao ? (
              <p className="mt-1 text-sm text-cx-muted">Avaliado em {formatBRL(imovel.valor_avaliacao)}</p>
            ) : null}
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-cx-border pt-4 text-sm text-cx-text">
              <li className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-cx-muted" aria-hidden="true" /> {imovel.quartos ?? 0} quarto{imovel.quartos === 1 ? "" : "s"}</li>
              <li className="inline-flex items-center gap-1.5"><Bath className="h-4 w-4 text-cx-muted" aria-hidden="true" /> {imovel.banheiro ?? 0} banheiro{imovel.banheiro === 1 ? "" : "s"}</li>
              {imovel.tipo && <li className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4 text-cx-muted" aria-hidden="true" /> {imovel.tipo}</li>}
              <li className="inline-flex items-center gap-1.5"><KeyRound className="h-4 w-4 text-cx-muted" aria-hidden="true" /> {imovel.tem_inquilino ? "Com inquilino" : "Sem inquilino"}</li>
            </ul>
          </div>

          {imovel.tags && (
            <div className="flex flex-wrap gap-2">
              {String(imovel.tags).split(/[,;]/).map((t) => t.trim()).filter(Boolean).map((t, i) => (
                <span key={i} className="ass-selo ass-tom-neutro">
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" /> {t}
                </span>
              ))}
            </div>
          )}

          {imovel.descricao_imovel && (
            <div>
              <h2 className="mb-1 text-sm font-semibold text-cx-text">Descrição</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-cx-muted">{imovel.descricao_imovel}</p>
            </div>
          )}
        </div>
      </div>

      {/* Observações internas */}
      {imovel.observacoes && (
        <div className="mt-4 max-w-3xl rounded-xl border border-cx-border bg-cx-surface p-4">
          <p className="text-sm font-semibold text-cx-muted">Observações internas (só a equipe vê)</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-cx-muted">{imovel.observacoes}</p>
        </div>
      )}
    </div>
  );
}
