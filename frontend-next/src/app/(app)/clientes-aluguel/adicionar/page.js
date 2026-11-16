import { apiGet } from "@/lib/api-server";
import { PageHeader } from "@/components/ui/page";
import { InquilinoForm } from "@/components/aluguel/InquilinoForm";

export const metadata = { title: "Cadastrar inquilino" };

// Antes não havia tela de cadastro: inquilino só entrava pela API, e sem
// inquilino o "Novo contrato" nunca aparecia.
export default async function AdicionarInquilinoPage() {
  const [imoveis, proprietarios] = await Promise.all([apiGet("/alugueis"), apiGet("/proprietarios")]);
  return (
    <div className="p-6">
      <PageHeader title="Cadastrar inquilino" subtitle="Só nome, valor e dia do vencimento são obrigatórios. O resto pode ficar para depois." />
      <InquilinoForm
        imoveis={Array.isArray(imoveis) ? imoveis : []}
        proprietarios={Array.isArray(proprietarios) ? proprietarios : []}
      />
    </div>
  );
}
