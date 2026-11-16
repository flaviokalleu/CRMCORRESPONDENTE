"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2 } from "@/components/icons";

// Client Component: deletar contrato e baixar documento vinculado.
// Referência de lógica: frontend/src/components/ListaContratos.jsx.
export function ContratoRowActions({ contrato }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!window.confirm(`Desfazer o contrato de ${contrato.nome}? O inquilino continua cadastrado; só o vínculo com o imóvel, o proprietário e os documentos sai.`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/backend/contratos/${contrato.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar contrato");
      router.refresh();
    } catch (e) {
      setError(e.message || "Falha ao deletar contrato");
    } finally {
      setLoading(false);
    }
  }

  const documentos = Array.isArray(contrato.contrato_documentos) ? contrato.contrato_documentos : [];

  async function handleDownload(doc, idx) {
    const docId = doc?.id ?? `${contrato.id}-${idx}`;
    try {
      const res = await fetch(`/api/backend/contratos/documento/${docId}/download`);
      if (!res.ok) throw new Error("Erro ao baixar documento");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.nome_arquivo || doc.nome || `documento_${docId}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || "Erro ao baixar documento");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
        {documentos.map((doc, idx) => (
          <button
            key={doc.id ?? idx}
            type="button"
            onClick={() => handleDownload(doc, idx)}
            className="lst-botao"
            title={doc.nome_arquivo || doc.nome}
          >
            <FileText aria-hidden="true" /> Doc {idx + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="lst-acao lst-acao-perigo"
          aria-label={`Desfazer o contrato de ${contrato.nome}`}
          title="Desfazer contrato (o inquilino continua cadastrado)"
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
      {error && <p className="lst-erro" role="alert">{error}</p>}
    </div>
  );
}
