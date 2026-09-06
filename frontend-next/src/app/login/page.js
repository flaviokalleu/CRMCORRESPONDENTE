import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3, ShieldCheck, Users } from "lucide-react";
import { hasSession } from "@/lib/session";
import { CaixaBrand } from "@/components/CaixaBrand";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Entrar no CAIXA CRM", description: "Acesse seu painel CAIXA CRM." };

export default async function LoginPage() {
  if (await hasSession()) redirect("/dashboard");
  return <div className="auth-page"><section className="auth-story"><Link href="/" className="auth-story-logo"><CaixaBrand /><span>CRM</span></Link><div className="auth-story-copy"><span className="auth-orange-line" /><p className="auth-eyebrow">MAIS QUE OPORTUNIDADES<br />REALIZAMOS HISTÓRIAS</p><h1>Conectando<br />pessoas a um<br /><span>futuro melhor.</span></h1><p>Organize seus atendimentos, acompanhe suas oportunidades e conquiste mais resultados com o CAIXA CRM.</p><div className="auth-benefits"><div><BarChart3 /><span><strong>Mais produtividade</strong><small>Processos simples e eficientes</small></span></div><div><Users /><span><strong>Mais relacionamento</strong><small>Clientes no centro de tudo</small></span></div><div><ShieldCheck /><span><strong>Mais conquistas</strong><small>Segurança em cada etapa</small></span></div></div></div><blockquote>“O maior valor do nosso trabalho<br />é ver sonhos ganhando endereço.”<br /><b>—</b></blockquote></section><section className="auth-form-panel"><div className="auth-top-link"><span>Não tem uma conta?</span><a href="/registro">Fale com a gente</a></div><div className="auth-form-wrap"><span className="auth-blue-line" /><h2>Bem-vindo de volta!</h2><p>Faça login para acessar o CAIXA CRM.</p><LoginForm /><div className="auth-security"><ShieldCheck /><span><strong>Seus dados estão protegidos</strong><small>Utilizamos criptografia e seguimos os mais altos padrões de segurança.</small></span></div></div></section></div>;
}
