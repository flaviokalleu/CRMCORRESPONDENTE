import { SimuladorForm } from "@/components/SimuladorForm";

export const metadata = { title: "Simulador" };

// Server Component fino que renderiza o Client Component interativo.
export default function SimuladorPage() {
  return <SimuladorForm />;
}
