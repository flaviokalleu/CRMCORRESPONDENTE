import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-server";

export const metadata = { title: "Detalhe do Imóvel" };

function formatCurrency(value) {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function Field({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-sm text-white">{value ?? "-"}</p>
    </div>
  );
}

// Server Component: versão interna/protegida do detalhe do imóvel (diferente
// da página pública). Busca direto no Go via apiGet.
export default async function ImovelDetalhePage({ params }) {
  const { id } = await params;
  const imovel = await apiGet(`/imoveis/${id}`);

  if (!imovel) {
    notFound();
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/imoveis/lista" className="text-xs text-white/40 hover:text-white/70">
            ← Voltar para lista
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-white">{imovel.nome_imovel}</h1>
        </div>
      </div>

      {imovel.descricao_imovel && (
        <p className="mb-6 max-w-3xl text-sm text-white/60">{imovel.descricao_imovel}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Endereço" value={imovel.endereco} />
        <Field label="Tipo" value={imovel.tipo} />
        <Field label="Situação" value={imovel.situacao_imovel} />
        <Field label="Quartos" value={imovel.quartos} />
        <Field label="Banheiros" value={imovel.banheiro} />
        <Field label="Valor de Venda" value={formatCurrency(imovel.valor_venda)} />
        <Field label="Valor de Avaliação" value={formatCurrency(imovel.valor_avaliacao)} />
        <Field label="Exclusivo" value={imovel.exclusivo} />
        <Field label="Tem Inquilino" value={imovel.tem_inquilino} />
        <Field label="Localização" value={imovel.localizacao} />
        <Field label="Tags" value={imovel.tags} />
      </div>

      {imovel.observacoes && (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs uppercase tracking-wide text-white/40">Observações</p>
          <p className="mt-1 text-sm text-white/80">{imovel.observacoes}</p>
        </div>
      )}
    </div>
  );
}
