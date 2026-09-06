"use client";

import { Download, Printer } from "lucide-react";

const csvCell = (value) => {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
};

export function DashboardExportActions({ rows = [], filename = "painel-gerencial" }) {
  const exportCsv = () => {
    const content = rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob([`\ufeff${content}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filename}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-no-print inline-flex overflow-hidden rounded-lg border border-wb-border bg-white">
      <button
        type="button"
        onClick={exportCsv}
        className="inline-flex h-9 items-center gap-1.5 border-r border-wb-border px-3 text-xs font-semibold text-wb-muted transition-colors hover:bg-wb-surface-2 hover:text-wb-text"
        title="Exportar resumo e fila em CSV"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        CSV
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-9 items-center gap-1.5 px-3 text-xs font-semibold text-wb-muted transition-colors hover:bg-wb-surface-2 hover:text-wb-text"
        title="Imprimir ou salvar o painel em PDF"
      >
        <Printer className="h-3.5 w-3.5" aria-hidden="true" />
        Imprimir
      </button>
    </div>
  );
}
