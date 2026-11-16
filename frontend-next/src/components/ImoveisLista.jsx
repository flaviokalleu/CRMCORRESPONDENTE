"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, BedDouble, Bath, MapPin, Search, Plus, Star, ImageOff } from "@/components/icons";
import { situacaoInfo, formatBRL, imovelImageUrl, SITUACAO_MAP } from "@/lib/imovel-meta";

// Carteira de imóveis. Busca sempre visível, situação como filtro rápido com
// contador (em vez de um select escondido) e o cartão inteiro clicável.
// Sem foto, o cartão mostra uma faixa baixa em vez de um bloco vazio enorme —
// cabe o dobro de imóveis na tela do celular.

function ImovelCover({ src, alt }) {
  const [erro, setErro] = useState(false);
  if (!src || erro) {
    return (
      <div className="lst-foto-vazia">
        <ImageOff aria-hidden="true" /> Sem foto
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} onError={() => setErro(true)} className="h-full w-full object-cover" />;
}

export function ImoveisLista({ initialData }) {
  const [imoveis] = useState(Array.isArray(initialData) ? initialData : initialData?.imoveis ?? initialData?.data ?? []);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState("");
  const [situacao, setSituacao] = useState("");

  const tipos = [...new Set(imoveis.map((i) => i.tipo).filter(Boolean))].sort();
  // Ordem fixa e conhecida (disponível primeiro), só com as que existem.
  const ordemSituacao = Object.keys(SITUACAO_MAP);
  const situacoes = [...new Set(imoveis.map((i) => (i.situacao_imovel || "").toLowerCase()).filter(Boolean))].sort(
    (a, b) => ordemSituacao.indexOf(a) - ordemSituacao.indexOf(b)
  );
  const contaSituacao = (s) => imoveis.filter((i) => (i.situacao_imovel || "").toLowerCase() === s).length;

  const term = q.trim().toLowerCase();
  const filtrados = imoveis.filter((i) => {
    if (tipo && i.tipo !== tipo) return false;
    if (situacao && (i.situacao_imovel || "").toLowerCase() !== situacao) return false;
    if (term) {
      const hay = `${i.nome_imovel || ""} ${i.endereco || ""} ${i.localizacao || ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
  const temFiltro = q || tipo || situacao;

  return (
    <div className="space-y-4">
      <div className="crm-page-header">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-cx-text">Imóveis</h1>
          <p className="text-sm text-cx-muted">
            {temFiltro
              ? `${filtrados.length} de ${imoveis.length} ${imoveis.length === 1 ? "imóvel" : "imóveis"}`
              : `${imoveis.length} ${imoveis.length === 1 ? "imóvel na carteira" : "imóveis na carteira"}`}
          </p>
        </div>
        <Link href="/imoveis/adicionar" className="crm-primary-action">
          <Plus className="h-4 w-4" /> Adicionar imóvel
        </Link>
      </div>

      <div className="lst-ferramentas">
        <label className="lst-busca">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, rua ou bairro…"
            aria-label="Buscar imóvel"
            className="cx-input"
          />
        </label>
        {tipos.length > 1 && (
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="cx-input lst-campo-curto"
            aria-label="Tipo de imóvel"
          >
            <option value="">Todos os tipos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      {situacoes.length > 1 && (
        <div className="lst-filtros" role="group" aria-label="Filtrar por situação">
          <button type="button" className="lst-filtro" aria-pressed={!situacao} onClick={() => setSituacao("")}>
            Todos <span className="lst-filtro-n">{imoveis.length}</span>
          </button>
          {situacoes.map((s) => {
            const info = situacaoInfo(s);
            return (
              <button
                key={s}
                type="button"
                className={`lst-filtro ${info.tom}`}
                aria-pressed={situacao === s}
                onClick={() => setSituacao(situacao === s ? "" : s)}
              >
                {info.label} <span className="lst-filtro-n">{contaSituacao(s)}</span>
              </button>
            );
          })}
        </div>
      )}

      {filtrados.length === 0 ? (
        <div className="crm-empty crm-card flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-soft text-primary">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-semibold text-ink-heading">
              {temFiltro ? "Nenhum imóvel com essa busca" : "Sua carteira ainda está vazia"}
            </p>
            <p className="text-sm text-cx-muted">
              {temFiltro
                ? "Tente outra palavra ou limpe os filtros."
                : "Cadastre o primeiro imóvel — com foto, ele aparece no site para os clientes."}
            </p>
          </div>
          {temFiltro ? (
            <button
              type="button"
              className="lst-botao"
              onClick={() => {
                setQ("");
                setTipo("");
                setSituacao("");
              }}
            >
              Limpar filtros
            </button>
          ) : (
            <Link href="/imoveis/adicionar" className="lst-botao lst-botao-principal">
              <Plus aria-hidden="true" /> Adicionar imóvel
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((i) => {
            const info = situacaoInfo(i.situacao_imovel);
            const capa = imovelImageUrl(i.imagem_capa);
            return (
              <Link
                key={i.id}
                href={`/imovel/${i.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-cx-border bg-cx-surface transition-colors hover:border-cx-blue focus-visible:outline-2 focus-visible:outline-cx-blue"
              >
                <div className={capa ? "relative aspect-video overflow-hidden" : "relative h-14"}>
                  <ImovelCover src={capa} alt={i.nome_imovel} />
                </div>

                <div className="flex flex-1 flex-col gap-1 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`ass-selo ${info.tom}`}>{info.label}</span>
                    {i.exclusivo && (
                      <span className="ass-selo ass-tom-alerta">
                        <Star className="h-3.5 w-3.5" aria-hidden="true" /> Exclusivo
                      </span>
                    )}
                    {i.tipo && <span className="text-sm text-cx-muted">{i.tipo}</span>}
                  </div>
                  <h3 className="mt-1 font-semibold text-cx-text">{i.nome_imovel || "—"}</h3>
                  <p className="flex items-center gap-1 text-sm text-cx-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate" title={i.endereco}>
                      {i.endereco || "Sem endereço"}
                    </span>
                  </p>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                    <span className="text-lg font-bold tabular-nums text-cx-text">{formatBRL(i.valor_venda)}</span>
                    <span className="flex items-center gap-3 text-sm text-cx-muted">
                      <span className="inline-flex items-center gap-1" title="Quartos">
                        <BedDouble className="h-4 w-4" aria-hidden="true" /> {i.quartos ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Banheiros">
                        <Bath className="h-4 w-4" aria-hidden="true" /> {i.banheiro ?? 0}
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
