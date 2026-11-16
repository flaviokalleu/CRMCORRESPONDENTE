"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { situacaoEmTexto, brl } from "./formatos";

const ROTA = "/minha-assinatura";

// Envolve o conteúdo do app:
// - acesso suspenso → mostra a tela de bloqueio no lugar da página (exceto em
//   Minha assinatura, onde a pessoa paga). Nunca deixa a pessoa sem saída.
// - prazo correndo (teste ou atraso) → faixa fina no topo com UM botão.
export function AvisoAssinatura({ resumo, children }) {
  const pathname = usePathname();
  if (!resumo || resumo.plataforma) return children;

  const acesso = resumo.acesso || {};
  const naTelaDaAssinatura = pathname?.startsWith(ROTA);

  if (!acesso.liberado && !naTelaDaAssinatura) {
    return <TelaBloqueio resumo={resumo} />;
  }

  const mostrarFaixa =
    !naTelaDaAssinatura && (acesso.situacao === "teste" || acesso.situacao === "atrasada");

  return (
    <>
      {mostrarFaixa && <Faixa resumo={resumo} />}
      {children}
    </>
  );
}

function Faixa({ resumo }) {
  const t = situacaoEmTexto(resumo.acesso);
  return (
    <aside className={`ass-faixa ass-tom-${t.tom}`} role="status">
      <span>
        {t.titulo}. {t.detalhe}
      </span>
      {resumo.pode_gerenciar && <Link href={ROTA}>{resumo.acesso.situacao === "teste" ? "Assinar agora" : "Pagar agora"}</Link>}
    </aside>
  );
}

function TelaBloqueio({ resumo }) {
  const t = situacaoEmTexto(resumo.acesso);
  const fatura = resumo.fatura_aberta;
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className={`crm-card ass-destaque ass-tom-${t.tom} w-full max-w-xl p-8`}>
        <span className="ass-selo">{t.selo}</span>
        <h1 className="mt-4 text-2xl">{t.titulo}</h1>
        <p className="mt-2 text-base text-cx-muted">{t.detalhe}</p>

        {resumo.pode_gerenciar ? (
          resumo.acesso.situacao !== "bloqueio_manual" && (
            <Link href={ROTA} className="crm-primary-action mt-6 inline-flex h-12 items-center px-6 text-base">
              {fatura ? `Pagar ${brl(fatura.valor)}` : "Ver minha assinatura"}
            </Link>
          )
        ) : (
          <p className="mt-6 text-base font-semibold text-cx-text">
            Peça ao administrador da sua empresa para regularizar a assinatura.
          </p>
        )}
      </div>
    </div>
  );
}
