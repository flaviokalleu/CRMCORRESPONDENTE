import Link from "next/link";
import { Plus } from "lucide-react";

// Primitivos de UI presentacionais (sem hooks — seguros em Server Components)
// para manter todas as páginas no mesmo idioma visual sóbrio: fundo navy,
// cards com borda sutil, laranja só no CTA primário.

export function PageHeader({ title, subtitle, actionHref, actionLabel, actionIcon: Icon = Plus }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="text-sm text-white/45">{subtitle}</p>}
      </div>
      {actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
        >
          <Icon className="h-4 w-4" /> {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function initialsOf(name) {
  const p = (name || "").trim().split(/\s+/).filter(Boolean);
  return p.length ? (p[0][0] + (p[1]?.[0] || "")).toUpperCase() : "?";
}

export function Avatar({ name, className = "" }) {
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-xs font-semibold text-white/70 ${className}`}>
      {initialsOf(name)}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white/30">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        {hint && <p className="text-xs text-white/40">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

// Tabela — wrappers finos que aplicam o estilo padrão.
export function Table({ children, className = "" }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-sm ${className}`}>{children}</table>
      </div>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead>
      <tr className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.1em] text-white/40">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, right, className = "" }) {
  return <th className={`px-4 py-3 font-semibold ${right ? "text-right" : ""} ${className}`}>{children}</th>;
}

export function Row({ children, className = "" }) {
  return <tr className={`border-b border-white/[0.05] last:border-0 hover:bg-white/[0.03] ${className}`}>{children}</tr>;
}

export function Td({ children, right, muted, className = "" }) {
  return (
    <td className={`px-4 py-3 ${right ? "text-right" : ""} ${muted ? "text-white/55" : "text-white/80"} ${className}`}>
      {children}
    </td>
  );
}

// Card genérico (seções, painéis).
export function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.025] p-5 ${className}`}>{children}</div>;
}

export function formatBRL(value, { compact = false } = {}) {
  const n = Number(value);
  if (value == null || value === "" || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: compact ? 0 : 2,
  }).format(n);
}
