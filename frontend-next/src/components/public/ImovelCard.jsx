import Link from "next/link";
import { API_URL } from "@/lib/api-server";

// Card de imóvel reutilizável nas páginas públicas (landing, vitrine, busca).
// Server Component puro (sem "use client") — só recebe dados já buscados
// pela página pai. Monta a URL da imagem direto contra o backend Go
// (API_URL), pois arquivos estáticos não passam pelo proxy Next.
export function formatMoeda(valor) {
  const n = Number(valor || 0);
  if (!n) return "Consultar";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function imovelImagemUrl(imagemCapa) {
  if (!imagemCapa) return null;
  return `${API_URL}/${String(imagemCapa).replace(/\\/g, "/")}`;
}

export default function ImovelCard({ imovel }) {
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
      className="block rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="h-44 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
        {imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagemUrl} alt={nome || "Imóvel"} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-sm">Sem imagem</span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-caixa-orange">
            {tipo || "Imóvel"}
          </span>
        </div>

        <h3 className="font-bold text-gray-900 line-clamp-1">{nome || "Nome não disponível"}</h3>
        <p className="text-sm text-gray-500 line-clamp-1 mb-2">{localizacao || "Localização não informada"}</p>

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          {!!quartos && <span>{quartos} qts</span>}
          {!!banheiro && <span>{banheiro} banh.</span>}
          {!!vagasFinal && <span>{vagasFinal} vagas</span>}
          {!!area && <span>{area}m²</span>}
        </div>

        <div className="font-bold text-caixa-primary">{formatMoeda(valor)}</div>
      </div>
    </Link>
  );
}
