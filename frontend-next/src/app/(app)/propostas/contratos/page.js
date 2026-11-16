import Link from "next/link";
import { ArrowLeft, ArrowRight, Scale, Star } from "@/components/icons";
import { apiGet } from "@/lib/api-server";
import { PageHeader } from "@/components/ui/page";
import { CONTRACT_GROUPS, CONTRACT_TYPES, CONTRACT_ICONS } from "@/lib/contract-templates";
import { ICONS } from "@/lib/contract-icons";

export const metadata = { title: "Modelos de contrato" };

// Os dois modelos que a maioria das imobiliárias abre primeiro: aparecem
// num bloco próprio no topo (menos escolha antes da primeira ação) e de
// novo dentro do seu grupo, para quem procura pela categoria.
const MAIS_USADOS = ["locacao_residencial", "compra_venda"];

function CartaoModelo({ tipo, qs, destaque = false }) {
  const type = CONTRACT_TYPES[tipo];
  const Icon = ICONS[CONTRACT_ICONS[tipo]];
  if (!type) return null;
  return (
    <Link
      href={`/propostas/contratos/${tipo}${qs}`}
      data-destaque={destaque}
      className="modelo-card crm-card flex flex-col gap-3 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="modelo-icone">{Icon && <Icon className="h-5 w-5" aria-hidden="true" />}</span>
        {destaque && <span className="modelo-selo"><Star className="h-3 w-3" aria-hidden="true" /> Mais usado</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-cx-text">{type.label}</p>
        <p className="mt-1 text-sm leading-relaxed text-cx-muted">{type.description}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-cx-blue">
        Usar este modelo <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

// Galeria de modelos: escolher um abre o editor com o texto já preenchido.
export default async function ContratosGaleria({ searchParams }) {
  const params = await searchParams;
  const propostaId = params?.proposta;
  let p = null;
  if (propostaId) {
    const list = await apiGet("/propostas");
    const propostas = list?.data || (Array.isArray(list) ? list : []);
    p = propostas.find((item) => String(item.id) === String(propostaId)) || null;
  }

  const qs = propostaId ? `?proposta=${propostaId}` : "";
  const totalModelos = CONTRACT_GROUPS.reduce((sum, g) => sum + g.types.length, 0);

  return (
    <div className="space-y-8 p-6">
      <div>
        <Link href="/propostas" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-cx-muted hover:text-cx-text">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Voltar para propostas
        </Link>
        <PageHeader
          title="Modelos de contrato"
          subtitle={`${totalModelos} modelos prontos. Escolha um: o texto já vem com os dados da proposta e você pode mudar o que quiser antes de imprimir.`}
        />
      </div>

      {p && (
        <div className="crm-card flex items-center gap-3 px-5 py-4">
          <span className="modelo-icone"><Scale className="h-4 w-4" aria-hidden="true" /></span>
          <div>
            <p className="text-sm text-cx-muted">Contrato para</p>
            <p className="text-base font-semibold text-cx-text">
              {p.cliente?.nome || "Cliente"} <span className="mx-1 text-cx-muted">·</span> {p.imovel?.nome_imovel || "Imóvel"}
            </p>
          </div>
        </div>
      )}

      <section aria-labelledby="mais-usados">
        <h2 id="mais-usados" className="mb-3 text-lg font-semibold text-cx-text">Mais usados</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MAIS_USADOS.map((tipo) => <CartaoModelo key={tipo} tipo={tipo} qs={qs} destaque />)}
        </div>
      </section>

      {CONTRACT_GROUPS.map((group) => {
        const GroupIcon = ICONS[group.icon];
        return (
          <section key={group.label} aria-label={group.label}>
            <div className="mb-3 flex items-center gap-3">
              {GroupIcon && <GroupIcon className="h-5 w-5 text-cx-muted" aria-hidden="true" />}
              <div>
                <h2 className="text-lg font-semibold text-cx-text">{group.label}</h2>
                <p className="text-sm text-cx-muted">{group.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.types.map((tipo) => <CartaoModelo key={tipo} tipo={tipo} qs={qs} destaque={MAIS_USADOS.includes(tipo)} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
