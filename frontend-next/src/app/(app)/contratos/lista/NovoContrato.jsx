"use client";

import { useState } from "react";
import { ContratoVincularForm } from "@/components/aluguel/ContratoVincularForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Plus } from "@/components/icons";

// Botão "Novo contrato" que abre o formulário num diálogo: a lista vem
// primeiro e o formulário só aparece quando a pessoa pede.
export function NovoContrato({ opcoes }) {
  const [aberto, setAberto] = useState(false);
  const [salvo, setSalvo] = useState(false);

  return (
    <div className="form-acoes">
      {salvo && (
        <p role="status" className="form-aviso" data-tom="ok">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Contrato salvo.
        </p>
      )}
      <button type="button" className="cx-btn cx-btn-primary" onClick={() => { setSalvo(false); setAberto(true); }}>
        <Plus className="h-4 w-4" aria-hidden="true" /> Novo contrato
      </button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo contrato de aluguel</DialogTitle>
            <DialogDescription>Escolha quem aluga, qual imóvel e quem é o dono. Se quiser, anexe o contrato assinado.</DialogDescription>
          </DialogHeader>
          <ContratoVincularForm opcoes={opcoes} onSalvo={() => { setAberto(false); setSalvo(true); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
