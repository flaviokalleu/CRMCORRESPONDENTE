import { AddCorretorForm } from "@/components/AddCorretorForm";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Adicionar Corretor" };

export default function AdicionarCorretorPage() {
  return (
    <div className="p-6">
      <PageHeader title="Adicionar Corretor" subtitle="Cadastro de um novo corretor." />
      <AddCorretorForm />
    </div>
  );
}
