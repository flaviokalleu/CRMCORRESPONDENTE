import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import { PainelMaster } from "@/components/assinatura/PainelMaster";

export const metadata = { title: "Painel da plataforma" };

// Server Component: busca empresas (com situação calculada no backend) e
// planos; as ações ficam no PainelMaster (Client Component). O X-Tenant-Id
// vazio garante a visão global mesmo durante um "Entrar como".
export default async function SuperAdminPage() {
  const global = { headers: { "X-Tenant-Id": "" } };
  const [painel, planos] = await Promise.all([
    apiGet("/super-admin/assinaturas", global),
    apiGet("/super-admin/plans", global),
  ]);

  if (!painel) redirect("/dashboard"); // não é superadmin

  const lista = Array.isArray(planos) ? planos : planos?.plans || planos?.data || [];
  return <PainelMaster painel={painel} planos={lista} />;
}
