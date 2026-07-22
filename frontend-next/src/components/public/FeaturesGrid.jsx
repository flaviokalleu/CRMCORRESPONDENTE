"use client";

import { Building2, KeyRound, MessageCircle, ShieldCheck, Users, Wallet } from "lucide-react";
import { FeatureCard } from "./FeatureCard";

// Ícones (componentes/funções) não podem atravessar o limite Server->Client
// como props — por isso a lista de features mora aqui dentro, junto do
// client component que efetivamente os renderiza.
const FEATURES = [
  { icon: Users, title: "Clientes", description: "Funil completo, da aprovação à documentação, sem planilha." },
  { icon: Building2, title: "Imóveis", description: "Portfólio para venda e locação com vitrine pública otimizada." },
  { icon: KeyRound, title: "Aluguéis", description: "Contratos, reajuste IGPM, régua de cobrança automatizada." },
  { icon: Wallet, title: "Financeiro", description: "Receitas, despesas, comissões e pagamentos via Asaas." },
  { icon: MessageCircle, title: "WhatsApp", description: "Notificações automáticas de status, cobrança e documentos." },
  { icon: ShieldCheck, title: "Multi-tenant", description: "Cada organização isolada, com sessão 100% em cookie httpOnly." },
];

export function FeaturesGrid() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature, i) => (
        <FeatureCard key={feature.title} index={i} {...feature} />
      ))}
    </div>
  );
}
