import Link from "next/link";
import { Check } from "@/components/icons";

// Cartões de plano para as páginas públicas, montados com os dados reais do
// banco. Lei de Hick: cada cartão mostra só o que o plano TEM, e o seguinte
// diz "Tudo do X, mais:" — sem listas de ✕ para comparar.

const RECURSOS = [
  ["has_pagamentos", "Cobranças por boleto e Pix"],
  ["has_relatorios_avancados", "Relatórios completos"],
  ["has_multi_usuarios", "Equipe com vários usuários"],
  ["has_whatsapp", "Avisos pelo WhatsApp"],
  ["has_ai_analysis", "Análise com inteligência artificial"],
  ["has_suporte_prioritario", "Suporte prioritário"],
  ["has_api_access", "Integração com outros sistemas"],
  ["has_dominio_customizado", "Site com o seu domínio"],
];

const LIMITES = [
  ["max_clientes", "clientes"],
  ["max_imoveis", "imóveis"],
  ["max_usuarios", "usuários"],
  ["max_alugueis", "aluguéis"],
];

function textoLimite(valor, nome) {
  return valor ? `Até ${valor.toLocaleString("pt-BR")} ${nome}` : `${nome[0].toUpperCase()}${nome.slice(1)} sem limite`;
}

// Centavos só quando existem: R$ 97 fica "R$ 97", mas R$ 297,90 não pode
// virar "R$ 298" (arredondava e mostrava um preço que não é o cobrado).
const brl = (v) => {
  const n = Number(v) || 0;
  const casas = Number.isInteger(n) ? 0 : 2;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: casas, maximumFractionDigits: casas }).format(n);
};

export function CartoesDePlanos({ planos }) {
  if (!planos.length) {
    return <p className="text-center text-base text-cx-muted">Os planos estão sendo atualizados. Volte em instantes.</p>;
  }
  // O do meio (ou o segundo) é o recomendado: âncora visual entre o simples e o completo.
  const recomendado = planos.length >= 3 ? planos[1].id : planos[planos.length - 1].id;

  return (
    <div className={`grid grid-cols-1 gap-5 ${planos.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"} mx-auto max-w-5xl`}>
      {planos.map((p, i) => {
        // "Tudo do X, mais:" só quando é verdade: este plano tem todos os
        // recursos do anterior. Senão, lista os recursos dele inteiros.
        const anterior = planos[i - 1];
        const herda = anterior && RECURSOS.every(([k]) => !anterior[k] || p[k]);
        const novos = RECURSOS.filter(([k]) => p[k] && !(herda && anterior[k]));
        const destaque = p.id === recomendado;
        return (
          <article key={p.id} className={`pricing-card relative flex flex-col rounded-2xl border p-7 text-left ${destaque ? "highlighted" : ""}`}>
            {destaque && (
              <span className="pricing-card-badge absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-cx-orange px-4 py-1 text-sm font-bold">
                Mais escolhido
              </span>
            )}
            <h3 className="pricing-card-title text-xl font-bold">{p.nome}</h3>
            {p.descricao && <p className="pricing-card-description mt-1 text-base">{p.descricao}</p>}

            <p className="mt-5 flex items-baseline gap-1">
              <span className="pricing-card-price text-4xl font-extrabold">{brl(p.preco_mensal)}</span>
              <span className="pricing-card-currency text-base">/mês</span>
            </p>
            {p.preco_anual > 0 && p.preco_anual < p.preco_mensal * 12 && (
              <p className="pricing-card-currency mt-1 text-sm">
                ou {brl(p.preco_anual)}/ano (economize {brl(p.preco_mensal * 12 - p.preco_anual)})
              </p>
            )}

            <ul className="mt-6 flex-1 space-y-2.5">
              {herda && <li className="pricing-card-kicker text-sm font-semibold">Tudo do {anterior.nome}, mais:</li>}
              {LIMITES.map(([k, nome]) => (
                <li key={k} className="pricing-card-feature enabled flex items-center gap-2 text-base">
                  <Check className="h-4 w-4 shrink-0" /> {textoLimite(p[k], nome)}
                </li>
              ))}
              {novos.map(([k, nome]) => (
                <li key={k} className="pricing-card-feature enabled flex items-center gap-2 text-base">
                  <Check className="h-4 w-4 shrink-0" /> {nome}
                </li>
              ))}
            </ul>

            <Link
              href={`/registro?plano=${p.slug}`}
              className={`pricing-card-cta mt-7 flex w-full items-center justify-center rounded-xl px-6 py-3 text-base font-semibold ${destaque ? "highlighted" : ""}`}
            >
              {p.trial_dias ? `Testar ${p.trial_dias} dias grátis` : "Começar agora"}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
