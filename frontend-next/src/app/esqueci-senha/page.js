import Link from "next/link";
import { AuthSplit } from "@/components/AuthSplit";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata = { title: "Esqueci a senha", description: "Receba um link para criar uma nova senha." };

export default function EsqueciSenhaPage() {
  return (
    <AuthSplit
      title="Esqueci a senha"
      description="Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha."
      footer={<>Lembrou a senha? <Link href="/login">Voltar para o login</Link></>}
    >
      <ForgotPasswordForm />
    </AuthSplit>
  );
}
