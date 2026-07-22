import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import { EditarClienteForm } from "@/components/EditarClienteForm";

export const metadata = { title: "Editar Cliente" };

// Server Component: busca o cliente direto no Go e passa os dados iniciais
// para o Client Component que faz o PUT via proxy (/api/backend/clientes/:id).
export default async function EditarClientePage({ params }) {
  const { id } = await params;
  const cliente = await apiGet(`/clientes/${id}`);

  if (!cliente) {
    notFound();
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-6">Editar Cliente</h1>
      <EditarClienteForm clienteId={id} cliente={cliente} />
    </div>
  );
}
