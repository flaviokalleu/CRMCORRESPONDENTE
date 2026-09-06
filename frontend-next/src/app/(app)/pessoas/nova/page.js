import { PageHeader } from "@/components/ui/page";
import { PessoaWizard } from "@/components/pessoa/PessoaWizard";

export const metadata = { title: "Nova pessoa" };

// Server Component: só o cabeçalho estático. Toda a lógica (escolha de
// papel, busca por CPF, POST) fica no Client Component, que fala com o
// backend Go via proxy (/api/backend/pessoas...) — nunca direto.
export default function NovaPessoaPage() {
  return (
    <div className="p-6">
      <PageHeader
        title="Nova pessoa"
        subtitle="Escolha o papel e confirme a identidade. O resto da ficha é preenchido depois, na tela do papel escolhido."
      />
      <PessoaWizard />
    </div>
  );
}
