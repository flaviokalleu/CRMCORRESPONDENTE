import { redirect } from "next/navigation";
import { Building2, ShieldCheck, TrendingUp } from "lucide-react";
import { hasSession } from "@/lib/session";
import { LoginForm } from "@/components/LoginForm";

export const metadata = {
  title: "Entrar",
};

// Server Component: checagem de sessão acontece no servidor, antes de
// qualquer HTML ser enviado — se já está logado, redireciona sem nunca
// renderizar o formulário (mais rápido que checar no cliente).
export default async function LoginPage() {
  if (await hasSession()) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex bg-white">
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between bg-caixa-primary px-12 py-12 text-white">
        <a href="/" className="flex items-center gap-2.5">
          <span className="text-base font-semibold tracking-tight">CRM IMOB</span>
        </a>

        <div className="space-y-8 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Gestão imobiliária completa, em um só lugar.
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Clientes, imóveis, aluguéis e pagamentos organizados com o padrão de
            confiabilidade que sua operação exige.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                <Building2 className="h-4 w-4 text-caixa-orange" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-medium">Cadastro unificado</p>
                <p className="text-xs text-white/50">Clientes, imóveis e aluguéis num só fluxo.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                <TrendingUp className="h-4 w-4 text-caixa-orange" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-medium">Indicadores em tempo real</p>
                <p className="text-xs text-white/50">Acompanhe o funil de vendas e a carteira de locação.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white/10">
                <ShieldCheck className="h-4 w-4 text-caixa-orange" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-sm font-medium">Acesso seguro</p>
                <p className="text-xs text-white/50">Sessão em cookie httpOnly — nunca exposta ao JavaScript.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/30">&copy; {new Date().getFullYear()} CRM IMOB. Todos os direitos reservados.</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="text-base font-semibold tracking-tight text-caixa-primary">CRM IMOB</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-caixa-gray-900">Entrar na conta</h2>
            <p className="mt-1.5 text-sm text-caixa-gray-500">Informe suas credenciais para acessar o painel.</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
