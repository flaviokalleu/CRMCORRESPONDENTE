import { AddCorrespondenteForm } from "@/components/AddCorrespondenteForm";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Cadastrar correspondente" };

export default function AdicionarCorrespondentePage() {
  return (
    <div>
      <PageHeader title="Cadastrar correspondente" subtitle="Preencha os dados e crie o acesso. Ele já pode entrar no sistema depois de salvar." />
      <AddCorrespondenteForm />
    </div>
  );
}
