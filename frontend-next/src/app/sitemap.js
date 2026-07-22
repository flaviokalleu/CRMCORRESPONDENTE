import { apiGet } from "@/lib/api-server";

// sitemap.xml — lista as rotas públicas de SEO + uma URL por imóvel.
// Ver src/app/(public)/ (landing, vitrine, detalhe, busca, preços).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";

export default async function sitemap() {
  const staticRoutes = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/imoveis`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/busca`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/precos`, changeFrequency: "monthly", priority: 0.7 },
  ].map((entry) => ({ ...entry, lastModified: new Date() }));

  const data = await apiGet("/public/imoveis");
  const imoveis = Array.isArray(data) ? data : data?.data || [];

  const imovelRoutes = imoveis
    .filter((imovel) => imovel?.id != null)
    .map((imovel) => ({
      url: `${SITE_URL}/imoveis/${imovel.id}`,
      lastModified: imovel.updated_at ? new Date(imovel.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  return [...staticRoutes, ...imovelRoutes];
}
