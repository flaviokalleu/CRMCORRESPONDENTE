"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, ExternalLink, MessageCircle, RefreshCw, Trash2 } from "@/components/icons";
import { formatBRL } from "@/components/ui/page";
import { formatarData, valorPagamento } from "@/lib/financeiro";

// Ações por cobrança, a um toque: copiar link, mandar no WhatsApp do
// cliente, abrir, conferir se já foi pago e excluir. Tudo pelo proxy
// /api/backend/pagamentos — nunca fala com o Go direto.
export function PagamentoRowActions({ pagamento, situacao, cliente }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(null);
  const link = pagamento.invoice_url || pagamento.link_curto;
  const emAberto = situacao?.id === "atrasado" || situacao?.id === "avencer";

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado. Cole na conversa com o cliente.");
    } catch {
      toast.error("Não deu para copiar. Abra o link e copie pelo navegador.");
    }
  };

  const whatsapp = () => {
    const nome = cliente?.nome ? cliente.nome.split(" ")[0] : "";
    const texto = `Olá${nome ? `, ${nome}` : ""}! Segue o link para pagamento de "${pagamento.titulo}" (${formatBRL(valorPagamento(pagamento))}, vencimento ${formatarData(pagamento.data_vencimento)}): ${link}`;
    const fone = String(cliente?.telefone || "").replace(/\D/g, "");
    const numero = fone.length >= 10 ? (fone.startsWith("55") ? fone : `55${fone}`) : "";
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  };

  const conferir = async () => {
    setOcupado("conferir");
    try {
      const res = await fetch("/api/backend/pagamentos/verificar-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagamento_id: pagamento.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(res.status === 422 && data.error ? data.error : "Não foi possível conferir agora. Tente mais tarde.");
        return;
      }
      const atualizado = await res.json().catch(() => ({}));
      toast.success(atualizado.status === "aprovado" ? "Pagamento confirmado!" : "Conferido: ainda não foi pago.");
      router.refresh();
    } finally {
      setOcupado(null);
    }
  };

  const excluir = async () => {
    if (!confirm(`Excluir a cobrança "${pagamento.titulo}"? O link deixa de aparecer aqui.`)) return;
    setOcupado("excluir");
    try {
      const res = await fetch(`/api/backend/pagamentos/${pagamento.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Cobrança excluída.");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Não foi possível excluir.");
      }
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div className="fin-acoes">
      {link && emAberto && (
        <button type="button" onClick={whatsapp} className="fin-acao" title="Enviar o link no WhatsApp do cliente">
          <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
        </button>
      )}
      {link && (
        <button type="button" onClick={copiar} className="fin-acao" title="Copiar link de pagamento" aria-label="Copiar link de pagamento">
          <Copy className="size-4" aria-hidden="true" />
        </button>
      )}
      {link && (
        <a href={link} target="_blank" rel="noreferrer" className="fin-acao" aria-label="Abrir cobrança">
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      )}
      {emAberto && pagamento.asaas_payment_id && (
        <button type="button" onClick={conferir} disabled={!!ocupado} className="fin-acao" aria-label="Conferir se já foi pago" title="Conferir se já foi pago">
          <RefreshCw className="size-4" aria-hidden="true" />
        </button>
      )}
      {/* Cobrança paga não se exclui (o backend recusa): nem mostra o botão. */}
      {situacao?.id !== "pago" && (
        <button type="button" onClick={excluir} disabled={!!ocupado} className="fin-acao" data-tom="perigo" aria-label={`Excluir cobrança ${pagamento.titulo}`}>
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
