# Páginas públicas de SEO — wiring

## Arquivos criados

- `src/app/(public)/page.js` — landing ("/"), Server Component, `apiGet('/imoveis?limit=6')`.
- `src/app/(public)/imoveis/page.js` — vitrine pública ("/imoveis"), `apiGet('/imoveis')`.
- `src/app/(public)/imoveis/[id]/page.js` — detalhe do imóvel, com `generateMetadata` (OG image = `imagem_capa`), busca `apiGet('/imoveis/:id')` e `apiGet('/imoveis/:id/semelhantes')`.
- `src/app/(public)/busca/page.js` — busca ("/busca?busca=termo"), Server Component lendo `searchParams` (form GET nativo, sem client-side fetch).
- `src/app/(public)/precos/page.js` — página de planos, estática (Server Component), FAQ via `<details>/<summary>` nativo (sem JS).
- `src/components/public/ImovelCard.jsx` — card reutilizável (exporta também `formatMoeda` e `imovelImagemUrl`).
- `src/app/sitemap.js` — rotas estáticas + uma URL por imóvel (`apiGet('/imoveis')`).
- `src/app/robots.js` — allow all, aponta pro sitemap.

## Decisões / observações

1. **Removi `src/app/page.js`** (boilerplate do `create-next-app`, "Deploy Now"/"Documentation"). Ele mapeava para a mesma rota "/" que `src/app/(public)/page.js` — manter os dois causaria erro de build (rota duplicada). Como era só o scaffold padrão, não conteúdo de outro agente, removi para o app buildar.
2. **Imagens (`imagem_capa`/`imagens`)**: a SPA antiga monta a URL como `${VITE_API_URL}/${caminho}`. Como `API_URL` (privado, em `lib/api-server.js`) já é exportado, os componentes Server usam `API_URL` diretamente para montar `src` de `<img>` — não há proxy de arquivos estáticos hoje, então o browser precisa da URL absoluta do backend Go mesmo (isso já "vaza" o host do backend na tag `<img>`, mas é inevitável sem um proxy de assets; não expõe token nem é usado para chamadas autenticadas).
3. **`/precos`**: a referência (`PrecosPage.jsx`) usa dados de planos **hardcoded** (array `PLANS`), não chama `/tenant/plans` — confirmei lendo o arquivo. Só `RegistroSaasPage`/`MinhaAssinaturaPage` (fora do escopo público) usam esse endpoint. Portei os mesmos planos estáticos.
4. **`/busca`**: implementada como Server Component (não Client) — o termo vem por query string GET, então dá pra buscar no servidor com `apiGet`, evitando roundtrip client-side e ficando melhor pra SEO. Form usa `method="GET" action="/busca"` nativo (sem JS).
5. **Toggle mensal/anual e accordion de FAQ** em `/precos` foram simplificados: toggle removido (mostra só preço mensal), FAQ usa `<details>` nativo — sem framer-motion/estado client, conforme "funcional > bonito".
6. Endpoints assumidos (mesmos da SPA antiga): `GET /imoveis`, `GET /imoveis?limit=N`, `GET /imoveis/:id`, `GET /imoveis/:id/semelhantes`, `GET /imoveis/busca?busca=termo`. Nenhum agente/backend foi alterado — se algum desses paths não existir no Go, `apiGet` retorna `null`/lista vazia e a página renderiza estado vazio (não quebra).
7. `SITE_URL` usado em `sitemap.js`/`robots.js` lê `NEXT_PUBLIC_SITE_URL` (ou `SITE_URL`) com fallback `http://localhost:3000` — essa env var ainda não existe no projeto; recomendo configurá-la em produção.
