import { apiGet } from "@/lib/api-server";

export const metadata = { title: "Relatórios" };

// Server Component. Referência: frontend/src/pages/RelatorioPage.jsx.
// Dados JSON vêm de apiGet('/report/relatorio/dados') (Go: internal/modules/relatorios,
// montado em /api/report — ver routes.go). "Visualizar Online" e "Baixar PDF"
// não precisam de JS: são links simples para o proxy, que já anexa o Bearer
// no servidor (GET /api/backend/report/relatorio[/download]).
export default async function RelatorioPage() {
  const dados = await apiGet("/report/relatorio/dados");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-1">Relatórios de Clientes</h1>
      <p className="text-sm text-white/50 mb-6">
        Relatórios completos com análises detalhadas dos clientes cadastrados no sistema.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <a
          href="/api/backend/report/relatorio"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors p-4"
        >
          <p className="text-sm font-semibold text-white">Visualizar Online</p>
          <p className="text-xs text-white/50 mt-1">Abre o relatório completo em uma nova aba.</p>
        </a>
        <a
          href="/api/backend/report/relatorio/download"
          className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors p-4"
        >
          <p className="text-sm font-semibold text-white">Baixar PDF</p>
          <p className="text-xs text-white/50 mt-1">Gera e baixa o relatório em PDF.</p>
        </a>
      </div>

      <h2 className="text-sm font-semibold text-white mb-2">Dados brutos (JSON)</h2>
      {dados ? (
        <pre className="rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-white/70 overflow-x-auto max-h-[60vh] overflow-y-auto">
          {JSON.stringify(dados, null, 2)}
        </pre>
      ) : (
        <p className="text-white/50 text-sm">Não foi possível carregar os dados do relatório.</p>
      )}
    </div>
  );
}
