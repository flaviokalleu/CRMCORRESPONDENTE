import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import { EditarClienteForm } from "@/components/EditarClienteForm";
import { ClienteNotas } from "@/components/ClienteNotas";

export const metadata = { title: "Editar Cliente" };

// Server Component: busca o cliente direto no Go e passa os dados iniciais
// para o Client Component que faz o PUT via proxy (/api/backend/clientes/:id).
export default async function EditarClientePage({ params }) {
  const { id } = await params;
  // GET /clientes/:id responde { success, cliente } — desembrulha aqui.
  const data = await apiGet(`/clientes/${id}`);
  const cliente = data?.cliente ?? data;

  if (!cliente || !cliente.id) {
    notFound();
  }

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-semibold text-white">Editar Cliente</h1>
      <p className="mb-6 text-sm text-white/50">Atualize os dados do cliente e anexe novos documentos se necessário.</p>
      <ClienteNotas clienteId={id} />
      <EditarClienteForm clienteId={id} cliente={cliente} />
    </div>
  );
}
