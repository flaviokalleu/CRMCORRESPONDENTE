"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Client Component: ações por linha da lista de pagamentos (copiar link,
// abrir link, excluir). Usa o proxy /api/backend/pagamentos/:id — nunca
// fala com o Go direto. Mantido separado da página Server Component
// (src/app/(app)/pagamentos/lista/page.js) para isolar o único pedaço
// interativo da tela.
export function PagamentoRowActions({ pagamento }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const copiarLink = () => {
    if (!pagamento.invoice_url) return;
    navigator.clipboard.writeText(pagamento.invoice_url);
    alert("Link copiado!");
  };

  const excluir = async () => {
    if (!confirm(`Excluir o pagamento "${pagamento.titulo}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/backend/pagamentos/${pagamento.id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erro ao excluir pagamento");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      {pagamento.invoice_url && (
        <>
          <button onClick={copiarLink} className="text-xs text-white/60 hover:text-white underline">
            Copiar link
          </button>
          <a
            href={pagamento.invoice_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-orange-400 hover:text-orange-300 underline"
          >
            Abrir
          </a>
        </>
      )}
      <button
        onClick={excluir}
        disabled={deleting}
        className="text-xs text-red-400 hover:text-red-300 underline disabled:opacity-50"
      >
        {deleting ? "Excluindo..." : "Excluir"}
      </button>
    </div>
  );
}
