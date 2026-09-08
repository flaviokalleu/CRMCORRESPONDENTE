import { apiGet } from "@/lib/api-server";
import { PropostasManager } from "@/components/PropostasManager";

export const metadata = { title: "Propostas" };

// Server Component: busca propostas, clientes e imóveis no servidor (SSR).
export default async function PropostasPage() {
  const [propostasRes, clientesRes, imoveisRes] = await Promise.all([
    // limit alto (como em /clientes?limit=500): a busca e a paginação da tela
    // são client-side, porque o endpoint Go não tem filtro de texto — sem
    // isso, só as 20 propostas mais recentes (default do backend) apareceriam.
    apiGet("/propostas?limit=500"),
    apiGet("/clientes?limit=500"),
    apiGet("/imoveis"),
  ]);

  // apiGet nunca lança — devolve `null` em erro de rede/servidor. Isso é
  // DIFERENTE de uma lista vazia de verdade (`{data: []}`), e a tela precisa
  // distinguir os dois casos em vez de mostrar "nenhuma proposta encontrada"
  // para uma falha de carregamento.
  const loadError = propostasRes === null;
  const initialPropostas = propostasRes?.data || (Array.isArray(propostasRes) ? propostasRes : []);
  const clientes = clientesRes?.clientes || clientesRes?.data || (Array.isArray(clientesRes) ? clientesRes : []);
  const imoveis = imoveisRes?.imoveis || imoveisRes?.data || (Array.isArray(imoveisRes) ? imoveisRes : []);

  return (
    <div>
      <PropostasManager
        initialPropostas={initialPropostas}
        clientes={clientes}
        imoveis={imoveis}
        loadError={loadError}
      />
    </div>
  );
}
