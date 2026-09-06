import { apiGet } from "@/lib/api-server";
import { EmptyState } from "@/components/ui/page";
import { ShieldAlert } from "lucide-react";

// O bloqueio que vale está no backend: middleware.RequireAdministrador() no
// grupo financeiroAuth (router.go), que cobre /receitas, /despesas,
// /fluxocaixa, /comissoes e /repasses. Esta guarda é só para quem chega pela
// URL ver uma resposta clara em vez de uma tela vazia de "não foi possível
// carregar" — o dado já não vem do backend de qualquer forma.
export default async function FinanceiroLayout({ children }) {
  const me = await apiGet("/auth/me");
  const podeVer = !!(me?.user?.is_administrador || me?.user?.is_super_admin);

  if (!podeVer) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ShieldAlert}
          title="Acesso restrito"
          hint="O módulo financeiro está disponível apenas para administradores."
        />
      </div>
    );
  }

  return children;
}
