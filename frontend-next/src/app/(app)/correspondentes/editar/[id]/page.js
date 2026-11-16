import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import { PageHeader } from "@/components/ui/page";
import { UsuarioForm } from "@/components/UsuarioForm";

export const metadata = { title: "Editar correspondente" };

// Server Component: busca o correspondente no Go e entrega ao formulário em modo edição.
export default async function EditarCorrespondentePage({ params }) {
  const { id } = await params;
  const data = await apiGet(`/correspondente/${id}`);
  const pessoa = data?.data ?? null;
  if (!pessoa?.id) notFound();

  return (
    <div>
      <PageHeader title="Editar correspondente" subtitle="Mude os dados e salve. Deixe a senha em branco para manter a atual." />
      <UsuarioForm tipo="correspondente" inicial={pessoa} />
    </div>
  );
}
