import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import { CONTRACT_TYPES, CONTRACT_ICONS, generateContractText, parseContractDocument } from "@/lib/contract-templates";
import { ContractEditor } from "@/components/contratos/ContractEditor";

export async function generateMetadata({ params }) {
  const { tipo } = await params;
  return { title: CONTRACT_TYPES[tipo]?.label || "Contrato" };
}

// Editor de contrato — Server Component: resolve o tipo, busca a proposta
// (se veio de ?proposta=ID) direto no servidor, gera o HTML inicial do
// documento, e entrega tudo pronto para o editor (Client Component) que
// cuida só da interação (contentEditable, toolbar, exportar).
export default async function ContratoEditorPage({ params, searchParams }) {
  const { tipo } = await params;
  const sp = await searchParams;
  const type = CONTRACT_TYPES[tipo];
  if (!type) notFound();

  let proposta = null;
  if (sp?.proposta) {
    const list = await apiGet("/propostas");
    const propostas = list?.data || (Array.isArray(list) ? list : []);
    proposta = propostas.find((item) => String(item.id) === String(sp.proposta)) || null;
  }

  const ctx = { cliente: proposta?.cliente, imovel: proposta?.imovel, proposta };
  const initialText = generateContractText(tipo, ctx);
  const doc = parseContractDocument(initialText);

  return (
    <ContractEditor
      tipo={tipo}
      label={type.label}
      description={type.description}
      iconName={CONTRACT_ICONS[tipo]}
      doc={doc}
      proposta={proposta}
      backHref={sp?.proposta ? `/propostas/contratos?proposta=${sp.proposta}` : "/propostas/contratos"}
    />
  );
}
