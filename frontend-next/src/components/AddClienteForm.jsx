"use client";

import { ClienteForm } from "@/components/ClienteForm";

// Wrapper fino: o cadastro completo (multipart, cônjuge, fiador, documentos,
// formulários Caixa, vínculo de responsável) vive em ClienteForm.
export function AddClienteForm() {
  return <ClienteForm mode="create" />;
}
