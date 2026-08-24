const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";

// O site tem duas metades: as páginas PÚBLICAS (landing, vitrine, detalhe do
// imóvel, preços) e o SISTEMA logado. Antes o robots liberava tudo, o que
// gasta orçamento de rastreio do Google em telas que exigem login — e essas
// telas retornam redirect para /login, gerando ruído no relatório de
// cobertura do Search Console.
const PRIVADAS = [
  "/api/",
  "/dashboard",
  "/clientes",
  "/corretores",
  "/correspondentes",
  "/proprietarios",
  "/alugueis",
  "/clientes-aluguel",
  "/contratos",
  "/propostas",
  "/pagamentos",
  "/financeiro",
  "/laudos",
  "/visitas",
  "/lembretes",
  "/simulador",
  "/relatorio",
  "/acessos",
  "/super-admin",
  "/minha-assinatura",
  "/configuracoes",
  "/configuracoes-empresa",
  "/editar-cliente",
  "/whatsapp-qr",
  "/portal",
  "/login",
  "/registro",
];

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVADAS,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
