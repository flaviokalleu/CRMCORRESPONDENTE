"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, KeyRound, Loader2, Trash2, Home as DoorOpen } from "@/components/icons";

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
    if (!window.confirm(`Excluir o imóvel "${aluguel.nome_imovel}"? Não dá para desfazer.`)) return;
    setLoadingKey("delete");
    setError("");
    try {
      const res = await fetch(`/api/backend/alugueis/${aluguel.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Não foi possível excluir o imóvel");
      router.refresh();
    } catch (e) {
      setError(e.message || "Não foi possível excluir o imóvel");
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

  // Uma ação principal com rótulo (alternar alugado/disponível) e as demais
  // como ícones de 40px, numa linha só — antes as três se empilhavam e o
  // texto "Baixar fotos" quebrava letra por letra na coluna estreita.
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={loadingKey === "status"}
          className="lst-botao"
          title={aluguel.alugado ? "O inquilino saiu? Volte para disponível" : "Fechou a locação? Marque como alugado"}
        >
          {aluguel.alugado ? <DoorOpen aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
          {loadingKey === "status" ? "Salvando…" : aluguel.alugado ? "Marcar disponível" : "Marcar alugado"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={loadingKey === "download"}
          className="lst-acao"
          title="Baixar fotos (.zip)"
          aria-label={`Baixar fotos de ${aluguel.nome_imovel}`}
        >
          {loadingKey === "download" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loadingKey === "delete"}
          className="lst-acao lst-acao-perigo"
          title="Excluir imóvel"
          aria-label={`Excluir ${aluguel.nome_imovel}`}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
      {error && <p className="lst-erro" role="alert">{error}</p>}
    </div>
  );
}
