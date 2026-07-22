"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Client Component: ações por linha da lista de aluguéis (deletar, alternar
// status alugado/disponível, baixar zip de fotos). Fala com o backend Go
// via proxy `/api/backend/*` — nunca localStorage, nunca chamada direta.
export function AluguelRowActions({ aluguel }) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState(null);
  const [error, setError] = useState("");

  async function handleToggleStatus() {
    setLoadingKey("status");
    setError("");
    try {
      const res = await fetch(`/api/backend/alugueis/${aluguel.id}/alugado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alugado: !aluguel.alugado }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      router.refresh();
    } catch (e) {
      setError(e.message || "Erro ao atualizar status");
    } finally {
      setLoadingKey(null);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Deletar o imóvel "${aluguel.nome_imovel}"? Esta ação não pode ser desfeita.`)) return;
    setLoadingKey("delete");
    setError("");
    try {
      const res = await fetch(`/api/backend/alugueis/${aluguel.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar imóvel");
      router.refresh();
    } catch (e) {
      setError(e.message || "Erro ao deletar imóvel");
    } finally {
      setLoadingKey(null);
    }
  }

  async function handleDownload() {
    setLoadingKey("download");
    setError("");
    try {
      const res = await fetch(`/api/backend/alugueis/${aluguel.id}/download`);
      if (!res.ok) throw new Error("Erro ao baixar as fotos");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fotos_imovel_${aluguel.id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || "Erro ao baixar as fotos");
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={loadingKey === "download"}
          className="flex-1 rounded-md border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          {loadingKey === "download" ? "Baixando..." : "Baixar fotos"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loadingKey === "delete"}
          className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {loadingKey === "delete" ? "..." : "Deletar"}
        </button>
      </div>
      <button
        type="button"
        onClick={handleToggleStatus}
        disabled={loadingKey === "status"}
        className={`w-full rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-50 ${
          aluguel.alugado
            ? "border-green-300 text-green-700 hover:bg-green-50"
            : "border-red-300 text-red-700 hover:bg-red-50"
        }`}
      >
        {loadingKey === "status" ? "Atualizando..." : aluguel.alugado ? "Marcar disponível" : "Marcar alugado"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
