import { AddImovelForm } from "@/components/AddImovelForm";

export const metadata = { title: "Adicionar Imóvel" };

// Server Component fino que apenas renderiza o form (Client Component) —
// mesmo padrão de src/app/login/page.js + LoginForm.jsx.
export default function AdicionarImovelPage() {
  return <AddImovelForm />;
}
