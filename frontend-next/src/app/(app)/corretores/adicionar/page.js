import { AddCorretorForm } from "@/components/AddCorretorForm";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Cadastrar corretor" };

export default function AdicionarCorretorPage() {
  return (
    <div>
      <PageHeader title="Cadastrar corretor" subtitle="Preencha os dados e crie o acesso. Ele já pode entrar no sistema depois de salvar." />
      <AddCorretorForm />
    </div>
  );
}
