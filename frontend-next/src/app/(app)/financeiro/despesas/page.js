import { apiGet } from "@/lib/api-server";
import { LancamentosPagina } from "@/components/financeiro/LancamentosPagina";

export const metadata = { title: "Despesas" };

export default async function DespesasPage({ searchParams }) {
  const [resposta, sp] = await Promise.all([apiGet("/despesas"), searchParams]);
  return <LancamentosPagina tipo="despesa" itens={resposta ?? []} carregou={resposta !== null} sp={sp} />;
}
