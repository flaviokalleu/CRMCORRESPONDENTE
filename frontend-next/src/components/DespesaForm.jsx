"use client";

import { LancamentoForm } from "@/components/financeiro/LancamentoForm";

// Mantido pelo nome antigo; o formulário de verdade é o LancamentoForm
// (mesmo POST /api/backend/despesas).
export function DespesaForm(props) {
  return <LancamentoForm tipo="despesa" {...props} />;
}
