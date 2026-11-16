import { redirect } from "next/navigation";
import Link from "next/link";
import { hasSession } from "@/lib/session";
import { LoginForm } from "@/components/LoginForm";
import { AuthSplit } from "@/components/AuthSplit";

export const metadata = { title: { absolute: "Entrar | Webba CRM" }, description: "Acesse seu painel Webba CRM." };

export default async function LoginPage() {
  if (await hasSession()) redirect("/dashboard");
  return (
    <AuthSplit
      title="Bem-vindo de volta"
      description="Entre com seu e-mail e senha."
      footer={<>Ainda não tem conta? <Link href="/registro">Teste grátis</Link></>}
    >
      <LoginForm />
    </AuthSplit>
  );
}
