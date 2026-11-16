"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "@/components/icons";

// Ações da linha nas listas de corretores e correspondentes: editar e
// excluir. Fala com o Go pelo proxy /api/backend/{corretor|correspondente}.
const ROTAS = {
  corretor: { api: "/api/backend/corretor", editar: "/corretores/editar" },
  correspondente: { api: "/api/backend/correspondente", editar: "/correspondentes/editar" },
};

export function EquipeRowActions({ tipo, pessoa }) {
  const rota = ROTAS[tipo];
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const nome = `${pessoa.first_name || ""} ${pessoa.last_name || ""}`.trim() || pessoa.username;

  const excluir = async () => {
    if (!window.confirm(`Excluir ${nome}? A pessoa perde o acesso ao sistema. Os clientes, visitas e cobranças dela continuam no CRM.`)) return;
    setOcupado(true);
    try {
      const res = await fetch(`${rota.api}/${pessoa.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Não foi possível excluir. Tente de novo.");
        return;
      }
      toast.success(`${nome} foi excluído(a).`);
      router.refresh();
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="lst-contato">
      <Link href={`${rota.editar}/${pessoa.id}`} className="lst-acao" aria-label={`Editar ${nome}`} title="Editar">
        <Pencil aria-hidden="true" />
      </Link>
      <button type="button" onClick={excluir} disabled={ocupado} className="lst-acao lst-acao-perigo" aria-label={`Excluir ${nome}`} title="Excluir">
        <Trash2 aria-hidden="true" />
      </button>
    </div>
  );
}
