"use client";

import { useEffect, useState } from "react";

// Pendências reais do usuário, compartilhadas entre o menu (badges) e o sino
// do topo. Uma única busca a cada minuto, mesmo com os dois montados:
// a promessa fica guardada no módulo e quem chegar depois reaproveita.
//   tarefas  = lembretes não concluídos com data até o fim de hoje
//   clientes = clientes aguardando aprovação
const asList = (d) => (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
const get = (path) =>
  fetch(`/api/backend${path}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

let cache = { chave: "", em: 0, promessa: null };

function buscar({ isStaff, operacional }) {
  const chave = `${isStaff}-${operacional}`;
  if (cache.promessa && cache.chave === chave && Date.now() - cache.em < 60_000) return cache.promessa;
  const fimDeHoje = new Date();
  fimDeHoje.setHours(23, 59, 59, 999);
  const promessa = Promise.all([
    isStaff ? get("/lembretes") : Promise.resolve(null),
    operacional ? get("/dashboard") : Promise.resolve(null),
  ]).then(([lembretes, dash]) => {
    const tarefas = asList(lembretes).filter(
      (t) => !t.concluido && t.status !== "concluido" && t.data && new Date(t.data) <= fimDeHoje
    ).length;
    const main = dash?.data ?? dash;
    return { tarefas, clientes: Number(main?.totalClientesAguardandoAprovacao) || 0 };
  });
  cache = { chave, em: Date.now(), promessa };
  return promessa;
}

export function usePendencias(pathname, { isStaff, operacional }) {
  const [pendencias, setPendencias] = useState({ tarefas: 0, clientes: 0 });

  useEffect(() => {
    let cancelado = false;
    buscar({ isStaff, operacional }).then((p) => { if (!cancelado) setPendencias(p); });
    return () => { cancelado = true; };
  }, [pathname, isStaff, operacional]);

  return pendencias;
}
