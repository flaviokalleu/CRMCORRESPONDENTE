import Link from "next/link";
import { CartoesDePlanos } from "@/components/public/CartoesDePlanos";
import { planosPublicos, diasDeTeste } from "@/lib/planos-publicos";

// Página de preços ("/precos"). Server Component: os planos vêm do banco
// (planosPublicos), a mesma fonte do cadastro e da troca de plano — preço,
// limites e dias de teste nunca divergem entre as páginas.
export const metadata = {
  title: { absolute: "Planos e preços | Webba CRM" },
  description: "Planos do Webba CRM para corretores e imobiliárias: clientes, imóveis, propostas, aluguéis e cobranças em um só lugar.",
};

export default async function PrecosPage() {
  const planos = await planosPublicos();
  const dias = diasDeTeste(planos);

  const perguntas = [
    {
      q: `Como funciona o teste grátis de ${dias} dias?`,
      a: `Você usa o sistema completo do plano escolhido por ${dias} dias, sem cadastrar cartão. Se gostar, paga a primeira mensalidade; se não, é só não pagar — nada é cobrado.`,
    },
    {
      q: "Posso mudar de plano depois?",
      a: "Sim, quando quiser, em Minha assinatura. Durante o teste a troca vale na hora; depois, vale a partir da próxima mensalidade.",
    },
    { q: "Como eu pago?", a: "Por Pix, boleto ou cartão de crédito. A cobrança chega por e-mail e fica disponível dentro do sistema." },
    { q: "E se eu atrasar?", a: "Avisamos antes e no dia do vencimento. Depois do vencimento ainda há alguns dias de tolerância antes de o acesso ser suspenso — e nenhum dado é apagado." },
    { q: "Meus dados ficam seguros?", a: "Sim. Cada imobiliária só enxerga os próprios dados, as conexões são criptografadas e o tratamento segue a LGPD." },
  ];

  return (
    <div className="pricing-page min-h-screen bg-cx-bg text-cx-text">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <Link href="/" className="text-base font-semibold text-cx-muted hover:text-cx-text">
          &larr; Voltar ao site
        </Link>
      </div>

      <section className="mx-auto max-w-3xl px-4 pb-10 pt-10 text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Escolha seu plano</h1>
        <p className="mt-3 text-lg text-cx-muted">
          Teste grátis por {dias} dias, sem cartão. Você só paga se decidir continuar.
        </p>
      </section>

      <section className="px-4 pb-20">
        <CartoesDePlanos planos={planos} />
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="mb-6 text-center text-2xl font-bold">Perguntas frequentes</h2>
        <div className="crm-card divide-y divide-[var(--border)] p-6">
          {perguntas.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold">
                {item.q}
                <span aria-hidden="true" className="text-cx-muted transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <p className="mt-2 text-base leading-relaxed text-cx-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24 text-center">
        <h2 className="text-2xl font-bold">Pronto para organizar sua imobiliária?</h2>
        <p className="mt-2 text-base text-cx-muted">Leva 2 minutos para criar a conta.</p>
        <Link href="/registro" className="pricing-card-cta highlighted mt-6 inline-flex h-12 items-center rounded-xl px-8 text-base font-semibold">
          Começar teste grátis
        </Link>
      </section>
    </div>
  );
}
