import { apiGet } from "@/lib/api-server";
import { ClientesLista } from "@/components/ClientesLista";
import { STATUS_LIST } from "@/lib/cliente-status";

export const metadata = { title: "Lista de Clientes" };

// Server Component: busca a primeira página no Go (SSR) e entrega ao Client
// Component, que cuida de busca, filtro por status, paginação e troca de status
// inline via proxy (/api/backend/clientes).
const STATUS_VALIDOS = new Set(STATUS_LIST.map((item) => item.value));

export default async function ListaClientesPage({ searchParams }) {
  const query = await searchParams;
  const statusSolicitado = typeof query?.status === "string" ? query.status : "";
  const initialStatus =
    statusSolicitado === "atencao" || STATUS_VALIDOS.has(statusSolicitado)
      ? statusSolicitado
      : "";
  const initialSearch = typeof query?.search === "string" ? query.search.slice(0, 200) : "";
  const initialView = query?.view === "kanban" ? "kanban" : "lista";
  const initialCorretor = /^\d+$/.test(query?.corretor || "") ? query.corretor : "";
  const initialInicio = /^\d{4}-\d{2}-\d{2}$/.test(query?.inicio || "") ? query.inicio : "";
  const initialFim = /^\d{4}-\d{2}-\d{2}$/.test(query?.fim || "") ? query.fim : "";
  const params = new URLSearchParams({ page: "1", limit: "12" });
  if (initialSearch) params.set("search", initialSearch);
  if (initialStatus) params.set("status", initialStatus);
  if (initialCorretor) params.set("corretor", initialCorretor);
  if (initialInicio) params.set("inicio", initialInicio);
  if (initialFim) params.set("fim", initialFim);

  const [data, corretoresData, correspondentesData] = await Promise.all([
    apiGet(`/clientes?${params.toString()}`),
    apiGet("/corretor?all=true"),
    apiGet("/correspondente/lista"),
  ]);
  const initialData = Array.isArray(data) ? { clientes: data } : data ?? { clientes: [] };
  const asList = (value) => Array.isArray(value) ? value : (value?.data ?? []);
  const map = new Map();
  for (const item of [...asList(corretoresData), ...asList(correspondentesData)]) {
    if (!item?.id) continue;
    map.set(String(item.id), {
      id: String(item.id),
      nome: `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim() || item.username || item.email,
    });
  }
  const responsaveis = Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="p-6">
      <ClientesLista
        key={initialSearch}
        initialSearch={initialSearch}
        initialData={initialData}
        initialStatus={initialStatus}
        initialView={initialView}
        initialCorretor={initialCorretor}
        initialInicio={initialInicio}
        initialFim={initialFim}
        responsaveis={responsaveis}
      />
    </div>
  );
}
