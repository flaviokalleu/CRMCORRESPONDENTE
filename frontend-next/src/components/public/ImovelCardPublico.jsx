import Link from "next/link";
import { Bath, BedDouble, ImageOff, MapPin } from "lucide-react";
import { imovelImageUrl } from "@/lib/imovel-meta";
import { PREMISSA_CARD, parcelaDoImovel } from "@/lib/mcmv";

// Card de imóvel para o público leigo.
//
// A pesquisa dos concorrentes mostrou dois extremos: Kaza e Sarom trazem as
// specs no card, enquanto Luh mostra só foto, tipo e preço — e Sarom esconde
// o preço, que é a primeira coisa que a pessoa procura. Aqui o card responde
// de uma vez as quatro perguntas do visitante: quanto custa, quanto é por
// mês, quantos quartos e onde fica.
//
// A parcela vem de lib/mcmv.js (Faixa 3, 8,16% a.a., 420 meses, 20% de
// entrada) — a MESMA fonte do simulador da landing, para os dois números
// nunca se contradizerem. A premissa aparece no title do elemento.
const brl = (n, casas = 0) =>
  (n ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: casas,
  });

export function ImovelCardPublico({ imovel }) {
  const capa = imovelImageUrl(imovel.imagem_capa);
  const valor = imovel.valor_venda || imovel.valor_avaliacao;
  const parcela = parcelaDoImovel(valor);
  const bairro = imovel.localizacao || imovel.endereco || "";

  return (
    <Link
      href={`/imoveis/${imovel.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-cx-border bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-cx-bg">
        {capa ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capa}
            alt={imovel.nome_imovel || "Imóvel"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-cx-border">
            <ImageOff className="h-10 w-10" aria-hidden="true" />
          </div>
        )}

        <span className="absolute left-2.5 top-2.5 rounded-md bg-cx-blue px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white">
          {imovel.tipo || "Imóvel"}
        </span>
        {imovel.exclusivo && (
          <span className="absolute right-2.5 top-2.5 rounded-md bg-cx-orange px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white">
            Exclusivo
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="font-tabular text-xl font-bold leading-none text-cx-text">
          {valor ? brl(valor) : "Consulte"}
        </p>
        {parcela && (
          <p className="mt-1 text-xs font-semibold text-cx-blue" title={PREMISSA_CARD.rotulo}>
            ou cerca de {brl(parcela)}/mês
          </p>
        )}

        <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-cx-text">
          {imovel.nome_imovel || "Imóvel"}
        </h3>

        {bairro && (
          <p className="mt-1 flex items-start gap-1 text-xs text-cx-muted">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="line-clamp-1">{bairro}</span>
          </p>
        )}

        <div className="mt-auto flex items-center gap-4 pt-3 text-xs text-cx-muted">
          {imovel.quartos > 0 && (
            <span className="inline-flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" aria-hidden="true" />
              {imovel.quartos} {imovel.quartos === 1 ? "quarto" : "quartos"}
            </span>
          )}
          {imovel.banheiro > 0 && (
            <span className="inline-flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" aria-hidden="true" />
              {imovel.banheiro} {imovel.banheiro === 1 ? "banheiro" : "banheiros"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
