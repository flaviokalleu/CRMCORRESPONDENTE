import { redirect } from "next/navigation";
import Link from "next/link";
import { hasSession } from "@/lib/session";
import { LoginForm } from "@/components/LoginForm";
import { AuthSplit } from "@/components/AuthSplit";

export const metadata = { title: "Entrar no Webba CRM", description: "Acesse seu painel Webba CRM." };

export default async function LoginPage() {
  if (await hasSession()) redirect("/dashboard");
  return (
    <AuthSplit
      title="Bem-vindo de volta"
      description="Entre com suas credenciais para acessar o painel."
      footer={<>Problemas para acessar? <Link href="/registro">Fale com a gente</Link></>}
    >
      <LoginForm />
    </AuthSplit>
  );
}
