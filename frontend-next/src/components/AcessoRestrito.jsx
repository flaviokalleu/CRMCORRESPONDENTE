import { apiGet } from "@/lib/api-server";
import { EmptyState } from "@/components/ui/page";
import { ShieldAlert } from "@/components/icons";

// Guarda de papel para layouts de rota (Server Component). O bloqueio que
// vale é o do backend; isto só evita que quem chega pela URL veja uma tela
// de administrador (com botões que falham) em vez de uma resposta clara.
// papel: "admin" = administrador; "equipe" = administrador ou correspondente.
export async function GuardaPapel({ papel, children }) {
  const me = await apiGet("/auth/me");
  const u = me?.user;
  const admin = !!(u?.is_administrador || u?.is_super_admin);
  const pode = papel === "admin" ? admin : admin || !!u?.is_correspondente;
  if (pode) return children;
  return (
    <div className="p-6">
      <EmptyState
        icon={ShieldAlert}
        title="Acesso restrito"
        hint={papel === "admin"
          ? "Esta tela é só para o administrador da imobiliária."
          : "Esta tela é só para o administrador e os correspondentes."}
      />
    </div>
  );
}
