import { Star } from "lucide-react";

// Faixa de marquee contínua com selos de confiança / diferenciais. Estática
// no servidor (só CSS anima) — mantém SEO e custa zero JS.
const ITEMS = [
  "Segurança jurídica",
  "Atendimento personalizado",
  "Financiamento facilitado",
  "Vistoria profissional",
  "Repasse via PIX",
  "Contrato digital",
  "Régua de cobrança automática",
];

export function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="grain relative overflow-hidden border-y border-white/5 bg-caixa-primary py-4">
      <div className="flex w-max marquee-track">
        {row.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-8 text-sm font-medium uppercase tracking-[0.2em] text-[#9aa6b4]">
            <Star className="h-3.5 w-3.5 fill-caixa-orange text-cx-orange-text" />
            {item}
          </div>
        ))}
      </div>
      {/* fades laterais */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-caixa-primary to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-caixa-primary to-transparent" />
    </div>
  );
}
