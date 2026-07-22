"use client";

import { CriarPagamentoForm } from "@/components/CriarPagamentoForm";

// Client Component (ver docs-wiring-financeiro.md): formulário precisa de
// estado local (clientes carregados via fetch, campos controlados) — POST
// vai sempre para /api/backend/pagamentos/<tipo>, nunca direto ao Go.
export default function CriarPagamentoPage() {
  return <CriarPagamentoForm />;
}
