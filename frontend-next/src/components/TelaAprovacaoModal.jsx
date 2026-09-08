"use client";

import { useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { statusInfo } from "@/lib/cliente-status";

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

  // O estado é limpo ao fechar, não ao abrir: zerar num efeito de abertura
  // dispara render em cascata (react-hooks/set-state-in-effect), e o resultado
  // visível é o mesmo, já que nada aqui é mostrado com o modal fechado.
  const fechar = () => {
    setErro("");
    setEnviados(0);
    onFechar?.();
  };

  const enviar = async (arquivos) => {
    if (!arquivos?.length) return;
    setEnviando(true);
    setErro("");
    try {
      const fd = new FormData();
      for (const arquivo of arquivos) fd.append("arquivos", arquivo);
      const res = await fetch(`/api/backend/clientes/${clienteId}/documentos/tela_aprovacao`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Falha no envio.");
      // O servidor devolve o que recusou; esconder isso faria a pessoa acreditar
      // que enviou uma tela que não está lá.
      if (json.falhas?.length) {
        setErro(`Não foi possível processar: ${json.falhas.join(", ")}`);
      }
      setEnviados(arquivos.length - (json.falhas?.length ?? 0));
      onEnviado?.();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (!clienteId || !status) return null;

  const info = statusInfo(status);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && !enviando && fechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar tela de aprovação?</DialogTitle>
          <DialogDescription>
            {clienteNome ? `${clienteNome} está agora em "${info.label}".` : `Status alterado para "${info.label}".`}
            {" "}Guarde o print da tela que a Caixa devolveu.
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
            enviar(arquivos);
          }}
        />

        {enviados > 0 ? (
          <p className="text-sm text-cx-text">
            {enviados === 1 ? "Tela enviada." : `${enviados} telas enviadas.`} Ela já aparece nos documentos do cliente.
          </p>
        ) : null}
        {erro ? <p className="text-xs text-red-600">{erro}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={fechar} disabled={enviando}>
            {enviados > 0 ? "Fechar" : "Agora não"}
          </Button>
          <Button onClick={() => inputRef.current?.click()} disabled={enviando}>
            {enviando ? "Enviando…" : enviados > 0 ? "Enviar outra" : "Enviar imagem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TelaAprovacaoModal;
