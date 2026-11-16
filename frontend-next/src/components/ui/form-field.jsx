"use client";

import { Children, cloneElement, isValidElement } from "react";
import { AlertCircle, CheckCircle } from "@/components/icons";

// Campo de formulário acessível: rótulo ligado ao controle (htmlFor/id), dica
// e erro abaixo. O controle filho recebe id, aria-invalid e aria-describedby
// sozinho — basta passar um único elemento como filho.
//
//   <FormField id="nome" label="Nome completo" required error={erros.nome}>
//     <input value={...} onChange={...} />
//   </FormField>
// `semClonar`: o filho já liga id/aria sozinho (ex.: input dentro de um wrapper).
export function FormField({ id, label, hint, error, ok, required, optional, semClonar = false, className = "", children }) {
  const hintId = hint ? `${id}-dica` : undefined;
  const errorId = error ? `${id}-erro` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const only = Children.count(children) === 1 ? Children.only(children) : null;
  const control = !semClonar && isValidElement(only)
    ? cloneElement(only, {
        id: only.props.id ?? id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })
    : children;

  return (
    <div className={`crm-field ${className}`}>
      {label && (
        <label htmlFor={id}>
          <span>{label}</span>
          {required && <span className="crm-field-req" aria-hidden="true">*</span>}
          {optional && <span className="crm-field-opt">(opcional)</span>}
        </label>
      )}
      {control}
      {error ? (
        <p id={errorId} className="crm-field-error" role="alert">
          <AlertCircle aria-hidden="true" /> {error}
        </p>
      ) : ok ? (
        <p className="crm-field-ok"><CheckCircle className="h-4 w-4" aria-hidden="true" /> {ok}</p>
      ) : null}
      {hint && <p id={hintId} className="crm-field-hint">{hint}</p>}
    </div>
  );
}

// Leva o foco (e a rolagem) ao primeiro campo com erro, na ordem da tela.
// `ordem` é a lista de ids na ordem em que aparecem.
export function focarPrimeiroErro(erros, ordem) {
  const primeiro = ordem.find((id) => erros[id]);
  if (!primeiro) return;
  requestAnimationFrame(() => {
    const el = document.getElementById(primeiro);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  });
}

// Aviso no topo do formulário (erro geral do servidor ou sucesso).
export function FormAlert({ tom = "erro", titulo, children, acoes }) {
  if (!titulo && !children) return null;
  const Icone = tom === "ok" ? CheckCircle : AlertCircle;
  return (
    <div className="crm-alert" data-tom={tom} role={tom === "erro" ? "alert" : "status"}>
      <Icone aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {titulo && <strong>{titulo}</strong>}
        {children}
        {acoes && <div className="crm-alert-actions">{acoes}</div>}
      </div>
    </div>
  );
}
