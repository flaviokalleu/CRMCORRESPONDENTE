import { apiGet } from "@/lib/api-server";
import { ContratoVincularForm } from "@/components/aluguel/ContratoVincularForm";
import { ContratoRowActions } from "@/components/aluguel/ContratoRowActions";
import { PageHeader, Card, EmptyState, Table, Thead, Th, Row, Td } from "@/components/ui/page";
import { FileSignature, FileText } from "lucide-react";

export const metadata = { title: "Contratos" };

export default async function ContratosListPage() {
  const [contratos, opcoes] = await Promise.all([apiGet("/contratos"), apiGet("/contratos/opcoes")]);
  const lista = contratos || [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Contratos" subtitle="Cadastre e gerencie os contratos de aluguel" />

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-white">Novo contrato</h2>
        <ContratoVincularForm opcoes={opcoes || { imoveis: [], proprietarios: [], inquilinos: [] }} />
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-white/70">Contratos cadastrados</h2>
        {lista.length === 0 ? (
          <EmptyState icon={FileSignature} title="Nenhum contrato cadastrado" hint="Vincule um imóvel a um inquilino acima." />
        ) : (
          <Table className="min-w-[760px]">
            <Thead>
              <Th>#</Th>
              <Th>Inquilino</Th>
              <Th>Imóvel</Th>
              <Th>Proprietário</Th>
              <Th>Documentos</Th>
              <Th right>Ações</Th>
            </Thead>
            <tbody>
              {lista.map((c) => (
                <Row key={c.id}>
                  <Td muted className="tabular-nums">#{c.id}</Td>
                  <Td className="font-medium text-white">{c.nome || c.inquilino_nome || "—"}</Td>
                  <Td muted>{c.imovel?.nome_imovel || "Não vinculado"}</Td>
                  <Td muted>{c.proprietario?.name || c.proprietario_nome || "—"}</Td>
                  <Td muted>
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-white/35" />
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
    </div>
  );
}
