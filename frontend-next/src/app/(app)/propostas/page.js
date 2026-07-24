import { apiGet } from "@/lib/api-server";
import { PropostasManager } from "@/components/PropostasManager";
import { PageHeader } from "@/components/ui/page";

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
    <div className="space-y-4 p-6">
      <PageHeader title="Propostas" subtitle="Pipeline de ofertas de compra." />
      <PropostasManager initialPropostas={initialPropostas} clientes={clientes} imoveis={imoveis} />
    </div>
  );
}
