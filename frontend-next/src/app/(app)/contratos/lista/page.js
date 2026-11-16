import Link from "next/link";
import { apiGet } from "@/lib/api-server";
import { ContratoRowActions } from "@/components/aluguel/ContratoRowActions";
import { PageHeader, Card, EmptyState, Table, Thead, Th, Row, Td } from "@/components/ui/page";
import { FileSignature, FileText } from "@/components/icons";
import { NovoContrato } from "./NovoContrato";

export const metadata = { title: "Contratos" };

// Um contrato de aluguel liga três cadastros. Enquanto faltar algum, a tela
// mostra o que falta (com o atalho para cadastrar) em vez de um formulário
// com listas vazias.
const PRE_REQUISITOS = [
  { chave: "proprietarios", titulo: "Cadastre o proprietário", texto: "Quem é o dono do imóvel.", href: "/proprietarios/lista", acao: "Cadastrar proprietário" },
  { chave: "imoveis", titulo: "Cadastre o imóvel para alugar", texto: "Endereço, valor do aluguel e dia de vencimento.", href: "/alugueis/adicionar", acao: "Cadastrar imóvel" },
  { chave: "inquilinos", titulo: "Cadastre o inquilino", texto: "Quem vai morar ou usar o imóvel.", href: "/clientes-aluguel/adicionar", acao: "Cadastrar inquilino" },
];

export default async function ContratosListPage() {
  const [contratos, opcoesApi] = await Promise.all([apiGet("/contratos"), apiGet("/contratos/opcoes")]);
  const lista = Array.isArray(contratos) ? contratos : [];
  const opcoes = opcoesApi || { imoveis: [], proprietarios: [], inquilinos: [] };
  const passos = PRE_REQUISITOS.map((p) => ({ ...p, feito: (opcoes[p.chave] || []).length > 0 }));
  const prontoParaContrato = passos.every((p) => p.feito);

  return (
    <div className="space-y-6 p-6">
      <div className="crm-page-header">
        <div>
          <h1>Contratos</h1>
          <p>Contratos de aluguel: quem aluga, qual imóvel e quem é o dono.</p>
        </div>
        {prontoParaContrato && <NovoContrato opcoes={opcoes} />}
      </div>

      {!prontoParaContrato && (
        <Card>
          <h2 className="text-base font-semibold text-cx-text">Antes do primeiro contrato</h2>
          <p className="mt-1 mb-4 text-sm text-cx-muted">
            O contrato junta três cadastros. Faça os que faltam e o botão <strong>Novo contrato</strong> aparece aqui.
          </p>
          <ol className="passos">
            {passos.map((p) => (
              <li key={p.chave} data-feito={p.feito}>
                <span className="flex flex-1 flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>{p.titulo}</strong>
                    <span className="block text-cx-muted">{p.feito ? "Feito." : p.texto}</span>
                  </span>
                  {!p.feito && <Link href={p.href} className="cx-btn cx-btn-outline">{p.acao}</Link>}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {lista.length === 0 ? (
        prontoParaContrato && (
          <EmptyState
            icon={FileSignature}
            title="Nenhum contrato ainda"
            hint="Clique em Novo contrato para ligar um inquilino a um imóvel."
          />
        )
      ) : (
        <Table title="Contratos cadastrados" className="min-w-[680px]">
          <Thead>
            <Th>Inquilino</Th>
            <Th>Imóvel</Th>
            <Th>Proprietário</Th>
            <Th>Documentos</Th>
            <Th right>Ações</Th>
          </Thead>
          <tbody>
            {lista.map((c) => (
              <Row key={c.id}>
                <Td className="font-medium text-cx-text">{c.nome || c.inquilino_nome || "—"}</Td>
                {/* O backend não manda o imóvel junto: busca pelo aluguel_id nas opções. */}
                <Td muted>{c.imovel?.nome_imovel || (opcoes.imoveis || []).find((i) => i.id === c.aluguel_id)?.nome_imovel || "Não vinculado"}</Td>
                <Td muted>{c.proprietario?.name || c.proprietario_nome || "—"}</Td>
                <Td muted>
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-cx-muted" aria-hidden="true" />
                    {Array.isArray(c.contrato_documentos) ? c.contrato_documentos.length : 0}
                  </span>
                </Td>
                <Td right><ContratoRowActions contrato={c} /></Td>
              </Row>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
