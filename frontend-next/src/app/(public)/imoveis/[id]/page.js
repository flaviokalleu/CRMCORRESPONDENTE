import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import ImovelCard, { formatMoeda, imovelImagemUrl } from "@/components/public/ImovelCard";

// Detalhe de um imóvel ("/imoveis/:id"). Server Component.
// Referência de lógica: frontend/src/pages/MoveisDetailPage.jsx +
// frontend/src/components/MoveisDetail.jsx.
//
// generateMetadata busca o imóvel no servidor e usa a imagem de capa no
// openGraph — é o motivo real da migração (preview correto ao compartilhar
// no WhatsApp/Facebook).
async function getImovel(id) {
  const res = await apiGet(`/public/imoveis/${id}`);
  if (!res) return null;
  return res.data || res;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const imovel = await getImovel(id);

  if (!imovel) {
    return { title: "Imóvel não encontrado" };
  }

  const nome = imovel.nome_imovel || "Imóvel";
  const descricao =
    imovel.descricao_imovel?.slice(0, 160) ||
    `${nome} em ${imovel.localizacao || "Valparaíso de Goiás"}. Confira detalhes e valores.`;
  const imagemUrl = imovelImagemUrl(imovel.imagem_capa);

  return {
    title: nome,
    description: descricao,
    openGraph: {
      title: nome,
      description: descricao,
      images: imagemUrl ? [{ url: imagemUrl }] : [],
    },
  };
}

function parseImagens(imagensRaw) {
  if (!imagensRaw) return [];
  if (Array.isArray(imagensRaw)) return imagensRaw;
  try {
    const parsed = JSON.parse(String(imagensRaw).replace(/&quot;/g, '"'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function ImovelDetailPage({ params }) {
  const { id } = await params;
  const imovel = await getImovel(id);

  if (!imovel) {
    notFound();
  }

  const {
    nome_imovel: nome = "Nome não disponível",
    valor_venda: valor = 0,
    imagem_capa: imagemCapa,
    descricao_imovel: descricao = "Descrição não disponível.",
    quartos,
    banheiro,
    vagas,
    garagem,
    localizacao = "Localização não informada",
    area,
    tipo = "Imóvel",
    imagens: imagensRaw,
  } = imovel;

  const vagasFinal = vagas ?? garagem;
  const imagemCapaUrl = imovelImagemUrl(imagemCapa);
  const galeria = parseImagens(imagensRaw)
    .map((img) => imovelImagemUrl(img))
    .filter(Boolean);
  const imagensExibidas = galeria.length > 0 ? galeria : imagemCapaUrl ? [imagemCapaUrl] : [];

  const whatsappMessage = `Olá! Estou interessado no imóvel "${nome}" no valor de ${formatMoeda(valor)}.`;
  const whatsappLink = `https://api.whatsapp.com/send/?phone=556182511308&text=${encodeURIComponent(
    whatsappMessage
  )}`;

  const semelhantesData = await apiGet(`/public/imoveis/${id}/semelhantes`);
  const semelhantes = Array.isArray(semelhantesData) ? semelhantesData : semelhantesData?.data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/imoveis" className="text-sm text-caixa-primary hover:underline">
            &larr; Voltar aos imóveis
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-80 sm:h-96 w-full bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
            {imagensExibidas[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagensExibidas[0]} alt={nome} className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400">Sem imagem</span>
            )}
          </div>

          {imagensExibidas.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {imagensExibidas.slice(1, 9).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={img}
                  alt={`${nome} - imagem ${i + 2}`}
                  className="h-20 w-full object-cover rounded-lg"
                />
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-bold text-lg text-gray-900 mb-2">Sobre o imóvel</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{descricao}</p>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-8">
            <span className="inline-block bg-caixa-orange/10 text-caixa-orange text-xs font-bold px-3 py-1 rounded-full mb-3">
              {tipo}
            </span>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{nome}</h1>
            <p className="text-gray-500 mb-4">{localizacao}</p>
            <div className="text-3xl font-bold text-caixa-primary mb-6">{formatMoeda(valor)}</div>

            <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="font-bold text-gray-900">{quartos ?? "N/A"}</div>
                <div className="text-gray-500">Quartos</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="font-bold text-gray-900">{banheiro ?? "N/A"}</div>
                <div className="text-gray-500">Banheiros</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="font-bold text-gray-900">{vagasFinal ?? "N/A"}</div>
                <div className="text-gray-500">Vagas</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="font-bold text-gray-900">{area ? `${area}m²` : "N/A"}</div>
                <div className="text-gray-500">Área</div>
              </div>
            </div>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-[#25D366] text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Tenho interesse (WhatsApp)
            </a>
          </div>
        </div>
      </div>

      {semelhantes.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Imóveis semelhantes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {semelhantes.slice(0, 4).map((item) => (
              <ImovelCard key={item.id} imovel={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
