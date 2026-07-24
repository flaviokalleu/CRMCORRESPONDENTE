import { apiGet } from "@/lib/api-server";
import { LembretesManager } from "@/components/LembretesManager";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Lembretes" };

// Server Component: busca a lista inicial no servidor (SSR). CRUD depois é
// feito pelo Client Component via proxy `/api/backend/lembretes`.
export default async function LembretesPage() {
  const data = await apiGet("/lembretes");
  const initialLembretes = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4 p-6">
      <PageHeader title="Lembretes" subtitle="Gerencie lembretes e tarefas do CRM." />
      <LembretesManager initialLembretes={initialLembretes} />
    </div>
  );
}
