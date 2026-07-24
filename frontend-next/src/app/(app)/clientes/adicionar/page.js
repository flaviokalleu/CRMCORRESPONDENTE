import { AddClienteForm } from "@/components/AddClienteForm";

export const metadata = { title: "Adicionar Cliente" };

// Server Component: só renderiza o cabeçalho e delega o formulário (estado +
// POST via proxy) para o Client Component. Ver frontend/src/components/AddCliente.jsx
// e ClientForm.jsx para a versão completa (com seleção venda/aluguel, cônjuge,
// dependentes e upload de documentos) que ainda não foi portada.
export default function AdicionarClientePage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-1">Adicionar Cliente</h1>
      <p className="text-sm text-white/50 mb-6">Cadastro completo — dados pessoais, renda, cônjuge, fiador e documentos.</p>
      <AddClienteForm />
    </div>
  );
}
