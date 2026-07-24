"use client";

import { ClienteForm } from "@/components/ClienteForm";

// Wrapper fino: reaproveita o formulário completo em modo edição (PUT
// multipart /clientes/:id). `cliente` já vem desembrulhado pela page.
export function EditarClienteForm({ clienteId, cliente }) {
  return <ClienteForm mode="edit" clienteId={clienteId} initial={cliente} />;
}
