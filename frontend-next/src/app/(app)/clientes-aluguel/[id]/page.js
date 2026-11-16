import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import { Avatar, formatBRL } from "@/components/ui/page";
import { ContatoRapido } from "@/components/ui/contato-rapido";
import { InquilinoAcoes, ExcluirInquilino } from "@/components/aluguel/InquilinoAcoes";
import { ArrowLeft, Pencil } from "@/components/icons";

export const metadata = { title: "Inquilino" };

const dataBR = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—");
const cpfBR = (v) => {
  const d = String(v || "").replace(/\D/g, "");
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : v || "—";
};
const telBR = (v) => {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return v || "—";
};

function Dado({ rotulo, children }) {
  return (
    <div>
      <dt className="text-xs text-cx-muted">{rotulo}</dt>
      <dd className="text-sm font-medium text-cx-text">{children || "—"}</dd>
    </div>
  );
}

// Ficha do inquilino: dados do cadastro e, abaixo, as ações do dia a dia
// (pagamento, cobrança, score, reajuste, contrato).
export default async function InquilinoPage({ params }) {
  const { id } = await params;
  const [c, cobrancas, alugueis] = await Promise.all([
    apiGet(`/clientealuguel/${id}`),
    apiGet(`/clientealuguel/${id}/cobrancas`),
    apiGet("/alugueis"),
  ]);
  if (!c?.id) notFound();
  const imovel = Array.isArray(alugueis) ? alugueis.find((a) => a.id === c.aluguel_id) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <Link href="/clientes-aluguel" className="inline-flex items-center gap-1.5 text-sm font-medium text-cx-muted hover:text-cx-text">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Inquilinos
      </Link>

      <div className="crm-card space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={c.nome} />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-cx-text">{c.nome}</h1>
              <p className="text-sm text-cx-muted">{formatBRL(c.valor_aluguel)} por mês · vence dia {c.dia_vencimento}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ContatoRapido telefone={c.telefone} nome={c.nome} />
            <Link href={`/clientes-aluguel/${c.id}/editar`} className="cx-btn cx-btn-outline">
              <Pencil className="h-4 w-4" aria-hidden="true" /> Editar
            </Link>
            <ExcluirInquilino inquilino={c} />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Dado rotulo="CPF">{cpfBR(c.cpf)}</Dado>
          <Dado rotulo="Telefone">{telBR(c.telefone)}</Dado>
          <Dado rotulo="E-mail">{c.email}</Dado>
          <Dado rotulo="Nascimento">{c.data_nascimento ? dataBR(c.data_nascimento) : null}</Dado>
          <Dado rotulo="Cidade natal">{c.cidade_nascimento}</Dado>
          <Dado rotulo="Imóvel">{imovel?.nome_imovel}</Dado>
          <Dado rotulo="Contrato">{c.data_inicio_contrato ? `${dataBR(c.data_inicio_contrato)} a ${dataBR(c.data_fim_contrato)}` : null}</Dado>
          <Dado rotulo="Reajuste">{c.indice_reajuste === "IGPM" ? "IGP-M" : c.indice_reajuste}</Dado>
          <Dado rotulo="Proprietário">{c.proprietario_nome}</Dado>
          <Dado rotulo="Taxa de administração">{c.taxa_administracao != null ? `${Number(c.taxa_administracao).toLocaleString("pt-BR")}%` : null}</Dado>
          <Dado rotulo="Corretor">{c.corretor_nome ? `${c.corretor_nome}${c.corretor_percentual ? ` (${Number(c.corretor_percentual).toLocaleString("pt-BR")}%)` : ""}` : null}</Dado>
          <Dado rotulo="Fiador">{c.tem_fiador ? `${c.fiador_nome || "Sim"}${c.fiador_cpf ? ` · ${cpfBR(c.fiador_cpf)}` : ""}` : "Sem fiador"}</Dado>
        </dl>
      </div>

      <InquilinoAcoes inquilino={c} cobrancas={Array.isArray(cobrancas) ? cobrancas : []} />
    </div>
  );
}
