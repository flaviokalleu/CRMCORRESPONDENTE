"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText, Image as ImageIcon, Download, Eye, Trash2, Upload, Loader2,
  FolderOpen, AlertCircle, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Painel de documentos de um cliente.
//
// Cada arquivo enviado existe por si — dá para ver, baixar e remover um sem
// tocar nos outros —, e o PDF único é montado pelo servidor sob demanda a
// partir deles. É por isso que há dois níveis de ação aqui: por arquivo e por
// grupo, mais o dossiê com tudo junto no rodapé.

const TIPOS = [
  { valor: "documentosPessoais", rotulo: "Documentos pessoais" },
  { valor: "extratoBancario", rotulo: "Extrato / contracheque" },
  { valor: "documentosDependente", rotulo: "Documentos dos dependentes" },
  { valor: "documentosConjuge", rotulo: "Documentos do cônjuge" },
  { valor: "fiadorDocumentos", rotulo: "Documentos do fiador" },
  { valor: "formulariosCaixa", rotulo: "Formulários Caixa" },
  { valor: "tela_aprovacao", rotulo: "Tela de aprovação" },
];

// Tamanho em unidade legível. O valor cru em bytes não diz nada a quem confere
// um cadastro; "1,2 MB" diz.
function tamanho(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Abre uma rota do backend numa aba nova, herdando o cookie de sessão — é assim
// que o arquivo chega ao navegador sem passar os bytes pelo JavaScript.
function abrir(url) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function ClienteDocumentos({ clienteId, onTotalChange }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(null); // tipo em envio
  const [removendo, setRemovendo] = useState(null); // id em remoção
  const [tipoEscolhido, setTipoEscolhido] = useState(TIPOS[0].valor);
  const inputRef = useRef(null);

  const base = `/api/backend/clientes/${clienteId}/documentos`;

  // Nenhum setState antes do primeiro await: chamada síncrona a partir de um
  // efeito dispara re-render em cascata (react-hooks/set-state-in-effect).
  const carregar = useCallback(async (aindaAtivo = () => true) => {
    try {
      const res = await fetch(base, { cache: "no-store" });
      if (!res.ok) throw new Error("Não foi possível carregar os documentos.");
      const json = await res.json();
      if (!aindaAtivo()) return;
      setErro("");
      setDados(json);
      onTotalChange?.(json.total_arquivos ?? 0);
    } catch (e) {
      if (aindaAtivo()) setErro(e.message);
    } finally {
      if (aindaAtivo()) setCarregando(false);
    }
  }, [base, onTotalChange]);

  useEffect(() => {
    // A chamada vai dentro de uma função assíncrona para que nenhum setState
    // aconteça no corpo síncrono do efeito; `ativo` evita escrever estado
    // depois que o painel foi fechado no meio da requisição.
    let ativo = true;
    (async () => {
      await carregar(() => ativo);
    })();
    return () => { ativo = false; };
  }, [carregar]);

  const enviar = async (arquivos) => {
    if (!arquivos?.length) return;
    setEnviando(tipoEscolhido);
    setErro("");
    try {
      const fd = new FormData();
      for (const arquivo of arquivos) fd.append("arquivos", arquivo);
      const res = await fetch(`${base}/${tipoEscolhido}`, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Falha no envio.");
      // O servidor devolve o que recusou; esconder isso faria a pessoa acreditar
      // que enviou um documento que não está lá.
      if (json.falhas?.length) {
        setErro(`Não foi possível processar: ${json.falhas.join(", ")}`);
      }
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remover = async (doc) => {
    setRemovendo(doc.id);
    setErro("");
    try {
      const res = await fetch(`${base}/arquivo/${doc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Não foi possível remover o arquivo.");
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setRemovendo(null);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-cx-muted">
        <Loader2 className="size-4 animate-spin" /> Carregando documentos…
      </div>
    );
  }

  const grupos = dados?.grupos ?? [];
  const temAlgum = grupos.length > 0;

  return (
    <div className="space-y-3">
      {/* Envio: escolher o tipo antes de escolher o arquivo. O tipo não sai do
          nome do arquivo — só quem está cadastrando sabe se aquele JPEG é o RG
          do titular ou o do cônjuge. */}
      <div className="rounded-xl border border-dashed border-cx-border p-3">
        <label className="block text-[11px] font-semibold text-cx-muted">
          Enviar para
          <select
            value={tipoEscolhido}
            onChange={(e) => setTipoEscolhido(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-cx-border bg-cx-surface px-2 text-xs text-cx-text"
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>{t.rotulo}</option>
            ))}
          </select>
        </label>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => enviar(Array.from(e.target.files || []))}
        />
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={!!enviando}
          className="mt-2 w-full gap-2 border-cx-border text-xs"
        >
          {enviando ? <Loader2 className="animate-spin" /> : <Upload />}
          {enviando ? "Enviando e otimizando…" : "Escolher arquivos"}
        </Button>
        <p className="mt-1.5 text-[10px] leading-relaxed text-cx-muted">
          Imagens e PDF. As imagens são reduzidas no envio para ocupar menos espaço,
          mantendo a leitura nítida.
        </p>
      </div>

      {erro && (
        <p className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {erro}
        </p>
      )}

      {!temAlgum ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-cx-border py-8 text-center">
          <FolderOpen className="size-6 text-cx-muted" />
          <p className="text-xs text-cx-muted">Nenhum documento enviado ainda.</p>
        </div>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.tipo} className="overflow-hidden rounded-xl border border-cx-border">
            <header className="flex items-center gap-2 bg-cx-bg px-3 py-2">
              <span className="flex-1 truncate text-xs font-semibold text-cx-text">{grupo.rotulo}</span>
              <span className="text-[10px] text-cx-muted tabular-nums">
                {grupo.total} {grupo.total === 1 ? "arquivo" : "arquivos"} · {tamanho(grupo.bytes)}
              </span>
            </header>

            <ul className="divide-y divide-cx-border">
              {grupo.arquivos.map((doc) => (
                <li key={doc.id} className="flex items-center gap-2 px-3 py-2">
                  {doc.eh_imagem
                    ? <ImageIcon className="size-4 shrink-0 text-cx-muted" />
                    : <FileText className="size-4 shrink-0 text-cx-muted" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-cx-text" title={doc.nome_original}>
                      {doc.nome_original}
                    </span>
                    <span className="block text-[10px] text-cx-muted tabular-nums">
                      {tamanho(doc.bytes)}
                      {doc.economia_pct > 0 && ` · −${doc.economia_pct}% no envio`}
                    </span>
                  </span>
                  <Button
                    variant="ghost" size="icon-xs" className="text-cx-muted"
                    title="Ver" aria-label={`Ver ${doc.nome_original}`}
                    onClick={() => abrir(`${base}/arquivo/${doc.id}`)}
                  >
                    <Eye />
                  </Button>
                  <Button
                    variant="ghost" size="icon-xs" className="text-cx-muted"
                    title="Baixar" aria-label={`Baixar ${doc.nome_original}`}
                    onClick={() => abrir(`${base}/arquivo/${doc.id}?download=1`)}
                  >
                    <Download />
                  </Button>
                  <Button
                    variant="ghost" size="icon-xs"
                    className="text-cx-muted hover:text-red-600"
                    title="Remover" aria-label={`Remover ${doc.nome_original}`}
                    disabled={removendo === doc.id}
                    onClick={() => remover(doc)}
                  >
                    {removendo === doc.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                </li>
              ))}
            </ul>

            <footer className="flex items-center gap-2 border-t border-cx-border px-3 py-2">
              <Button
                variant="ghost" size="sm"
                className="gap-1.5 text-[11px] text-cx-blue"
                onClick={() => abrir(`${base}/${grupo.tipo}/pdf`)}
              >
                <Layers /> Ver como um PDF
              </Button>
              <Button
                variant="ghost" size="sm"
                className="ml-auto gap-1.5 text-[11px] text-cx-muted"
                onClick={() => abrir(`${base}/${grupo.tipo}/pdf?download=1`)}
              >
                <Download /> Baixar
              </Button>
            </footer>
          </section>
        ))
      )}

      {temAlgum && (
        <div className={cn(
          "flex items-center gap-2 rounded-xl border border-cx-border bg-cx-bg px-3 py-2.5"
        )}>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-cx-text">Dossiê completo</span>
            <span className="block text-[10px] text-cx-muted tabular-nums">
              {dados.total_arquivos} arquivos · {dados.total_paginas} páginas · {tamanho(dados.total_bytes)}
            </span>
          </span>
          <Button
            variant="outline" size="sm"
            className="gap-1.5 border-cx-border text-[11px]"
            onClick={() => abrir(`${base}/pdf`)}
          >
            <Layers /> Ver
          </Button>
          <Button
            variant="outline" size="sm"
            className="gap-1.5 border-cx-border text-[11px]"
            onClick={() => abrir(`${base}/pdf?download=1`)}
          >
            <Download /> Baixar
          </Button>
        </div>
      )}
    </div>
  );
}
