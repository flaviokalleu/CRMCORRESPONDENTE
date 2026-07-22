import { AddCorretorForm } from "@/components/AddCorretorForm";

export const metadata = { title: "Adicionar Corretor" };

// Server Component (cabeçalho) + Client Component (formulário, POST via proxy).
// Ver frontend/src/components/AddCorretor.jsx para a versão completa com
// upload de foto (não portado aqui, ver docs-wiring-clientes.md).
export default function AdicionarCorretorPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-1">Adicionar Corretor</h1>
      <p className="text-sm text-white/50 mb-6">Cadastro de um novo corretor.</p>
      <AddCorretorForm />
    </div>
  );
}
