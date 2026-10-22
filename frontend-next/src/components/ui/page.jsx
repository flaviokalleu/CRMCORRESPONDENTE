import Link from "next/link";
import { Children, cloneElement, isValidElement } from "react";
import { Plus } from "@/components/icons";

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
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-soft text-primary">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div>
        <p className="text-base font-semibold text-ink-heading">{title}</p>
        {hint && <p className="text-sm text-cx-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

// Tabela — card "Lista de …" do kit (Contatos): título do card, a tabela e
// o rodapé com a contagem. `title` é o título do card; o rodapé conta as
// linhas do <tbody> sozinho.
export function Table({ children, className = "", title, footer }) {
  const sections = Children.toArray(children);
  const head = sections.find((child) => isValidElement(child) && child.type === Thead);
  const labels = head ? Children.toArray(head.props.children).map((cell) => cell.props?.children) : [];
  // Linha de estado vazio (uma célula com colSpan) não conta como registro.
  const linhas = sections
    .filter((section) => isValidElement(section) && section.type === 'tbody')
    .flatMap((section) => Children.toArray(section.props.children))
    .filter((row) => {
      if (!isValidElement(row)) return false;
      const cells = Children.toArray(row.props.children).filter(isValidElement);
      return !(cells.length === 1 && cells[0].props?.colSpan);
    }).length;
  const content = sections.map((section) => {
    if (!isValidElement(section) || section.type !== 'tbody') return section;
    return cloneElement(section, {}, Children.map(section.props.children, (row) => {
      if (!isValidElement(row)) return row;
      return cloneElement(row, {}, Children.map(row.props.children, (cell, index) =>
        isValidElement(cell) && cell.type === Td ? cloneElement(cell, { label: labels[index] }) : cell
      ));
    }));
  });
  const rodape = footer ?? (linhas > 0 ? `Exibindo 1 a ${linhas} de ${linhas} registro(s)` : null);
  return (
    <div className="crm-table">
      {title && (
        <div className="crm-table-head">
          <h2>{title}</h2>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-sm ${className}`}>{content}</table>
      </div>
      {rodape && <div className="crm-table-foot">{rodape}</div>}
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead>
      <tr>
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, right, className = "" }) {
  return <th className={`${right ? "text-right" : ""} ${className}`}>{children}</th>;
}

export function Row({ children, className = "" }) {
  return <tr className={className}>{children}</tr>;
}

export function Td({ children, right, muted, label, className = "", ...props }) {
  return (
    <td {...props} data-label={typeof label === 'string' ? label : undefined} className={`${right ? "text-right" : ""} ${muted ? "text-cx-muted" : "text-cx-text"} ${className}`}>
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
