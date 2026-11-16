"use client";

import { UsuarioForm } from "@/components/UsuarioForm";

// Wrapper fino: corretor e correspondente usam o mesmo formulário (UsuarioForm).
export function AddCorretorForm() {
  return <UsuarioForm tipo="corretor" />;
}
