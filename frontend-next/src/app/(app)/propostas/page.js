import { apiGet } from "@/lib/api-server";
import { PropostasManager } from "@/components/PropostasManager";

export const metadata = { title: "Propostas" };

// Server Component: busca propostas, clientes e imóveis no servidor (SSR).
export default async function PropostasPage() {
  const [propostasRes, clientesRes, imoveisRes] = await Promise.all([
    apiGet("/propostas"),
    apiGet("/clientes?limit=500"),
    apiGet("/imoveis"),
  ]);

  const initialPropostas = propostasRes?.data || (Array.isArray(propostasRes) ? propostasRes : []);
  const clientes = clientesRes?.clientes || clientesRes?.data || (Array.isArray(clientesRes) ? clientesRes : []);
  const imoveis = imoveisRes?.imoveis || imoveisRes?.data || (Array.isArray(imoveisRes) ? imoveisRes : []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Propostas</h1>
        <p className="text-sm text-white/50 mt-1">Pipeline de ofertas de compra.</p>
      </div>
      <PropostasManager initialPropostas={initialPropostas} clientes={clientes} imoveis={imoveis} />
    </div>
  );
}
