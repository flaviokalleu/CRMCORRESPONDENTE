import { apiGet } from "@/lib/api-server";
import { AluguelRowActions } from "@/components/aluguel/AluguelRowActions";
import { PageHeader, EmptyState, Table, Thead, Th, Row, Td, formatBRL } from "@/components/ui/page";
import Link from "next/link";
import { KeyRound, Plus, ImagePlus } from "@/components/icons";
import { imovelImageUrl } from "@/lib/imovel-meta";

// Só caminhos sob imoveis/ são servidos (/api/uploads/imoveis); fotos antigas
// gravadas fora dessa pasta não têm URL pública.
const fotoUrl = (p) => (p && String(p).startsWith("imoveis/") ? imovelImageUrl(p) : null);
const contarFotos = (a) => (a.foto_capa ? 1 : 0) + (Array.isArray(a.foto_adicional) ? a.foto_adicional.length : 0);

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
                  <div className="flex items-center gap-3">
                    {fotoUrl(a.foto_capa) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoUrl(a.foto_capa)} alt="" className="lst-miniatura" loading="lazy" />
                    ) : (
                      <span className="lst-miniatura lst-foto-vazia" aria-hidden="true"><ImagePlus /></span>
                    )}
                    <div className="min-w-0">
                      <p className="line-clamp-2 break-words font-medium text-cx-text">{a.nome_imovel || "—"}</p>
                      {/* line-clamp em vez de truncate: no celular a tabela vira cartão e o
                          truncate não segurava descrições longas (o cartão esticava). */}
                      <p className="line-clamp-2 max-w-xs break-words text-xs text-cx-muted" title={a.descricao}>
                        {a.quartos ?? 0} quarto{a.quartos === 1 ? "" : "s"} · {a.banheiro ?? 0} banheiro{a.banheiro === 1 ? "" : "s"}
                        {contarFotos(a) ? ` · ${contarFotos(a)} foto${contarFotos(a) === 1 ? "" : "s"}` : ""}
                        {a.descricao ? ` · ${a.descricao}` : ""}
                      </p>
                    </div>
                  </div>
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
