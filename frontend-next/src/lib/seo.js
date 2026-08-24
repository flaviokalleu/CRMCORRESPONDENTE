// ─── Dados estruturados (JSON-LD) ────────────────────────────────────────────
//
// É o maior ganho de SEO para um negócio LOCAL: sem isso o Google lê a página
// como texto solto; com isso ele entende que existe uma imobiliária, onde ela
// atende, quais imóveis estão à venda e por quanto — e passa a exibir preço,
// foto e perguntas frequentes direto no resultado da busca.
//
// Os dados de contato ainda são placeholders ([00] etc.). Preencher é
// obrigatório antes de publicar: o Google penaliza NAP (nome, endereço,
// telefone) inconsistente entre o site, o Google Meu Negócio e os diretórios.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";

export const EMPRESA = {
  nome: "CRM IMOB",
  telefone: "+55-61-00000-0000",
  email: "contato@suaimobiliaria.com.br",
  rua: "[Endereço do escritório]",
  cidade: "Valparaíso de Goiás",
  uf: "GO",
  cep: "72870-000",
  creci: "[00000-J]",
};

// Cidades atendidas — alimenta `areaServed`, que é o que faz a imobiliária
// aparecer em buscas do tipo "imobiliária em Cidade Ocidental".
export const CIDADES_ATENDIDAS = [
  "Valparaíso de Goiás",
  "Cidade Ocidental",
  "Jardim Ingá",
  "Luziânia",
  "Novo Gama",
  "Águas Lindas de Goiás",
  "Brasília",
];

export function jsonLdImobiliaria() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${SITE_URL}/#organizacao`,
    name: EMPRESA.nome,
    url: SITE_URL,
    telephone: EMPRESA.telefone,
    email: EMPRESA.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: EMPRESA.rua,
      addressLocality: EMPRESA.cidade,
      addressRegion: EMPRESA.uf,
      postalCode: EMPRESA.cep,
      addressCountry: "BR",
    },
    areaServed: CIDADES_ATENDIDAS.map((c) => ({ "@type": "City", name: c })),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "08:00",
        closes: "12:00",
      },
    ],
    knowsAbout: [
      "Minha Casa Minha Vida",
      "Financiamento imobiliário Caixa",
      "Uso do FGTS na compra do imóvel",
      "Subsídio habitacional de Goiás",
    ],
  };
}

// Um imóvel vira um anúncio com preço — é o que gera o resultado rico com
// valor e foto na busca.
export function jsonLdImovel(imovel) {
  const valor = imovel?.valor_venda || imovel?.valor_avaliacao || 0;
  const url = `${SITE_URL}/imoveis/${imovel.id}`;

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": url,
    url,
    name: imovel.nome_imovel || "Imóvel",
    description: imovel.descricao_imovel || undefined,
    datePosted: imovel.createdAt || undefined,
    ...(imovel.imagem_capa ? { image: `${SITE_URL}/api/backend/uploads/${imovel.imagem_capa}` } : {}),
    provider: { "@id": `${SITE_URL}/#organizacao` },
    about: {
      "@type": "SingleFamilyResidence",
      name: imovel.nome_imovel || "Imóvel",
      numberOfRooms: imovel.quartos || undefined,
      numberOfBathroomsTotal: imovel.banheiro || undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress: imovel.endereco || undefined,
        addressLocality: imovel.localizacao || EMPRESA.cidade,
        addressRegion: EMPRESA.uf,
        addressCountry: "BR",
      },
    },
    ...(valor > 0
      ? {
          offers: {
            "@type": "Offer",
            price: valor,
            priceCurrency: "BRL",
            availability:
              (imovel.situacao_imovel || "").toLowerCase() === "disponivel"
                ? "https://schema.org/InStock"
                : "https://schema.org/SoldOut",
            url,
          },
        }
      : {}),
  };
}

export function jsonLdBreadcrumb(itens) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: itens.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.nome,
      item: `${SITE_URL}${it.url}`,
    })),
  };
}

// As dúvidas reais do público desta região. Vira o bloco de perguntas
// expansível direto no Google — e são exatamente as perguntas que a pessoa
// digita antes de procurar imobiliária.
export const PERGUNTAS = [
  {
    pergunta: "Quanto o banco libera para eu comprar um imóvel?",
    resposta:
      "Depende da renda da família, da faixa do Minha Casa Minha Vida em que você se enquadra e do imóvel escolhido. A prestação não pode passar de 30% da renda, e o prazo vai até 420 meses. Imóveis na planta costumam liberar mais que usados, porque neles entram os subsídios federal e estadual.",
  },
  {
    pergunta: "O que significa dizer que foram liberados R$ 200 mil?",
    resposta:
      "Não é dinheiro na conta. É a soma do financiamento que você paga em parcelas com os subsídios federal e estadual, que você não devolve. Só a parte do financiamento vira dívida.",
  },
  {
    pergunta: "Quanto menor a renda, maior o subsídio?",
    resposta:
      "Sim. Dentro das regras do programa, rendas menores recebem subsídio maior e ficam com parcela menor. O subsídio estadual de Goiás, por exemplo, atende famílias com renda de até três salários mínimos.",
  },
  {
    pergunta: "Posso usar o FGTS na compra do imóvel?",
    resposta:
      "Pode. O saldo do FGTS entra como entrada e reduz o valor financiado, diminuindo a parcela. Quem tem três anos ou mais de FGTS também paga juros menores.",
  },
  {
    pergunta: "O que é o laudo de avaliação do imóvel?",
    resposta:
      "É o relatório de um engenheiro que diz quanto o imóvel vale. O banco financia em cima do valor do laudo, não do preço pedido pelo vendedor. Quando o imóvel é vendido abaixo do laudo, isso é vantajoso para o comprador.",
  },
  {
    pergunta: "Em quais cidades vocês atendem?",
    resposta: `Atendemos ${CIDADES_ATENDIDAS.join(", ")}.`,
  },
];

export function jsonLdFAQ(perguntas = PERGUNTAS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: perguntas.map((p) => ({
      "@type": "Question",
      name: p.pergunta,
      acceptedAnswer: { "@type": "Answer", text: p.resposta },
    })),
  };
}

export function jsonLdWebSite() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#site`,
    url: SITE_URL,
    name: EMPRESA.nome,
    inLanguage: "pt-BR",
    publisher: { "@id": `${SITE_URL}/#organizacao` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/imoveis?cidade={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}
