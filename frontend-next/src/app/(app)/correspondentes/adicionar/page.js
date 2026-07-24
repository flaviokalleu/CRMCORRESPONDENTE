import { AddCorrespondenteForm } from "@/components/AddCorrespondenteForm";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Adicionar Correspondente" };

export default function AdicionarCorrespondentePage() {
  return (
    <div className="p-6">
      <PageHeader title="Adicionar Correspondente" subtitle="Cadastro de um novo correspondente." />
      <AddCorrespondenteForm />
    </div>
  );
}
