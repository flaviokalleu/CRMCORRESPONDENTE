import Link from "next/link";
import { AuthSplit } from "@/components/AuthSplit";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata = { title: "Criar nova senha", description: "Defina uma nova senha para sua conta." };

export default async function RedefinirSenhaPage({ searchParams }) {
  const { token } = await searchParams;
  const valido = typeof token === "string" && token.length > 0;
  return (
    <AuthSplit
      title="Criar nova senha"
      description={valido ? "Escolha uma senha com pelo menos 8 caracteres." : "Este link está incompleto. Peça um novo em \"Esqueci a senha\"."}
      footer={<>Lembrou a senha? <Link href="/login">Voltar para o login</Link></>}
    >
      {valido
        ? <ResetPasswordForm token={token} />
        : <Link href="/esqueci-senha" className="lg-link-btn">Pedir um novo link</Link>}
    </AuthSplit>
  );
}
