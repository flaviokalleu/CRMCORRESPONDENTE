import Link from "next/link";
import { ArrowLeft, ArrowRight, Scale } from "lucide-react";
import { apiGet } from "@/lib/api-server";
import { fraunces } from "@/lib/fonts";
import { CONTRACT_GROUPS, CONTRACT_TYPES, CONTRACT_ICONS } from "@/lib/contract-templates";
import { ICONS } from "@/lib/contract-icons";

export const metadata = { title: "Modelos de contrato" };

const TONE = {
  orange: {
    badge: "bg-gradient-to-br from-caixa-orange to-caixa-orange-dark text-white shadow-lg shadow-caixa-orange/25",
    glow: "hover:shadow-caixa-orange/10 hover:border-caixa-orange/40",
    bar: "from-caixa-orange to-caixa-orange-dark",
    text: "text-cx-orange-text",
  },
  blue: {
    badge: "bg-gradient-to-br from-[#3987e5] to-[#1c4d85] text-white shadow-lg shadow-blue-500/20",
    glow: "hover:shadow-blue-400/10 hover:border-blue-200",
    bar: "from-[#3987e5] to-[#1c4d85]",
    text: "text-blue-700",
  },
};

// Galeria de modelos — biblioteca de contratos da imobiliária, tratada
// como um catálogo editorial (não uma lista de <select>): hero com
// identidade, cartões com selo em gradiente, lift + glow no hover.
export default async function ContratosGaleria({ searchParams }) {
  const params = await searchParams;
  const propostaId = params?.proposta;
  let p = null;
  if (propostaId) {
    const list = await apiGet("/propostas");
    const propostas = list?.data || (Array.isArray(list) ? list : []);
    p = propostas.find((item) => String(item.id) === String(propostaId)) || null;
  }

  const qs = propostaId ? `?proposta=${propostaId}` : "";
  const totalModelos = CONTRACT_GROUPS.reduce((sum, g) => sum + g.types.length, 0);

  return (
    <div className={`${fraunces.variable} cx-page relative min-h-full`}>
      <div className="aurora aurora-drift left-[-6%] top-[-10%] h-72 w-72 bg-caixa-orange/10" />
      <div className="aurora left-[70%] top-[5%] h-64 w-64 bg-blue-50" />

      <div className="relative space-y-10 p-4 sm:p-8">
        <div>
          <Link href="/propostas" className="inline-flex items-center gap-1.5 text-xs font-medium text-cx-muted hover:text-cx-text">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para propostas
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-caixa-orange to-caixa-orange-dark text-white shadow-xl shadow-caixa-orange/25">
                <Scale className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cx-orange-text">
                  Biblioteca jurídica · {totalModelos} modelos
                </p>
                <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-cx-text sm:text-4xl">
                  Modelos de contrato
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-cx-muted">
                  Escolha um modelo para abrir o editor — o texto vem pré-preenchido com os dados
                  da proposta e é totalmente editável antes de imprimir ou exportar.
                </p>
              </div>
            </div>
          </div>
        </div>

        {p && (
          <div className="flex items-center gap-3 rounded-2xl border border-caixa-orange/25 bg-caixa-orange/[0.08] px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-caixa-orange/20 text-caixa-orange-light">
              <Scale className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-cx-orange-text">Gerando contrato para</p>
              <p className="mt-0.5 text-sm font-medium text-cx-text">
                {p.cliente?.nome || "Cliente"} <span className="mx-1 text-cx-muted">·</span> {p.imovel?.nome_imovel || "Imóvel"}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-10">
          {CONTRACT_GROUPS.map((group) => {
            const GroupIcon = ICONS[group.icon];
            const tone = TONE[group.tone] || TONE.blue;
            return (
              <section key={group.label}>
                <div className="mb-4 flex items-center gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.badge}`}>
                    {GroupIcon && <GroupIcon className="h-5 w-5" strokeWidth={1.7} />}
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-cx-text">{group.label}</h2>
                    <p className="text-xs text-cx-muted">{group.description}</p>
                  </div>
                  <div className={`ml-3 h-px flex-1 bg-gradient-to-r ${tone.bar} opacity-20`} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.types.map((key) => {
                    const type = CONTRACT_TYPES[key];
                    const Icon = ICONS[CONTRACT_ICONS[key]];
                    return (
                      <Link
                        key={key}
                        href={`/propostas/contratos/${key}${qs}`}
                        className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-cx-border bg-cx-surface p-5 shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-1 hover:bg-cx-surface ${tone.glow}`}
                      >
                        <div
                          className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${tone.bar} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-20`}
                        />
                        <span className={`relative flex h-11 w-11 items-center justify-center rounded-xl ${tone.badge}`}>
                          {Icon && <Icon className="h-5 w-5" strokeWidth={1.7} />}
                        </span>
                        <div className="relative min-w-0 flex-1">
                          <p className="font-display text-base font-semibold text-cx-text">{type.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-cx-muted">{type.description}</p>
                        </div>
                        <div className={`relative inline-flex items-center gap-1 text-xs font-semibold ${tone.text}`}>
                          Abrir editor
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
