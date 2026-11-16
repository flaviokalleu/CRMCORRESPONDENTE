"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "@/components/icons";

// Barra de ações dos formulários: "Cancelar" + uma ação principal.
// No celular fica presa ao rodapé (.crm-actionbar) para o polegar alcançar.
export function FormActions({
  submitLabel,
  loadingLabel = "Salvando…",
  loading = false,
  icon: Icon,
  cancelHref,
  cancelLabel = "Cancelar",
  onCancel,
  children,
}) {
  const router = useRouter();
  return (
    <div className="crm-actionbar">
      {children}
      {cancelHref ? (
        <Link href={cancelHref} className="cx-btn cx-btn-outline">{cancelLabel}</Link>
      ) : (
        <button type="button" className="cx-btn cx-btn-outline" onClick={onCancel ?? (() => router.back())}>
          {cancelLabel}
        </button>
      )}
      <button type="submit" disabled={loading} aria-busy={loading || undefined}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
        {loading ? loadingLabel : submitLabel}
      </button>
    </div>
  );
}

// Escolha rápida em pílulas (ex.: quartos 1/2/3/4+). `opcoes` = [{ value, label }].
export function QuickChoice({ id, value, onChange, opcoes, label }) {
  return (
    <div className="crm-choices" role="group" aria-label={label} id={id}>
      {opcoes.map((o) => (
        <button
          key={o.value}
          type="button"
          className="crm-choice"
          aria-pressed={value === o.value}
          onClick={() => onChange(value === o.value ? "" : o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
