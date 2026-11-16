"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "@/components/icons";

// Excluir um lançamento lançado por engano (DELETE /api/backend/{rota}/:id).
export function ExcluirLancamento({ rota, id, descricao }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);

  const excluir = async () => {
    if (!confirm(`Excluir "${descricao}"? Essa ação não pode ser desfeita.`)) return;
    setOcupado(true);
    try {
      const res = await fetch(`/api/backend/${rota}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Não foi possível excluir.");
        return;
      }
      toast.success("Lançamento excluído.");
      router.refresh();
    } catch {
      toast.error("Sem conexão com o servidor.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <button type="button" onClick={excluir} disabled={ocupado} className="fin-acao" data-tom="perigo" aria-label={`Excluir ${descricao}`}>
      <Trash2 className="size-4" aria-hidden="true" />
      <span className="sr-only">Excluir</span>
    </button>
  );
}
