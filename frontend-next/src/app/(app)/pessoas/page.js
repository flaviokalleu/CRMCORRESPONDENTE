import { apiGet } from "@/lib/api-server";
import { PessoasLista } from "@/components/PessoasLista";

export const metadata = { title: "Pessoas" };

// Server Component: busca a primeira leva no Go (SSR) e entrega ao Client
// Component, que cuida de busca e filtro por papel via proxy
// (/api/backend/pessoas). GET /pessoas não pagina — devolve o array inteiro
// já filtrado por papel/busca, então não há page/limit aqui.
const PAPEIS_VALIDOS = new Set(["comprador", "inquilino", "proprietario"]);

export default async function PessoasPage({ searchParams }) {
  const query = await searchParams;
  const papelSolicitado = typeof query?.papel === "string" ? query.papel : "";
  const initialPapel = PAPEIS_VALIDOS.has(papelSolicitado) ? papelSolicitado : "";
  const initialBusca = typeof query?.busca === "string" ? query.busca.slice(0, 200) : "";

  const params = new URLSearchParams();
  if (initialPapel) params.set("papel", initialPapel);
  if (initialBusca) params.set("busca", initialBusca);
  const qs = params.toString();

  const data = await apiGet(`/pessoas${qs ? `?${qs}` : ""}`);
  const initialPessoas = Array.isArray(data) ? data : [];

  return (
    <div className="p-6">
      <PessoasLista
        key={`${initialPapel}:${initialBusca}`}
        initialPessoas={initialPessoas}
        initialPapel={initialPapel}
        initialBusca={initialBusca}
      />
    </div>
  );
}
