import Link from "next/link";
import { Check, X } from "lucide-react";

// Página de preços/planos SaaS ("/precos"). Server Component estático —
// a SPA antiga (frontend/src/pages/PrecosPage.jsx) usa dados de planos
// hardcoded (PLANS/COMPARISON_ROWS), não busca em API (`/tenant/plans` não é
// chamado por essa página lá — só existe em RegistroSaasPage/MinhaAssinatura,
// fora do escopo público). Por isso os planos aqui também são estáticos.
// Toggle mensal/anual e accordion de FAQ foram simplificados (sem JS client-side)
// usando <details>/<summary> nativo — funcional, sem necessidade de "use client".
export const metadata = {
  title: "Preços e Planos",
  description:
    "Conheça os planos do CRM IMOB: Free, Basic e Professional. Gerencie clientes, imóveis, aluguéis e pagamentos em um só lugar.",
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    description: "Para quem quer conhecer o sistema sem compromisso.",
    priceMonthly: 0,
    limits: { clientes: "50", usuarios: "2", imoveis: "20", alugueis: "10" },
    features: {
      whatsapp: false,
      pagamentos: false,
      ia: false,
      relatorios: false,
      multiusuarios: false,
      api: false,
      suportePrioritario: false,
      dominioCustomizado: false,
    },
    cta: "Começar Grátis",
    ctaLink: "/registro",
    badge: null,
    highlighted: false,
  },
  {
    id: "basic",
    name: "Basic",
    description: "Para imobiliárias e corretores em crescimento.",
    priceMonthly: 97,
    limits: { clientes: "500", usuarios: "10", imoveis: "100", alugueis: "50" },
    features: {
      whatsapp: false,
      pagamentos: true,
      ia: false,
      relatorios: true,
      multiusuarios: true,
      api: false,
      suportePrioritario: false,
      dominioCustomizado: false,
    },
    cta: "Começar Trial de 14 dias",
    ctaLink: "/registro?plano=basic",
    badge: "Mais Popular",
    highlighted: true,
  },
  {
    id: "professional",
    name: "Professional",
    description: "Para operações completas com todos os recursos.",
    priceMonthly: 197,
    limits: { clientes: "Ilimitado", usuarios: "Ilimitado", imoveis: "Ilimitado", alugueis: "Ilimitado" },
    features: {
      whatsapp: true,
      pagamentos: true,
      ia: true,
      relatorios: true,
      multiusuarios: true,
      api: true,
      suportePrioritario: true,
      dominioCustomizado: true,
    },
    cta: "Começar Trial de 14 dias",
    ctaLink: "/registro?plano=professional",
    badge: null,
    highlighted: false,
  },
];

const FEATURE_LABELS = {
  whatsapp: "Integração WhatsApp",
  pagamentos: "Gestão de Pagamentos",
  ia: "Análise com IA",
  relatorios: "Relatórios Avançados",
  multiusuarios: "Multi-usuários",
  api: "Acesso à API",
  suportePrioritario: "Suporte Prioritário",
  dominioCustomizado: "Domínio Customizado",
};

const LIMIT_LABELS = {
  clientes: "Clientes",
  usuarios: "Usuários",
  imoveis: "Imóveis",
  alugueis: "Aluguéis",
};

const COMPARISON_ROWS = [
  { section: "Limites" },
  { key: "clientes", label: "Clientes", values: ["50", "500", "Ilimitado"] },
  { key: "usuarios", label: "Usuários", values: ["2", "10", "Ilimitado"] },
  { key: "imoveis", label: "Imóveis", values: ["20", "100", "Ilimitado"] },
  { key: "alugueis", label: "Aluguéis", values: ["10", "50", "Ilimitado"] },
  { section: "Funcionalidades" },
  { key: "dashboard", label: "Dashboard", values: [true, true, true] },
  { key: "cadastro", label: "Cadastro de Clientes", values: [true, true, true] },
  { key: "kanban", label: "Kanban de Clientes", values: [true, true, true] },
  { key: "imoveis_gestao", label: "Gestão de Imóveis", values: [true, true, true] },
  { key: "pagamentos", label: "Gestão de Pagamentos", values: [false, true, true] },
  { key: "relatorios", label: "Relatórios Avançados", values: [false, true, true] },
  { key: "multiusuarios", label: "Multi-usuários com Permissões", values: [false, true, true] },
  { key: "whatsapp", label: "Integração WhatsApp", values: [false, false, true] },
  { key: "ia", label: "Análise com IA", values: [false, false, true] },
  { key: "api", label: "Acesso à API", values: [false, false, true] },
  { key: "suporte_prioritario", label: "Suporte Prioritário", values: [false, false, true] },
  { key: "dominio", label: "Domínio Customizado", values: [false, false, true] },
];

const FAQ_ITEMS = [
  {
    question: "Posso mudar de plano depois?",
    answer:
      "Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. Ao fazer upgrade, o valor é ajustado proporcionalmente ao período restante.",
  },
  {
    question: "Como funciona o trial de 14 dias?",
    answer:
      "Ao se cadastrar nos planos Basic ou Professional, você tem acesso completo por 14 dias, sem necessidade de cartão de crédito.",
  },
  {
    question: "Quais formas de pagamento são aceitas?",
    answer: "Aceitamos cartão de crédito, boleto bancário e PIX.",
  },
  {
    question: "Meus dados estão seguros?",
    answer:
      "Sim. Utilizamos criptografia SSL/TLS, backups automáticos diários e armazenamento seguro, de acordo com a LGPD.",
  },
  {
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim, você pode cancelar sua assinatura a qualquer momento sem multa ou taxa de cancelamento.",
  },
];

function PlanCard({ plan }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-8 ${
        plan.highlighted ? "border-caixa-orange bg-caixa-primary shadow-lg" : "border-gray-700/50 bg-caixa-primary/70"
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-bold rounded-full bg-caixa-orange text-white">
          {plan.badge}
        </span>
      )}

      <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
      <p className="text-sm text-gray-400 mb-6">{plan.description}</p>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-sm text-gray-400">R$</span>
          <span className="text-4xl font-extrabold text-white">{plan.priceMonthly.toLocaleString("pt-BR")}</span>
          {plan.priceMonthly > 0 && <span className="text-sm text-gray-400">/mês</span>}
        </div>
      </div>

      <div className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Limites</p>
        {Object.entries(plan.limits).map(([key, value]) => (
          <div key={key} className="text-sm text-gray-300">
            <span className="font-semibold text-white">{value}</span> {LIMIT_LABELS[key]}
          </div>
        ))}
      </div>

      <div className="mb-8 space-y-2 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Funcionalidades</p>
        {Object.entries(plan.features).map(([key, enabled]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            {enabled ? (
              <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : (
              <X className="w-4 h-4 text-gray-600 flex-shrink-0" />
            )}
            <span className={enabled ? "text-gray-300" : "text-gray-600"}>{FEATURE_LABELS[key]}</span>
          </div>
        ))}
      </div>

      <Link
        href={plan.ctaLink}
        className={`block w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-colors ${
          plan.highlighted
            ? "bg-caixa-orange text-white hover:bg-caixa-orange-dark"
            : "bg-white/10 text-white hover:bg-white/20 border border-gray-600"
        }`}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

function ComparisonTable() {
  const planNames = ["Free", "Basic", "Professional"];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="py-4 px-4 text-left text-gray-400 font-medium w-1/3">Funcionalidade</th>
            {planNames.map((name) => (
              <th key={name} className="py-4 px-4 text-center text-white font-semibold">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row, i) => {
            if (row.section) {
              return (
                <tr key={`section-${i}`}>
                  <td colSpan={4} className="pt-6 pb-2 px-4 text-xs font-bold uppercase tracking-wider text-caixa-orange">
                    {row.section}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={row.key} className="border-b border-gray-800">
                <td className="py-3 px-4 text-gray-300">{row.label}</td>
                {row.values.map((val, j) => (
                  <td key={j} className="py-3 px-4 text-center">
                    {typeof val === "boolean" ? (
                      val ? (
                        <Check className="w-4 h-4 text-green-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-gray-600 mx-auto" />
                      )
                    ) : (
                      <span className="text-white font-medium">{val}</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function PrecosPage() {
  return (
    <div className="min-h-screen bg-caixa-primary">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <Link href="/" className="text-sm text-gray-400 hover:text-white">
          &larr; Voltar
        </Link>
      </div>

      <section className="max-w-6xl mx-auto px-4 pt-10 pb-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Escolha seu Plano</h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          O CRM completo para corretores e imobiliárias. Gerencie clientes, imóveis, aluguéis e pagamentos em um só
          lugar.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-white text-center mb-10">Comparação Detalhada</h2>
        <div className="rounded-2xl border border-gray-700/50 bg-white/5 p-4 sm:p-6">
          <ComparisonTable />
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 pb-24">
        <h2 className="text-2xl font-bold text-white text-center mb-10">Perguntas Frequentes</h2>
        <div className="rounded-2xl border border-gray-700/50 bg-white/5 p-6 sm:p-8 divide-y divide-gray-800">
          {FAQ_ITEMS.map((item, i) => (
            <details key={i} className="py-4 group">
              <summary className="cursor-pointer text-white font-medium list-none flex items-center justify-between">
                {item.question}
                <span className="text-caixa-orange group-open:rotate-180 transition-transform">v</span>
              </summary>
              <p className="mt-3 text-gray-400 text-sm leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-20 text-center">
        <div className="rounded-2xl border border-caixa-orange/30 bg-white/5 p-10">
          <h2 className="text-2xl font-bold text-white mb-4">Pronto para transformar sua gestão imobiliária?</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Comece gratuitamente e faça upgrade quando quiser. Sem compromisso, sem cartão de crédito.
          </p>
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-caixa-orange text-white font-semibold hover:bg-caixa-orange-dark transition-colors"
          >
            Começar Agora
          </Link>
        </div>
      </section>
    </div>
  );
}
