import { apiGet } from "@/lib/api-server";
import { VisitasManager } from "@/components/VisitasManager";

export const metadata = { title: "Visitas" };

// Server Component: busca visitas, clientes e imóveis no servidor (SSR) para
// popular a lista e os selects do formulário de agendamento.
export default async function VisitasPage() {
  const [visitasRes, clientesRes, imoveisRes] = await Promise.all([
    apiGet("/visitas"),
    apiGet("/clientes?limit=500"),
    apiGet("/imoveis"),
  ]);

  const initialVisitas = visitasRes?.data || (Array.isArray(visitasRes) ? visitasRes : []);
  const clientes = clientesRes?.clientes || clientesRes?.data || (Array.isArray(clientesRes) ? clientesRes : []);
  const imoveis = imoveisRes?.imoveis || imoveisRes?.data || (Array.isArray(imoveisRes) ? imoveisRes : []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Agenda de Visitas</h1>
        <p className="text-sm text-white/50 mt-1">Gerencie visitas a imóveis.</p>
      </div>
      <VisitasManager initialVisitas={initialVisitas} clientes={clientes} imoveis={imoveis} />
    </div>
  );
}
