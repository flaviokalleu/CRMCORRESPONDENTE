"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Faixa fixa enquanto o superadmin vê o sistema como outra empresa: deixa
// claro onde ele está e oferece a saída em um clique.
export function FaixaVerComo({ empresa }) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    await fetch("/api/ver-empresa", { method: "DELETE" });
    router.push("/super-admin");
    router.refresh();
  }

  return (
    <aside className="ass-faixa ass-tom-neutro" role="status">
      <span>Você está vendo o sistema como <strong>{empresa.nome}</strong>.</span>
      <button type="button" onClick={sair} disabled={saindo} className="ass-faixa-botao">
        {saindo ? "Saindo…" : "Voltar ao painel"}
      </button>
    </aside>
  );
}
