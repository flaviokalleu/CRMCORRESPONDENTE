import Link from "next/link";
import { Info } from "lucide-react";

// Aviso de que o valor liberado varia por imóvel e por laudo.
//
// Aparece em TODO ponto onde o site mostra um número de dinheiro estimado —
// simulação, card, detalhe do imóvel. A explicação completa mora na seção
// #quanto-liberam da home; aqui vai a versão curta, no lugar da decisão.
//
// Por que repetir: a pessoa não lê o site inteiro. Ela cai direto num imóvel
// pelo Google ou pelo WhatsApp, vê "R$ 1.400/mês" e assume que é o que vai
// pagar. O aviso precisa estar onde o número está.

const VARIANTES = {
  // Caixa completa — para páginas de decisão (detalhe do imóvel, resultado
  // da simulação).
  caixa:
    "flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900",
  // Linha discreta — para listas e rodapés de seção.
  linha: "flex items-start gap-2 text-[0.7rem] leading-relaxed text-cx-muted",
};

export function AvisoValorVaria({ variante = "caixa", contexto = "geral", className = "" }) {
  const textos = {
    geral: (
      <>
        Este valor é uma <strong className="font-semibold">estimativa pela sua renda</strong>. Quanto
        o banco libera de verdade muda conforme o imóvel escolhido e o laudo de avaliação.
      </>
    ),
    imovel: (
      <>
        A parcela acima é <strong className="font-semibold">estimativa</strong>. O que o banco libera
        para <em>este</em> imóvel depende do laudo de avaliação e do tipo do imóvel — novo, usado ou
        terreno mudam bastante o resultado.
      </>
    ),
    lista: (
      <>
        As parcelas são estimativas para dar ordem de grandeza. O valor real varia de imóvel para
        imóvel e depende do laudo do banco.
      </>
    ),
  };

  return (
    <p className={`${VARIANTES[variante]} ${className}`}>
      <Info
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${variante === "caixa" ? "text-amber-700" : "text-cx-muted"}`}
        aria-hidden="true"
      />
      <span>
        {textos[contexto] || textos.geral}{" "}
        <Link href="/#quanto-liberam" className="font-semibold underline underline-offset-2">
          Entenda por quê
        </Link>
      </span>
    </p>
  );
}
