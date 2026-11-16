import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import { PageHeader } from "@/components/ui/page";
import { UsuarioForm } from "@/components/UsuarioForm";

export const metadata = { title: "Editar corretor" };

// Server Component: busca o corretor no Go e entrega ao formulário em modo edição.
export default async function EditarCorretorPage({ params }) {
  const { id } = await params;
  const data = await apiGet(`/corretor/${id}`);
  const pessoa = data?.data ?? null;
  if (!pessoa?.id) notFound();

  return (
    <div>
      <PageHeader title="Editar corretor" subtitle="Mude os dados e salve. Deixe a senha em branco para manter a atual." />
      <UsuarioForm tipo="corretor" inicial={pessoa} />
    </div>
  );
}
