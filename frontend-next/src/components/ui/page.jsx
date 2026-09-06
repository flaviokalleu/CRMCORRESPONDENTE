import Link from "next/link";
import { Children, cloneElement, isValidElement } from "react";
import { Plus } from "lucide-react";

// Primitivos de UI presentacionais (sem hooks — seguros em Server Components)
// para manter todas as páginas no mesmo idioma visual: superfície aqua
// (azul→turquesa) atrás, cards de vidro claro em cima, laranja só no CTA
// primário. Os níveis de vidro/texto aqui são calibrados para o fundo
// colorido: sobre ele, branco a 2–5% desaparece e texto a 40% fica ilegível.

export function PageHeader({ title, subtitle, actionHref, actionLabel, actionIcon: Icon = Plus }) {
  return (
    <div className="crm-page-header">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-cx-text">{title}</h1>
        {subtitle && <p className="text-sm text-cx-muted">{subtitle}</p>}
      </div>
      {actionHref && (
        <Link
          href={actionHref}
          className="crm-primary-action"
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
    <div className={`crm-avatar flex h-10 w-10 shrink-0 items-center justify-center text-sm font-semibold ${className}`}>
      {initialsOf(name)}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint, children }) {
  return (
    <div className="crm-empty crm-card flex flex-col items-center justify-center gap-3 text-center">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cx-border bg-cx-surface text-cx-muted">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-cx-text">{title}</p>
        {hint && <p className="text-xs text-cx-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

// Tabela — wrappers finos que aplicam o estilo padrão.
export function Table({ children, className = "" }) {
  const sections = Children.toArray(children);
  const head = sections.find((child) => isValidElement(child) && child.type === Thead);
  const labels = head ? Children.toArray(head.props.children).map((cell) => cell.props?.children) : [];
  const content = sections.map((section) => {
    if (!isValidElement(section) || section.type !== 'tbody') return section;
    return cloneElement(section, {}, Children.map(section.props.children, (row) => {
      if (!isValidElement(row)) return row;
      return cloneElement(row, {}, Children.map(row.props.children, (cell, index) =>
        isValidElement(cell) && cell.type === Td ? cloneElement(cell, { label: labels[index] }) : cell
      ));
    }));
  });
  return (
    <div className="crm-table">
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-sm ${className}`}>{content}</table>
      </div>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead>
      <tr className="border-b border-cx-border bg-cx-surface text-[10px] uppercase tracking-[0.1em] text-cx-muted">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, right, className = "" }) {
  return <th className={`px-4 py-3 font-semibold ${right ? "text-right" : ""} ${className}`}>{children}</th>;
}

export function Row({ children, className = "" }) {
  return <tr className={`border-b border-cx-border/[0.12] last:border-0 hover:bg-cx-surface ${className}`}>{children}</tr>;
}

export function Td({ children, right, muted, label, className = "", ...props }) {
  return (
    <td {...props} data-label={typeof label === 'string' ? label : undefined} className={`px-4 py-3 ${right ? "text-right" : ""} ${muted ? "text-cx-muted" : "text-cx-text"} ${className}`}>
      {children}
    </td>
  );
}

// Card genérico (seções, painéis).
export function Card({ children, className = "" }) {
  return (
    <div className={`crm-card p-6 ${className}`}>
      {children}
    </div>
  );
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
