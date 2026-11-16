import { apiGet } from "@/lib/api-server";
import { VisitasManager } from "@/components/VisitasManager";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Visitas" };

// Server Component: busca visitas, clientes e imóveis no servidor (SSR) para
// popular a lista e os selects do formulário de agendamento.
export default async function VisitasPage() {
  const [visitasRes, clientesRes, imoveisRes] = await Promise.all([
    apiGet("/visitas?limit=500"), // o padrão do Go é 20: a 21ª visita sumia da tela
    apiGet("/clientes?limit=500"),
    apiGet("/imoveis"),
  ]);

  const initialVisitas = visitasRes?.data || (Array.isArray(visitasRes) ? visitasRes : []);
  const clientes = clientesRes?.clientes || clientesRes?.data || (Array.isArray(clientesRes) ? clientesRes : []);
  const imoveis = imoveisRes?.imoveis || imoveisRes?.data || (Array.isArray(imoveisRes) ? imoveisRes : []);

  return (
    <div className="space-y-4 p-6">
      <PageHeader title="Visitas" subtitle="Confirme com o cliente pelo WhatsApp e, depois, marque como foi." />
      <VisitasManager initialVisitas={initialVisitas} clientes={clientes} imoveis={imoveis} />
    </div>
  );
}
