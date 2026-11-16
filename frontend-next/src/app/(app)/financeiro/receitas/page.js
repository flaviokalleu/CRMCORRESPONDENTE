import { apiGet } from "@/lib/api-server";
import { LancamentosPagina } from "@/components/financeiro/LancamentosPagina";

export const metadata = { title: "Receitas" };

export default async function ReceitasPage({ searchParams }) {
  const [resposta, sp] = await Promise.all([apiGet("/receitas"), searchParams]);
  return <LancamentosPagina tipo="receita" itens={resposta ?? []} carregou={resposta !== null} sp={sp} />;
}
