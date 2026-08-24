import { FileSearch, Gift, Wallet } from "lucide-react";

// "Foi liberado R$ 200 mil para mim" — o que isso quer dizer de verdade.
//
// Quarta versão. As anteriores erravam o CONCEITO, não só a forma: tratavam
// os "R$ 200 mil" como um valor único que o banco cobre mais ou menos
// conforme o imóvel. Não é isso.
//
// O que a pessoa recebe é um BENEFÍCIO HABITACIONAL — a soma de coisas
// diferentes: o financiamento (que ela paga em parcelas) + subsídios federal,
// estadual e às vezes municipal (que ela NÃO paga de volta) + FGTS. Só uma
// dessas partes vira dívida. Por isso o desenho central agora é uma barra
// DECOMPOSTA: a mesma soma, separada entre "você paga" e "você não paga".
//
// E a regra que mais surpreende, dita por último porque é contraintuitiva:
// quanto MENOR a renda (dentro das regras), MAIOR o subsídio e MENOR a
// parcela. Não é o contrário.
//
// Números do exemplo, todos reais e verificáveis:
//   · subsídio federal MCMV — até R$ 55.000
//   · subsídio estadual de Goiás (Agehab, "Pra Ter Onde Morar – Crédito
//     Parceria") — até R$ 47,4 mil, para renda de até 3 salários mínimos,
//     somável ao federal, usado como entrada ou para reduzir a parcela.

const TOTAL = 200000;

const PARTES = [
  {
    id: "financiamento",
    rotulo: "Financiamento",
    valor: 97600,
    cor: "#1c60ab",
    paga: true,
    nota: "vira parcela",
  },
  {
    id: "federal",
    rotulo: "Subsídio federal",
    valor: 55000,
    cor: "#047857",
    paga: false,
    nota: "Minha Casa Minha Vida",
  },
  {
    id: "estadual",
    rotulo: "Subsídio estadual",
    valor: 47400,
    cor: "#0e7490",
    paga: false,
    nota: "Governo de Goiás",
  },
];

const brl = (n) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function PorQueOValorMuda() {
  const naoPaga = PARTES.filter((p) => !p.paga).reduce((s, p) => s + p.valor, 0);

  return (
    <section id="quanto-liberam" className="scroll-mt-20">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <h2 className="text-2xl font-bold tracking-tight text-cx-text sm:text-3xl">
          &ldquo;Foi liberado R$ 200 mil para mim&rdquo;
        </h2>
        <p className="mt-2 text-base text-cx-muted sm:text-lg">
          Isso <strong className="font-semibold text-cx-text">não é dinheiro na sua conta</strong>, nem
          o quanto você precisa gastar. É a soma de partes diferentes — e{" "}
          <strong className="font-semibold text-cx-text">só uma delas você paga</strong>.
        </p>

        {/* ── A decomposição ────────────────────────────────────────── */}
        <div className="mt-7 rounded-2xl border border-cx-border bg-white p-5 sm:p-7">
          <p className="font-tabular text-center text-sm font-semibold text-cx-muted">
            O que chamam de &ldquo;R$ 200 mil liberados&rdquo;
          </p>

          {/* Barra única, dividida. O vão de 2px separa os pedaços sem
              depender do contraste entre as cores. */}
          <div className="mt-3 flex h-12 w-full gap-[2px] overflow-hidden rounded-lg">
            {PARTES.map((p) => (
              <div
                key={p.id}
                className="flex h-full items-center justify-center first:rounded-l-lg last:rounded-r-lg"
                style={{ width: `${(p.valor / TOTAL) * 100}%`, backgroundColor: p.cor }}
                title={`${p.rotulo}: ${brl(p.valor)}`}
              >
                <span className="font-tabular px-1 text-center text-[0.7rem] font-bold text-white">
                  {Math.round((p.valor / TOTAL) * 100)}%
                </span>
              </div>
            ))}
          </div>

          <ul className="mt-4 space-y-2.5">
            {PARTES.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: p.cor }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-cx-text">{p.rotulo}</span>
                  <span className="block text-xs text-cx-muted">{p.nota}</span>
                </span>
                <span className="font-tabular shrink-0 text-sm font-bold text-cx-text">
                  {brl(p.valor)}
                </span>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.68rem] font-bold ${
                    p.paga
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {p.paga ? (
                    <>
                      <Wallet className="h-3 w-3" aria-hidden="true" /> você paga
                    </>
                  ) : (
                    <>
                      <Gift className="h-3 w-3" aria-hidden="true" /> não paga
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-900">
            {brl(naoPaga)} são presente. Você não devolve nada disso.
          </p>
        </div>

        {/* ── A regra que surpreende ────────────────────────────────── */}
        <div className="mt-4 rounded-2xl border border-cx-border bg-white p-5 sm:p-7">
          <p className="text-center text-sm font-bold text-cx-text">
            Quanto <span className="text-cx-blue">menor</span> a sua renda, {" "}
            <span className="text-cx-blue">maior</span> o subsídio
          </p>
          <p className="mt-1 text-center text-xs text-cx-muted">
            É o contrário do que a maioria imagina. Ganhar mais não dá mais benefício.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <ColunaRenda
              renda="R$ 2.000"
              alturaSubsidio="h-24"
              alturaParcela="h-8"
              veredito="Subsídio maior · parcela menor"
              tom="bom"
            />
            <ColunaRenda
              renda="R$ 4.500"
              alturaSubsidio="h-10"
              alturaParcela="h-20"
              veredito="Subsídio menor · parcela maior"
              tom="neutro"
            />
          </div>

          <p className="mt-4 text-center text-xs text-cx-muted">
            O subsídio estadual de Goiás, por exemplo, é para famílias com renda de até{" "}
            <strong className="font-semibold text-cx-text">3 salários mínimos</strong>.
          </p>
        </div>

        {/* ── O laudo ───────────────────────────────────────────────── */}
        <div className="mt-4 rounded-2xl border border-cx-border bg-white p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cx-blue-soft text-cx-blue">
              <FileSearch className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-cx-text">
                E o imóvel tem um valor de avaliação — o laudo
              </p>
              <p className="mt-1 text-sm leading-relaxed text-cx-muted">
                Muitos imóveis têm laudo de {brl(180000)} e estão à venda por menos que isso.{" "}
                <strong className="font-semibold text-emerald-800">
                  Quando isso acontece, é ótimo para você
                </strong>{" "}
                — você compra abaixo do que o imóvel vale.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-5 rounded-xl bg-cx-bg p-5 text-center text-sm leading-relaxed text-cx-text">
          Antes de dizer &ldquo;liberaram R$ 200 mil&rdquo;, a gente precisa ver três coisas:{" "}
          <strong className="font-semibold">quanto o banco aprovou de financiamento</strong>,{" "}
          <strong className="font-semibold">quanto entra de subsídio</strong> e{" "}
          <strong className="font-semibold">quanto o imóvel vale de verdade</strong>.
          <br />
          <span className="mt-1 inline-block text-xs text-cx-muted">
            Valores de exemplo. Chame a gente no WhatsApp que fazemos essa conta com os seus números.
          </span>
        </p>
      </div>
    </section>
  );
}

// Duas colunas comparando renda baixa e renda média. As alturas são
// deliberadamente esquemáticas (não são valores em reais) — a mensagem é a
// RELAÇÃO INVERSA entre subsídio e parcela, não a magnitude exata.
function ColunaRenda({ renda, alturaSubsidio, alturaParcela, veredito, tom }) {
  return (
    <div className="rounded-xl border border-cx-border bg-cx-bg p-4">
      <p className="text-center text-sm font-bold text-cx-text">Renda {renda}</p>

      <div className="mt-4 flex items-end justify-center gap-6" aria-hidden="true">
        <div className="flex flex-col items-center">
          <div className={`w-12 rounded-t-md bg-emerald-700 ${alturaSubsidio}`} />
          <span className="mt-1.5 text-[0.65rem] font-semibold text-cx-muted">Subsídio</span>
        </div>
        <div className="flex flex-col items-center">
          <div className={`w-12 rounded-t-md bg-cx-blue ${alturaParcela}`} />
          <span className="mt-1.5 text-[0.65rem] font-semibold text-cx-muted">Parcela</span>
        </div>
      </div>

      <p
        className={`mt-3 flex min-h-[2.5rem] items-center justify-center rounded-md px-2 py-1.5 text-center text-xs font-semibold ${
          tom === "bom" ? "bg-emerald-50 text-emerald-800" : "bg-cx-surface text-cx-muted"
        }`}
      >
        {veredito}
      </p>
    </div>
  );
}
