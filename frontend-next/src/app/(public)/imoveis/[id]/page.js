import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import { formatMoeda, imovelImagemUrl } from "@/components/public/ImovelCard";
import { ImovelCardPublico } from "@/components/public/ImovelCardPublico";
import { JsonLd } from "@/components/public/JsonLd";
import { jsonLdBreadcrumb, jsonLdImovel } from "@/lib/seo";
import { linkWhatsAppPublico } from "@/lib/contato-publico";
import { whatsappPublico } from "@/lib/contato-publico-server";
import { ArrowLeft, Bath, BedDouble, Car, ImageOff, MapPin, MessageCircle, Maximize } from "@/components/icons";

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
  const local = imovel.localizacao || "Valparaíso de Goiás";
  const valor = imovel.valor_venda || imovel.valor_avaliacao;

  // O título é o que aparece na aba e no resultado do Google. Montamos com os
  // termos que a pessoa realmente digita — tipo, quartos e cidade — em vez de
  // repetir só o nome do cadastro interno.
  const partes = [imovel.tipo, imovel.quartos ? `${imovel.quartos} quartos` : null, local].filter(Boolean);
  const title = `${nome}${partes.length ? ` — ${partes.join(", ")}` : ""}`;

  const descricao =
    imovel.descricao_imovel?.slice(0, 155) ||
    `${imovel.tipo || "Imóvel"} em ${local}${valor ? ` por ${formatMoeda(valor)}` : ""}. Simule o financiamento e fale com um corretor.`;

  const imagemUrl = imovelImagemUrl(imovel.imagem_capa);

  return {
    title,
    description: descricao,
    alternates: { canonical: `/imoveis/${id}` },
    openGraph: {
      type: "article",
      title,
      description: descricao,
      url: `/imoveis/${id}`,
      images: imagemUrl ? [{ url: imagemUrl, alt: nome }] : [],
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
  // Número do WhatsApp cadastrado em "Minha empresa" da imobiliária da vitrine.
  const numeroWhats = await whatsappPublico();
  const linkWhats = (texto) => linkWhatsAppPublico(texto, numeroWhats);
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

  const whatsappLink = linkWhats(
    `Olá! Tenho interesse no imóvel "${nome}" (${formatMoeda(valor)}). Ainda está disponível?`
  );

  // Só mostra o que existe — "N/A" em vagas/área assusta mais do que ajuda.
  const specs = [
    quartos ? { Icon: BedDouble, valor: quartos, rotulo: quartos === 1 ? "quarto" : "quartos" } : null,
    banheiro ? { Icon: Bath, valor: banheiro, rotulo: banheiro === 1 ? "banheiro" : "banheiros" } : null,
    vagasFinal ? { Icon: Car, valor: vagasFinal, rotulo: vagasFinal === 1 ? "vaga" : "vagas" } : null,
    area ? { Icon: Maximize, valor: `${area} m²`, rotulo: "de área" } : null,
  ].filter(Boolean);

  const semelhantesData = await apiGet(`/public/imoveis/${id}/semelhantes`);
  const semelhantes = Array.isArray(semelhantesData) ? semelhantesData : semelhantesData?.data || [];

  return (
    <div className="min-h-screen bg-cx-bg pb-24 lg:pb-0">
      {/* O anúncio estruturado é o que faz o Google mostrar preço e foto do
          imóvel direto no resultado da busca. */}
      <JsonLd data={jsonLdImovel(imovel)} />
      <JsonLd
        data={jsonLdBreadcrumb([
          { nome: "Início", url: "/" },
          { nome: "Imóveis", url: "/imoveis" },
          { nome: nome, url: `/imoveis/${id}` },
        ])}
      />
      <div className="border-b border-cx-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-2">
          <Link href="/imoveis" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-cx-muted hover:text-cx-text">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Ver todos os imóveis
          </Link>
        </div>
      </div>

      {/* Ordem no celular: foto → preço e contato → descrição. Antes a
          descrição vinha antes do preço e do botão de contato. */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-3 lg:col-span-2">
          <div
            className={`w-full overflow-hidden rounded-xl bg-cx-bg ${imagensExibidas[0] ? "aspect-video" : "h-32"}`}
          >
            {imagensExibidas[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagensExibidas[0]} alt={nome} className="h-full w-full object-cover" />
            ) : (
              <div className="lst-foto-vazia">
                <ImageOff aria-hidden="true" /> Fotos em breve — peça pelo WhatsApp
              </div>
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
                  className="h-20 w-full rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <aside className="lg:col-span-1 lg:row-span-2">
          <div className="rounded-xl border border-cx-border bg-white p-6 lg:sticky lg:top-8">
            <span className="ass-selo ass-tom-neutro">{tipo}</span>
            <h1 className="mt-3 text-2xl font-bold text-cx-text">{nome}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-cx-muted">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /> {localizacao}
            </p>
            <p className="mt-4 text-3xl font-bold tabular-nums text-cx-blue">{formatMoeda(valor)}</p>

            {specs.length > 0 && (
              <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {specs.map(({ Icon, valor: v, rotulo }) => (
                  <li key={rotulo} className="flex items-center gap-2 rounded-lg bg-cx-bg p-3 text-cx-text">
                    <Icon className="h-4 w-4 shrink-0 text-cx-muted" aria-hidden="true" />
                    <span>
                      <strong className="font-bold">{v}</strong> {rotulo}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="lst-cta-whats mt-6 w-full">
              <MessageCircle aria-hidden="true" /> Tenho interesse
            </a>
            <p className="mt-2 text-center text-xs text-cx-muted">Você fala direto com um corretor pelo WhatsApp.</p>
          </div>
        </aside>

        <div className="rounded-xl border border-cx-border bg-white p-6 lg:col-span-2">
          <h2 className="mb-2 text-lg font-bold text-cx-text">Sobre o imóvel</h2>
          <p className="whitespace-pre-line leading-relaxed text-cx-muted">{descricao}</p>
        </div>
      </div>

      {semelhantes.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="mb-4 text-xl font-bold text-cx-text">Imóveis parecidos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {semelhantes.slice(0, 4).map((item) => (
              <ImovelCardPublico key={item.id} imovel={item} />
            ))}
          </div>
        </div>
      )}
      {/* Celular: preço e "Tenho interesse" sempre à mão enquanto rola. */}
      <div className="lst-barra-fixa">
        <div className="min-w-0">
          <p className="truncate text-xs text-cx-muted">{nome}</p>
          <p className="text-lg font-bold tabular-nums text-cx-text">{formatMoeda(valor)}</p>
        </div>
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="lst-cta-whats">
          <MessageCircle aria-hidden="true" /> Tenho interesse
        </a>
      </div>
    </div>
  );
}
