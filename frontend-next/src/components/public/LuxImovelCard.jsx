import Link from "next/link";
import { ArrowUpRight, BedDouble, Bath, Car, Maximize } from "lucide-react";
import { formatMoeda, imovelImagemUrl } from "@/components/public/ImovelCard";

// Card de imóvel premium para a landing (fundo escuro, moldura dourada,
// preço em ouro). Server Component — só recebe dados já buscados pela página.
// Variante visual separada do ImovelCard padrão para não afetar as outras
// páginas públicas que ainda usam o card claro.
export function LuxImovelCard({ imovel }) {
  const {
    id,
    nome_imovel: nome,
    tipo,
    localizacao,
    valor_venda: valor,
    quartos,
    banheiro,
    vagas,
    garagem,
    area,
    imagem_capa: imagemCapa,
  } = imovel || {};

  const vagasFinal = vagas ?? garagem;
  const imagemUrl = imovelImagemUrl(imagemCapa);

  return (
    <Link
      href={`/imoveis/${id}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-cx-bg ring-gold transition-all duration-500 hover:-translate-y-1.5 hover:bg-cx-surface"
    >
      <div className="relative h-56 w-full overflow-hidden">
        {imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagemUrl}
            alt={nome || "Imóvel"}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-caixa-secondary/40 text-sm text-white/30">
            Sem imagem
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060A14] via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-caixa-orange-light backdrop-blur-sm">
          {tipo || "Imóvel"}
        </span>
        <span className="absolute bottom-4 left-4 font-display text-2xl font-semibold text-gold-shimmer">
          {formatMoeda(valor)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-medium text-cx-text">
              {nome || "Nome não disponível"}
            </h3>
            <p className="truncate text-sm text-[#9aa6b4]">{localizacao || "Localização não informada"}</p>
          </div>
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-caixa-orange/10 text-caixa-orange transition-colors group-hover:bg-caixa-orange group-hover:text-white">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-cx-border pt-4 text-xs text-[#9aa6b4]">
          {!!quartos && (
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5 text-cx-orange-text" />
              {quartos}
            </span>
          )}
          {!!banheiro && (
            <span className="inline-flex items-center gap-1.5">
              <Bath className="h-3.5 w-3.5 text-cx-orange-text" />
              {banheiro}
            </span>
          )}
          {!!vagasFinal && (
            <span className="inline-flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5 text-cx-orange-text" />
              {vagasFinal}
            </span>
          )}
          {!!area && (
            <span className="inline-flex items-center gap-1.5">
              <Maximize className="h-3.5 w-3.5 text-cx-orange-text" />
              {area}m²
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
