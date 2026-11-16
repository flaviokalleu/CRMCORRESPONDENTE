import { apiGet } from "@/lib/api-server";
import { AluguelRowActions } from "@/components/aluguel/AluguelRowActions";
import { PageHeader, EmptyState, Table, Thead, Th, Row, Td, formatBRL } from "@/components/ui/page";
import Link from "next/link";
import { KeyRound, Plus } from "@/components/icons";

export const metadata = { title: "Aluguéis" };

export default async function AlugueisPage() {
  const alugueis = (await apiGet("/alugueis")) || [];
  const disponiveis = alugueis.filter((a) => !a.alugado).length;
  const ocupados = alugueis.filter((a) => a.alugado).length;

  return (
    <div className="p-6">
      <PageHeader
        title="Aluguéis"
        subtitle={`${ocupados} alugado${ocupados === 1 ? "" : "s"} · ${disponiveis} disponíve${disponiveis === 1 ? "l" : "is"} para alugar`}
        actionHref="/alugueis/adicionar"
        actionLabel="Adicionar imóvel"
      />

      {alugueis.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Nenhum imóvel para aluguel"
          hint="Cadastre o primeiro imóvel de locação com valor e dia de vencimento."
        >
          <Link href="/alugueis/adicionar" className="lst-botao lst-botao-principal">
            <Plus aria-hidden="true" /> Adicionar imóvel
          </Link>
        </EmptyState>
      ) : (
        <Table title="Imóveis em locação" className="min-w-[820px]">
          <Thead>
            <Th>Imóvel</Th>
            <Th>Situação</Th>
            <Th right>Aluguel</Th>
            <Th>Vencimento</Th>
            <Th right>Ações</Th>
          </Thead>
          <tbody>
            {alugueis.map((a) => (
              <Row key={a.id}>
                <Td>
                  <p className="font-medium text-cx-text">{a.nome_imovel || "—"}</p>
                  <p className="max-w-xs truncate text-xs text-cx-muted" title={a.descricao}>
                    {a.quartos ?? 0} quarto{a.quartos === 1 ? "" : "s"} · {a.banheiro ?? 0} banheiro{a.banheiro === 1 ? "" : "s"}
                    {a.descricao ? ` · ${a.descricao}` : ""}
                  </p>
                </Td>
                <Td>
                  {/* Disponível = sem renda entrando (atenção); alugado = ok. */}
                  <span className={`ass-selo ${a.alugado ? "ass-tom-ok" : "ass-tom-alerta"}`}>
                    {a.alugado ? "Alugado" : "Disponível"}
                  </span>
                </Td>
                <Td right className="whitespace-nowrap tabular-nums">{formatBRL(a.valor_aluguel)}</Td>
                <Td muted className="whitespace-nowrap tabular-nums">{a.dia_vencimento ? `dia ${a.dia_vencimento}` : "—"}</Td>
                <Td right><AluguelRowActions aluguel={a} /></Td>
              </Row>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
