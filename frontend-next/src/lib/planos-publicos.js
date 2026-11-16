import "server-only";
import { apiGet } from "./api-server";

// Fonte ÚNICA dos planos mostrados ao público (home, /precos, cadastro):
// os planos ativos do banco, via rota pública /tenant/plans. Antes cada página
// tinha a sua tabela fixa no código, com preços e prazos de teste diferentes.
export async function planosPublicos() {
  const d = await apiGet("/tenant/plans", { next: { revalidate: 300 } });
  const lista = Array.isArray(d) ? d : d?.plans || [];
  return lista.filter((p) => p.ativo !== false).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.preco_mensal - b.preco_mensal);
}

// Maior prazo de teste entre os planos (para textos como "7 dias grátis").
export function diasDeTeste(planos) {
  return Math.max(0, ...planos.map((p) => p.trial_dias || 0)) || 7;
}
