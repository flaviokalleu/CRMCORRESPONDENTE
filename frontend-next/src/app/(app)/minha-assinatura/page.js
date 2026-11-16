import { apiGet } from "@/lib/api-server";
import { MinhaAssinatura } from "@/components/assinatura/MinhaAssinatura";

export const metadata = { title: "Minha assinatura" };

// Server Component: busca a situação, as faturas e os planos; as ações
// (pagar, mudar de plano) ficam no Client Component.
export default async function MinhaAssinaturaPage() {
  const [resumo, faturas, planos] = await Promise.all([
    apiGet("/assinatura"),
    apiGet("/assinatura/faturas"),
    apiGet("/assinatura/planos"),
  ]);

  if (!resumo) {
    return (
      <div>
        <h1>Minha assinatura</h1>
        <p>Não foi possível carregar a assinatura agora. Recarregue a página em instantes.</p>
      </div>
    );
  }

  return <MinhaAssinatura resumo={resumo} faturas={faturas?.faturas || []} planos={planos?.planos || []} />;
}
