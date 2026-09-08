import { apiGet } from "@/lib/api-server";
import { RelatoriosDashboard } from "@/components/RelatoriosDashboard";

export const metadata = { title: "Relatórios" };

// Server Component. Dados vêm de apiGet('/report/relatorio/dados') (Go:
// internal/modules/relatorios/analytics.go, montado em /api/report — ver
// routes.go). A página antiga despejava esse JSON cru num <pre>; agora
// RelatoriosDashboard lê os campos reais (geral/perfil/tendencias/
// documentos/fgts/recomendacoes) e monta os painéis — nada de número
// inventado, ver relatorio-frontend.md para o mapeamento completo.
//
// apiGet nunca lança — devolve `null` em erro de rede/servidor. Isso é
// DIFERENTE de uma carteira sem clientes de verdade (`geral.total === 0`), e
// RelatoriosDashboard distingue os dois casos.
export default async function RelatorioPage() {
  const resposta = await apiGet("/report/relatorio/dados");
  // A rota devolve a análise embrulhada em `{ "data": { ... } }` — ler
  // `resposta.geral` direto dava sempre `undefined`, e a tela caía no estado
  // "nenhum cliente cadastrado" mesmo com a carteira cheia.
  const dados = resposta?.data ?? resposta;
  return <RelatoriosDashboard dados={dados} loadError={resposta === null} />;
}
