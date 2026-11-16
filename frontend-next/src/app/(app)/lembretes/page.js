import { apiGet } from "@/lib/api-server";
import { LembretesManager } from "@/components/LembretesManager";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Tarefas" };

// Server Component: busca a lista inicial no servidor (SSR). CRUD depois é
// feito pelo Client Component via proxy `/api/backend/lembretes`.
// O menu chama a tela de "Tarefas" — o título acompanha (Jakob: o nome que a
// pessoa clicou é o nome que ela encontra).
export default async function LembretesPage() {
  const data = await apiGet("/lembretes");
  const initialLembretes = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4 p-6">
      <PageHeader title="Tarefas" subtitle="O que você precisa fazer. Toque no círculo quando terminar." />
      <LembretesManager initialLembretes={initialLembretes} />
    </div>
  );
}
