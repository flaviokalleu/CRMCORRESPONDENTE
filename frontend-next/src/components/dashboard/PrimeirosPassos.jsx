"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight } from "@/components/icons";

// "Primeiros passos" — só para o administrador, no topo do dashboard.
// Imobiliária nova entra num sistema vazio: este card diz o que fazer, em
// ordem, cada passo com o atalho direto. Some quando tudo estiver feito ou
// quando a pessoa dispensar (lembrado neste navegador).
const get = (path) =>
  fetch(`/api/backend${path}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

const chaveDispensa = (tenantId) => `primeiros-passos-dispensado:${tenantId ?? "x"}`;

function lerDispensa(tenantId) {
  try { return window.localStorage.getItem(chaveDispensa(tenantId)) === "1"; } catch { return false; }
}

export function PrimeirosPassos({ tenantId }) {
  const [passos, setPassos] = useState(null);
  const [dispensado, setDispensado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    Promise.all([get("/assinatura"), get("/tenant-settings/settings"), get("/propostas?limit=1")]).then(
      async ([assinatura, empresa, propostas]) => {
        const temWhatsApp = assinatura?.recursos?.has_whatsapp !== false;
        const whats = temWhatsApp ? await get("/whatsapp/status") : null;
        if (cancelado) return;
        const atual = (k) => Number(assinatura?.limites?.[k]?.atual) || 0;
        const totalPropostas = Number(propostas?.total) || (Array.isArray(propostas?.data) ? propostas.data.length : 0);
        const lista = [
          { id: "empresa", texto: "Coloque o logo e os contatos da empresa", href: "/configuracoes-empresa", feito: Boolean(empresa?.logo && empresa?.telefone) },
          ...(temWhatsApp ? [{ id: "whatsapp", texto: "Conecte o WhatsApp", href: "/whatsapp-qr", feito: Boolean(whats?.isConnected) }] : []),
          { id: "imovel", texto: "Cadastre o primeiro imóvel", href: "/imoveis/adicionar", feito: atual("imoveis") > 0 },
          { id: "cliente", texto: "Cadastre o primeiro cliente", href: "/clientes/adicionar", feito: atual("clientes") > 0 },
          { id: "corretor", texto: "Cadastre um corretor da equipe", href: "/corretores/adicionar", feito: atual("usuarios") > 1 },
          { id: "proposta", texto: "Crie a primeira proposta", href: "/propostas", feito: totalPropostas > 0 },
        ];
        setDispensado(lerDispensa(tenantId));
        setPassos(lista);
      }
    );
    return () => { cancelado = true; };
  }, [tenantId]);

  if (!passos || dispensado) return null;
  const feitos = passos.filter((p) => p.feito).length;
  if (feitos === passos.length) return null;

  const dispensar = () => {
    try { window.localStorage.setItem(chaveDispensa(tenantId), "1"); } catch { /* sem armazenamento: some só nesta visita */ }
    setDispensado(true);
  };

  const pct = Math.round((feitos / passos.length) * 100);

  return (
    <section aria-labelledby="primeiros-passos-titulo" className="primeiros-passos crm-card">
      <div className="primeiros-passos-topo">
        <div>
          <h2 id="primeiros-passos-titulo">Primeiros passos</h2>
          <p>Deixe o sistema pronto para o dia a dia. {feitos} de {passos.length} feitos.</p>
        </div>
        <button type="button" onClick={dispensar} className="primeiros-passos-dispensar">
          Não mostrar mais
        </button>
      </div>

      <div
        className="primeiros-passos-barra"
        role="progressbar"
        aria-label="Progresso dos primeiros passos"
        aria-valuemin={0}
        aria-valuemax={passos.length}
        aria-valuenow={feitos}
      >
        <span style={{ width: `${pct}%` }} />
      </div>

      <ol className="primeiros-passos-lista">
        {passos.map((p) =>
          p.feito ? (
            <li key={p.id} className="primeiros-passos-item" data-feito="true">
              <span className="primeiros-passos-marca"><Check className="h-3 w-3" aria-hidden="true" /></span>
              <span className="sr-only">Feito: </span>{p.texto}
            </li>
          ) : (
            <li key={p.id}>
              <Link href={p.href} className="primeiros-passos-item">
                <span className="primeiros-passos-marca" aria-hidden="true" />
                {p.texto}
                <span><ChevronRight className="h-3 w-3" aria-hidden="true" /></span>
              </Link>
            </li>
          )
        )}
      </ol>
    </section>
  );
}
