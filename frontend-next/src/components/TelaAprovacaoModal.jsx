"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Landmark, Upload, FileText } from "lucide-react";
import { statusInfo } from "@/lib/cliente-status";
import { cn } from "@/lib/utils";

// Os status em que a Caixa devolveu uma tela — aprovação, condicionamento ou
// reprovação. Todos rendem um print que vale a pena guardar no dossiê; os
// demais status são etapas internas do atendimento e não têm tela nenhuma.
export const STATUS_PEDE_TELA = ["cliente_aprovado", "aprovado", "condicionado", "reprovado"];

export function pedeTelaAprovacao(status) {
  return STATUS_PEDE_TELA.includes(status);
}

// Modal que aparece assim que o status do cliente vira uma decisão do banco e
// pergunta se o corretor quer subir o print daquela tela.
//
// O envio reaproveita a rota de documentos que já existe
// (POST /clientes/:id/documentos/tela_aprovacao, mesmo caminho que
// ClienteDocumentos.jsx usa), então o arquivo aparece na aba de documentos do
// cliente sem nenhum código novo do lado do servidor.
export function TelaAprovacaoModal({ clienteId, clienteNome, status, aberto, onFechar, onEnviado }) {
  const inputRef = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviados, setEnviados] = useState(0);
  const [progresso, setProgresso] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  // Prévias do que foi escolhido: para imagem é uma URL de objeto (a imagem em
  // si), para PDF é só o arquivo (mostra ícone + nome). Guardamos os File
  // originais também para dar "tentar novamente" sem pedir a seleção de novo.
  const [previews, setPreviews] = useState([]);
  const [arquivosAtuais, setArquivosAtuais] = useState([]);

  // Libera a URL de objeto de cada prévia sempre que a lista de prévias muda
  // (nova seleção substitui a anterior) e também ao desmontar — senão o
  // navegador segura essa memória até a aba inteira recarregar.
  useEffect(() => {
    return () => {
      previews.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  // O estado é limpo ao fechar, não ao abrir: zerar num efeito de abertura
  // dispara render em cascata (react-hooks/set-state-in-effect), e o resultado
  // visível é o mesmo, já que nada aqui é mostrado com o modal fechado.
  const fechar = () => {
    setErro("");
    setEnviados(0);
    setProgresso(0);
    setPreviews([]);
    setArquivosAtuais([]);
    onFechar?.();
  };

  const enviar = (arquivos) => {
    if (!arquivos?.length) return;
    setEnviando(true);
    setErro("");
    setProgresso(0);

    const fd = new FormData();
    for (const arquivo of arquivos) fd.append("arquivos", arquivo);

    // fetch não expõe progresso de envio (só o de download, via
    // response.body). XMLHttpRequest expõe o envio pelo evento
    // upload.onprogress, e é o único jeito de mostrar uma barra que reflete o
    // upload de verdade em vez de um texto estático.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/backend/clientes/${clienteId}/documentos/tela_aprovacao`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgresso(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setEnviando(false);
      let json = {};
      try { json = JSON.parse(xhr.responseText || "{}"); } catch { /* resposta sem corpo JSON */ }
      if (xhr.status < 200 || xhr.status >= 300) {
        setErro(json.error || "Falha no envio.");
        return;
      }
      // O servidor devolve o que recusou; esconder isso faria a pessoa acreditar
      // que enviou uma tela que não está lá.
      if (json.falhas?.length) {
        setErro(`Não foi possível processar: ${json.falhas.join(", ")}`);
      }
      setEnviados(arquivos.length - (json.falhas?.length ?? 0));
      onEnviado?.();
    };
    xhr.onerror = () => {
      setEnviando(false);
      setErro("Falha no envio.");
    };
    xhr.send(fd);
  };

  // Ponto único de entrada de uma seleção nova, seja por clique no input ou
  // por soltar arquivos na zona de arraste: monta as prévias e já dispara o
  // envio, mantendo o fluxo de um passo só que o modal já tinha.
  const escolherArquivos = (arquivos) => {
    if (!arquivos?.length) return;
    setPreviews(arquivos.map((file) => ({
      file,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    })));
    setArquivosAtuais(arquivos);
    setErro("");
    setEnviados(0);
    enviar(arquivos);
  };

  if (!clienteId || !status) return null;

  const info = statusInfo(status);
  // Depois de um erro, os File originais continuam em mãos — "tentar
  // novamente" reenvia sem obrigar a pessoa a escolher tudo de novo.
  const podeTentarNovamente = !!erro && arquivosAtuais.length > 0 && !enviando;

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && !enviando && fechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            {/* Crest com o tom do status — a mesma linguagem visual da flecha e
                do ícone de lane usados na lista de clientes (soft de fundo,
                ink no traço), aqui aplicada ao ícone que identifica a tela. */}
            <span
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: info.soft, color: info.ink }}
            >
              <Landmark className="size-4" />
            </span>
            <DialogTitle>Enviar tela de aprovação?</DialogTitle>
          </div>
          <DialogDescription>
            {clienteNome ? `${clienteNome} está agora em` : "Status alterado para"}{" "}
            <span className="inline-flex items-center gap-1.5 rounded-md border border-cx-border bg-cx-surface px-1.5 py-0.5 align-middle text-[11px] font-medium text-cx-text">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: info.dot }} />
              {info.label}
            </span>
            . Guarde o print da tela que a Caixa devolveu.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const arquivos = Array.from(e.target.files || []);
            e.target.value = ""; // permite reenviar o mesmo arquivo depois de um erro
            escolherArquivos(arquivos);
          }}
        />

        {/* Zona de arrastar-e-soltar. Mesmo visual do Dropzone de
            ClienteForm.jsx (borda tracejada, ícone Upload, cx-surface/cx-bg),
            trocando o realce fixo em laranja pelo tom do próprio status —
            é o mesmo elemento se identificando com a decisão do banco. */}
        <div
          role="button"
          tabIndex={0}
          aria-disabled={enviando}
          onClick={() => !enviando && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !enviando) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => { e.preventDefault(); if (!enviando) setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            if (enviando) return;
            escolherArquivos(Array.from(e.dataTransfer.files || []));
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
            enviando ? "pointer-events-none opacity-60" : "cursor-pointer",
            !arrastando && "border-cx-border bg-cx-surface hover:bg-cx-bg",
          )}
          style={arrastando ? { borderColor: info.ink, backgroundColor: info.soft } : undefined}
        >
          <Upload className="size-5 text-cx-muted" style={arrastando ? { color: info.ink } : undefined} />
          <span className="text-[11px] text-cx-muted">
            {arrastando ? "Solte para enviar" : "Arraste a tela aqui ou clique para selecionar"}
          </span>
        </div>

        {previews.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {previews.map((p, i) => (
              p.url ? (
                // Prévia local a partir de uma URL de objeto (blob:) — não existe
                // domínio nenhum para o otimizador do next/image configurar aqui,
                // mesma situação (e mesma saída) do avatar em ClientesLista.jsx.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={p.url}
                  alt={p.file.name}
                  className="size-12 shrink-0 rounded-lg border border-cx-border object-cover"
                />
              ) : (
                <span
                  key={i}
                  className="inline-flex max-w-[160px] items-center gap-1.5 truncate rounded-lg border border-cx-border bg-cx-bg px-2 py-1.5 text-[10px] text-cx-text"
                  title={p.file.name}
                >
                  <FileText className="size-3.5 shrink-0 text-cx-muted" />
                  <span className="truncate">{p.file.name}</span>
                </span>
              )
            ))}
          </div>
        )}

        {enviando && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-cx-bg">
              {/* Largura real do XHR, não uma animação decorativa — é por
                  isso que a transição só suaviza os saltos entre eventos de
                  progresso, sem correr sozinha. */}
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${progresso}%`, backgroundColor: info.ink }}
              />
            </div>
            <p className="text-right text-[10px] tabular-nums text-cx-muted">{progresso}%</p>
          </div>
        )}

        {enviados > 0 ? (
          <p className="text-sm text-cx-text">
            {enviados === 1 ? "Tela enviada." : `${enviados} telas enviadas.`} Ela já aparece nos documentos do cliente.
          </p>
        ) : null}
        {erro ? <p className="text-xs text-destructive">{erro}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={fechar} disabled={enviando}>
            {enviados > 0 ? "Fechar" : "Agora não"}
          </Button>
          <Button
            onClick={() => (podeTentarNovamente ? enviar(arquivosAtuais) : inputRef.current?.click())}
            disabled={enviando}
          >
            {enviando
              ? `Enviando… ${progresso}%`
              : podeTentarNovamente
                ? "Tentar novamente"
                : enviados > 0
                  ? "Enviar outra"
                  : "Enviar imagem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TelaAprovacaoModal;
