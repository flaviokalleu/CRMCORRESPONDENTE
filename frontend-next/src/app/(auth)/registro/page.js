import { redirect } from "next/navigation";
import Link from "next/link";
import { hasSession } from "@/lib/session";
import { AuthSplit } from "@/components/AuthSplit";
import { CadastroForm } from "@/components/CadastroForm";
import { planosPublicos, diasDeTeste } from "@/lib/planos-publicos";

export const metadata = { title: { absolute: "Teste grátis | Webba CRM" }, description: "Teste o Webba CRM grátis, sem cartão." };

// Cadastro SaaS: mesma moldura do login (lei de Jakob). Os planos vêm do
// banco no servidor; ?plano=<slug> (vindo de /precos) já chega marcado.
export default async function RegistroPage({ searchParams }) {
  if (await hasSession()) redirect("/dashboard");
  const [planos, params] = await Promise.all([planosPublicos(), searchParams]);
  const dias = diasDeTeste(planos);
  const escolhido = planos.find((p) => p.slug === params?.plano) || planos[0] || null;

  return (
    <AuthSplit
      title={`Teste grátis por ${dias} dias`}
      description="Sem cartão de crédito. Você só paga se decidir continuar."
      footer={<>Já tem conta? <Link href="/login">Entrar</Link></>}
    >
      <CadastroForm planos={planos} planoInicial={escolhido?.id ?? null} />
    </AuthSplit>
  );
}
