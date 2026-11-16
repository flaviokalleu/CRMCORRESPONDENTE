"use client";

import { LancamentoForm } from "@/components/financeiro/LancamentoForm";

// Mantido pelo nome antigo; o formulário de verdade é o LancamentoForm
// (mesmo POST /api/backend/receitas).
export function ReceitaForm(props) {
  return <LancamentoForm tipo="receita" {...props} />;
}
