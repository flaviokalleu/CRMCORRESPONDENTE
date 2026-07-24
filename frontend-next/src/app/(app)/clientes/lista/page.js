import { apiGet } from "@/lib/api-server";
import { ClientesLista } from "@/components/ClientesLista";

export const metadata = { title: "Lista de Clientes" };

// Server Component: busca a primeira página no Go (SSR) e entrega ao Client
// Component, que cuida de busca, filtro por status, paginação e troca de status
// inline via proxy (/api/backend/clientes).
export default async function ListaClientesPage() {
  const data = await apiGet("/clientes?page=1&limit=12");
  const initialData = Array.isArray(data) ? { clientes: data } : data ?? { clientes: [] };

  return (
    <div className="p-6">
      <ClientesLista initialData={initialData} />
    </div>
  );
}
