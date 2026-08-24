"use client";

import { ImovelForm } from "@/components/ImovelForm";

// Wrapper fino: o cadastro completo (multipart + upload de imagens) vive em
// ImovelForm.
export function AddImovelForm() {
  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-semibold text-cx-text">Adicionar Imóvel</h1>
      <p className="mb-6 text-sm text-cx-muted">Cadastro completo — dados, valores, descrição e imagens.</p>
      <ImovelForm mode="create" />
    </div>
  );
}
