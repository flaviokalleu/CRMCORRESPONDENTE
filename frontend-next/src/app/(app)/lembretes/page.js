import { apiGet } from "@/lib/api-server";
import { LembretesManager } from "@/components/LembretesManager";

export const metadata = { title: "Lembretes" };

// Server Component: busca a lista inicial no servidor (SSR). CRUD depois é
// feito pelo Client Component via proxy `/api/backend/lembretes`.
export default async function LembretesPage() {
  const data = await apiGet("/lembretes");
  const initialLembretes = Array.isArray(data) ? data : [];

  return (
    <LembretesManager initialLembretes={initialLembretes} initialNow={new Date().toISOString()} loadError={data === null} />
  );
}
