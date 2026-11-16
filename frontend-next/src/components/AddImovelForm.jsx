"use client";

import { ImovelForm } from "@/components/ImovelForm";
import { PageHeader } from "@/components/ui/page";

// Wrapper fino: o cadastro completo (multipart + upload de imagens) vive em
// ImovelForm.
export function AddImovelForm() {
  return (
    <div>
      <PageHeader title="Cadastrar imóvel" subtitle="Só nome, endereço e valor são obrigatórios. O resto pode ficar para depois." />
      <ImovelForm mode="create" />
    </div>
  );
}
