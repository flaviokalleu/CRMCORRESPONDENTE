import Link from "next/link";
import { apiGet } from "@/lib/api-server";
import { PageHeader, Avatar, EmptyState, Table, Thead, Th, Row, Td, formatBRL } from "@/components/ui/page";
import { ContatoRapido } from "@/components/ui/contato-rapido";
import { KeyRound } from "@/components/icons";

export const metadata = { title: "Inquilinos" };

// Inquilinos. O que importa no dia a dia é "quem está devendo?" — por isso o
// filtro rápido com contador no topo e a cobrança pelo WhatsApp com a
// mensagem já escrita.
//
// Antes a situação era só "dia de hoje > dia do vencimento", o que marcava
// como "Em atraso" até quem já tinha pago. Agora considera o campo `pago`.

function situacaoDe(c, hoje) {
  const dia = parseInt(c.dia_vencimento, 10);
  if (c.pago) return { chave: "pago", rotulo: "Pago", tom: "ass-tom-ok" };
  if (Number.isNaN(dia)) return { chave: "em-dia", rotulo: "Sem vencimento", tom: "ass-tom-neutro" };
  const atraso = hoje.getDate() - dia;
  if (atraso > 0)
    return {
      chave: "atraso",
      rotulo: atraso === 1 ? "1 dia de atraso" : `${atraso} dias de atraso`,
      tom: "ass-tom-perigo",
    };
  if (atraso >= -5)
    return { chave: "vence", rotulo: atraso === 0 ? "Vence hoje" : `Vence dia ${dia}`, tom: "ass-tom-alerta" };
  return { chave: "em-dia", rotulo: "Em dia", tom: "ass-tom-neutro" };
}

const cpfFormatado = (cpf) => {
  const d = String(cpf || "").replace(/\D/g, "");
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : cpf || "—";
};

const primeiroNome = (nome) => {
  const p = String(nome || "").trim().split(/\s+/)[0] || "";
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
};

export default async function ClientesAluguelPage({ searchParams }) {
  const sp = await searchParams;
  const filtro = ["atraso", "vence", "pago"].includes(sp?.filtro) ? sp.filtro : "todos";

  const data = await apiGet("/clientealuguel");
  const clientes = Array.isArray(data) ? data : [];
  const hoje = new Date();
  const comSituacao = clientes.map((c) => ({ c, s: situacaoDe(c, hoje) }));
  const conta = (k) => comSituacao.filter((x) => x.s.chave === k).length;
  // Quem deve primeiro; depois quem vence logo.
  const ordem = { atraso: 0, vence: 1, "em-dia": 2, pago: 3 };
  const visiveis = comSituacao
    .filter((x) => filtro === "todos" || x.s.chave === filtro)
    .sort((a, b) => ordem[a.s.chave] - ordem[b.s.chave]);

  const FILTROS = [
    { id: "todos", rotulo: "Todos", n: clientes.length },
    { id: "atraso", rotulo: "Em atraso", n: conta("atraso"), tom: conta("atraso") ? "ass-tom-perigo" : "" },
    { id: "vence", rotulo: "Vencem em 5 dias", n: conta("vence"), tom: conta("vence") ? "ass-tom-alerta" : "" },
    { id: "pago", rotulo: "Pagos", n: conta("pago"), tom: "ass-tom-ok" },
  ];

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Inquilinos"
        subtitle={`${clientes.length} inquilino${clientes.length === 1 ? "" : "s"} · quem está em atraso aparece primeiro`}
      />

      {clientes.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Nenhum inquilino cadastrado"
          hint="Quando você fechar uma locação em Aluguéis, o inquilino aparece aqui com o vencimento."
        >
          <Link href="/alugueis" className="lst-botao lst-botao-principal">
            Ir para Aluguéis
          </Link>
        </EmptyState>
      ) : (
        <>
          <nav className="lst-filtros" aria-label="Filtrar inquilinos">
            {FILTROS.map((f) => (
              <Link
                key={f.id}
                href={f.id === "todos" ? "/clientes-aluguel" : `/clientes-aluguel?filtro=${f.id}`}
                className={`lst-filtro ${f.tom || ""}`}
                aria-current={filtro === f.id ? "page" : undefined}
                scroll={false}
              >
                {f.rotulo} <span className="lst-filtro-n">{f.n}</span>
              </Link>
            ))}
          </nav>

          {visiveis.length === 0 ? (
            <EmptyState icon={KeyRound} title="Ninguém nesta situação" hint="Bom sinal! Veja os outros filtros acima." />
          ) : (
            <Table title="Lista de inquilinos" className="min-w-[860px]">
              <Thead>
                <Th>Inquilino</Th>
                <Th>Situação</Th>
                <Th right>Aluguel</Th>
                <Th>Vencimento</Th>
                <Th>Contato</Th>
                <Th>CPF</Th>
              </Thead>
              <tbody>
                {visiveis.map(({ c, s }) => (
                  <Row key={c.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={c.nome} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-cx-text">{c.nome}</p>
                          <p className="truncate text-xs text-cx-muted">{c.email || "sem e-mail"}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className={`ass-selo ${s.tom}`}>{s.rotulo}</span>
                    </Td>
                    <Td right className="tabular-nums">
                      {formatBRL(c.valor_aluguel)}
                    </Td>
                    <Td muted className="tabular-nums">
                      {c.dia_vencimento ? `dia ${c.dia_vencimento}` : "—"}
                    </Td>
                    <Td>
                      <ContatoRapido
                        telefone={c.telefone}
                        nome={c.nome}
                        mensagem={
                          s.chave === "atraso" || s.chave === "vence"
                            ? `Olá, ${primeiroNome(c.nome)}, tudo bem? Passando para lembrar do aluguel de ${formatBRL(
                                c.valor_aluguel
                              )}, com vencimento no dia ${c.dia_vencimento}. Qualquer dúvida, estou à disposição.`
                            : `Olá, ${primeiroNome(c.nome)}, tudo bem?`
                        }
                      />
                    </Td>
                    <Td muted className="tabular-nums">
                      {cpfFormatado(c.cpf)}
                    </Td>
                  </Row>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
