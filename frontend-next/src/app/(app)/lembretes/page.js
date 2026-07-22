import { apiGet } from "@/lib/api-server";
import { LembretesManager } from "@/components/LembretesManager";

export const metadata = { title: "Lembretes" };

// Server Component: busca a lista inicial no servidor (SSR). CRUD depois é
// feito pelo Client Component via proxy `/api/backend/lembretes`.
export default async function LembretesPage() {
  const data = await apiGet("/lembretes");
  const initialLembretes = Array.isArray(data) ? data : [];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Lembretes</h1>
        <p className="text-sm text-white/50 mt-1">Gerencie lembretes e tarefas do CRM.</p>
      </div>
      <LembretesManager initialLembretes={initialLembretes} />
    </div>
  );
}
