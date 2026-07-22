"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Client Component: deletar contrato e baixar documento vinculado.
// Referência de lógica: frontend/src/components/ListaContratos.jsx.
export function ContratoRowActions({ contrato }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!window.confirm("Tem certeza que deseja deletar este contrato?")) return;
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
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        {documentos.map((doc, idx) => (
          <button
            key={doc.id ?? idx}
            type="button"
            onClick={() => handleDownload(doc, idx)}
            className="rounded-md border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
            title={doc.nome_arquivo || doc.nome}
          >
            Doc {idx + 1}
          </button>
        ))}
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {loading ? "..." : "Deletar"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
