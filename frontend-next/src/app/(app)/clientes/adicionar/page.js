import { AddClienteForm } from "@/components/AddClienteForm";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Cadastrar cliente" };

// Server Component: só renderiza o cabeçalho e delega o formulário (estado +
// POST multipart via proxy) para o Client Component ClienteForm.
export default function AdicionarClientePage() {
  return (
    <div>
      <PageHeader title="Cadastrar cliente" subtitle="Só nome, e-mail, telefone e CPF são obrigatórios. O resto pode ficar para depois." />
      <AddClienteForm />
    </div>
  );
}
