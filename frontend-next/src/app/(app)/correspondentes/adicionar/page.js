import { AddCorrespondenteForm } from "@/components/AddCorrespondenteForm";

export const metadata = { title: "Adicionar Correspondente" };

// Server Component (cabeçalho) + Client Component (formulário, POST via proxy).
// Ver frontend/src/components/AddCorrespondente.jsx para a versão completa com
// upload de foto (não portado aqui, ver docs-wiring-clientes.md).
export default function AdicionarCorrespondentePage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-1">Adicionar Correspondente</h1>
      <p className="text-sm text-white/50 mb-6">Cadastro de um novo correspondente.</p>
      <AddCorrespondenteForm />
    </div>
  );
}
