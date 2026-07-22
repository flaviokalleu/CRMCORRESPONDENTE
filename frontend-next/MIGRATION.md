# Migração Frontend: React/Vite (SPA) → Next.js (App Router)

> CRM IMOB. Motivo: SEO é prioridade real nas páginas públicas (landing, vitrine de
> imóveis, página de cada imóvel) — hoje são renderizadas 100% client-side (Vite SPA),
> o que prejudica indexação e quebra preview de link em WhatsApp/Facebook/Twitter.
> Decisão do usuário: **uma tecnologia só** para todo o projeto (não híbrido) — Next.js
> para tudo, reconstruindo cada página com base no frontend atual (React), sem
> reimaginar do zero. Next.js já é React → reaproveitamento alto de lógica/JSX.

---

## 0. Inventário real do frontend atual (baseline)

Levantado direto de `frontend/src/App.jsx` (52 rotas) + `frontend/src/routes/*.jsx`
(4 rotas customizadas — financeiro + laudos). **56 rotas no total** (1 duplicata:
`/laudos` está definida tanto em `App.jsx` quanto em `routes/laudos.jsx` — bug
pré-existente do Node/React antigo, resolver na migração).

### Classificação por prioridade de SEO

| Categoria | Rotas | Necessidade Next.js |
|---|---|---|
| **SEO crítico** (indexável + preview social) | `/`, `/home`, `/landing`, `/imoveis-publicos`, `/imoveis-publicos/:id`, `/busca`, `/precos` | SSR/SSG real, `generateMetadata` por página, OG image por imóvel, sitemap.xml, robots.txt |
| **Pública sem SEO** (funcional, não precisa indexar) | `/login`, `/registro`, `/portal/inquilino` | Client Component, sem necessidade de SSR pesado |
| **Protegida — CRM interno** (zero valor de SEO, atrás de login) | ~44 rotas (dashboard, clientes, corretores, correspondentes, imóveis internos, proprietários, laudos, simulador, visitas, propostas, pagamentos, contratos, aluguéis, whatsapp-qr, lembretes, acessos, relatório, financeiro/*, configurações) | Client Component puro (`"use client"`), mesma lógica de fetch atual |
| **Admin/SaaS** | `/super-admin` (super admin), `/minha-assinatura`, `/configuracoes-empresa` (admin) | Client Component, guard de role mantido |

### Lista completa de rotas (fonte: App.jsx + routes/)

**SEO crítico:**
- `/` , `/home`, `/landing` → `LandingPage`
- `/imoveis-publicos` → `PublicImoveisPage` (vitrine)
- `/imoveis-publicos/:id` → `MoveisDetailPage` (detalhe do imóvel — precisa de OG image + meta únicos)
- `/busca` → `Busca` (componente, não página — avaliar se vira página própria)
- `/precos` → `PrecosPage` (lazy-loaded hoje)

**Pública sem SEO:**
- `/login` → `LoginPage`
- `/registro` → `RegistroSaasPage` (lazy)
- `/portal/inquilino` → `PortalInquilinoPage` (sem guard nenhum hoje — JWT próprio)

**Protegida (ProtectedRoute) — Dashboard/Core:**
- `/dashboard` → `DashboardPage` (roteia por role internamente)
- `/dashboard/corretor`, `/dashboard/correspondente`, `/dashboard/administrador` → dashboards específicos
- `/configuracoes` → `Configuracoes`
- `/minha-assinatura` → `MinhaAssinaturaPage` (lazy)

**Protegida — Clientes:**
- `/clientes/adicionar` → `AddCliente`
- `/clientes/lista` → `ListaClientes`
- `/editar-cliente/:id` → `EditarCliente`
- `/clientes-aluguel` → `ClienteAluguelPage`

**Protegida — Corretores/Correspondentes:**
- `/corretores/adicionar` → `AddCorretor`
- `/corretores/lista` → `ListaCorretores`
- `/correspondentes/adicionar` → `AddCorrespondente`
- `/correspondentes/lista` → `ListaCorrespondentesPage`

**Protegida — Imóveis (interno):**
- `/imoveis/adicionar` → `AddImovel`
- `/imoveis/lista` → `ListaImoveis`
- `/imoveis` → redirect para `/imoveis-publicos`
- `/imovel/:id` → `MoveisDetailPage` (versão interna/protegida do mesmo componente da pública — avaliar unificação com prop de contexto)

**Protegida — Proprietários/Laudos/Simulador:**
- `/proprietarios/lista` → `ListaProprietarios`
- `/laudos` → `LaudosPage` **(duplicado — ver nota acima)**
- `/simulador` → `SimuladorPage`

**Protegida — Vendas:**
- `/visitas` → `VisitasPage`
- `/propostas` → `PropostasPage`

**Admin only (AdminOnlyRoute) — Pagamentos:**
- `/pagamentos/criar` → `CriarPagamento`
- `/pagamentos/lista` → `ListaPagamentos`

**Protegida — Contratos/Aluguéis:**
- `/contratos/lista` → `ContratosList`
- `/alugueis` → `AlugueisPage`
- `/alugueis/adicionar` → `AddAluguelPage`
- `/dashboard/alugueis` → redirect para `/dashboard`

**Protegida — Outras:**
- `/whatsapp-qr` → `WhatsAppQRCodePage`
- `/lembretes` → `LembretesPage`
- `/acessos` → `AcessosList`
- `/relatorio` → `RelatorioPage`

**Super Admin (SuperAdminRoute):**
- `/super-admin` → `SuperAdminPage` (lazy)

**Admin (ProtectedRoute, mas conteúdo restrito internamente):**
- `/configuracoes-empresa` → `ConfiguracoesTenantPage` (lazy)

**Financeiro (customRoutes):**
- `/financeiro/receitas` → `ReceitaPage`
- `/financeiro/despesas` → `DespesaPage`
- `/financeiro/dashboard` → `DashboardPage` (financeiro — nome colide com o DashboardPage principal, cuidado no import)

**Redirects utilitários (sem página própria):**
- `/sistema`, `/admin`, `/crm` → todos redirecionam para `/login`
- `*` (404) → redireciona para `/`

### Guards de rota (recriar como middleware/layout no Next.js)
- `ProtectedRoute` — exige `isAuthenticated`, senão → `/login`
- `AdminOnlyRoute` — exige `hasRole('administrador')`, senão → `/dashboard`
- `SuperAdminRoute` — exige `isSuperAdmin`, senão → `/dashboard`
- `PublicRoute` — se já autenticado, redireciona para `/dashboard` (login/registro)
- `PublicOnlyRoute` — sempre renderiza, independente de auth (landing, portal inquilino)

---

## 1.0 Decisão de segurança: ZERO localStorage — cookies httpOnly + BFF

Requisito do usuário: nenhum dado de sessão em `localStorage` (vulnerável a roubo de
token via XSS) + carregamento o mais rápido possível. Isso muda a arquitetura de auth:

- O backend Go **continua emitindo JWT normalmente** (`POST /api/auth/login` retorna
  `{token, refreshToken, user}`) — nenhuma mudança no Go.
- O Next.js atua como **BFF (Backend for Frontend)**: o browser nunca vê o JWT cru.
  - `app/api/auth/login/route.js` (Route Handler) recebe as credenciais do form,
    chama o Go real, e grava `token`/`refreshToken` como **cookies httpOnly** (via
    `next/headers` `cookies()`) na resposta. `Secure`, `SameSite=lax`, `Path=/`.
  - `app/api/auth/logout/route.js` chama o Go `/api/auth/logout` e apaga os cookies.
  - **Server Components** (páginas SEO e a maioria das páginas do CRM que só
    precisam carregar dados, não mutar) leem o cookie via `cookies()` no servidor e
    chamam a API Go **direto do servidor**, passando o Bearer — zero exposição ao
    JS do cliente, zero round-trip extra visível ao usuário (SSR já entrega HTML
    pronto).
  - Para **Client Components** que precisam de interatividade (formulários,
    polling, updates) e ainda assim não podem tocar o token: chamam um Route
    Handler proxy genérico `app/api/backend/[...path]/route.js`, que lê o cookie
    httpOnly no servidor, anexa `Authorization: Bearer` e repassa pro Go — o
    browser só fala com o próprio domínio Next.js, nunca com o token.
- `proxy.js` (raiz do projeto — Next 16 renomeou `middleware.ts` para `proxy.js`,
  ver AGENTS.md/aviso de breaking changes) faz o check **otimista**: existe o
  cookie de sessão? Se a rota é protegida e não existe → redirect pro `/login`
  instantaneamente, antes de qualquer componente renderizar (sem flash de
  "carregando..." que a SPA atual tem). A verificação **real** (assinatura JWT,
  expiração) acontece no Go a cada chamada real de API — o proxy é só uma
  otimização de UX, não a única camada de segurança (padrão recomendado pelo
  próprio guia de auth do Next.js).
- **Ganho de performance direto**: Server Components eliminam o "waterfall" atual
  (SPA precisa baixar JS → montar → *então* disparar fetch) — o HTML já vem com
  os dados. Páginas públicas (SEO) ficam praticamente instantâneas (SSG/ISR onde
  possível, ex. vitrine de imóveis com `revalidate`).

## 1. Decisões de arquitetura Next.js

- **App Router** (não Pages Router) — é o padrão atual, suporta `generateMetadata`,
  Server Components nativos, e route groups para separar público de protegido.
- **Estrutura de route groups:**
  ```
  app/
    (public)/                    # SEO crítico — Server Components + SSR/SSG
      page.jsx                   # "/" landing
      imoveis/page.jsx           # "/imoveis-publicos" → renomear para /imoveis (limpo)
      imoveis/[id]/page.jsx      # detalhe do imóvel — generateMetadata dinâmico
      busca/page.jsx
      precos/page.jsx
    (auth)/
      login/page.jsx
      registro/page.jsx
    (app)/                       # CRM protegido — Client Components, layout com Sidebar+Header
      layout.jsx                 # aplica o MainLayout (Sidebar/Header) + guard de auth
      dashboard/page.jsx
      clientes/adicionar/page.jsx
      clientes/lista/page.jsx
      ... (espelha as ~44 rotas protegidas)
    portal/inquilino/page.jsx    # pública, sem guard, fora dos grupos acima
  ```
- **Auth**: `AuthContext` atual vira um Client Component Provider igual já é (só ajustar
  imports de `import.meta.env` → `process.env.NEXT_PUBLIC_*`). Guards viram um
  `middleware.ts` (Next.js) para redirect no edge quando possível, + client-side check
  como fallback (mesma dupla camada que já existe).
- **Env vars**: `VITE_API_URL` → `NEXT_PUBLIC_API_URL` (e demais `VITE_*` → `NEXT_PUBLIC_*`).
  Next.js expõe ao cliente só variáveis prefixadas `NEXT_PUBLIC_`.
- **Data fetching público (SEO)**: Server Components chamam a API Go diretamente no
  servidor (sem CORS, sem token) para os endpoints públicos (`/api/imoveis` filtrado
  por situação disponível, etc.) — gera HTML pronto no primeiro request.
- **Data fetching protegido (CRM)**: mantém o padrão atual 100% (fetch/axios client-side
  com Bearer token do localStorage) — sem SSR, sem necessidade de mudar.
- **Metadados dinâmicos**: `generateMetadata()` em `imoveis/[id]/page.jsx` busca o
  imóvel no servidor e gera `title`, `description`, `openGraph.images` (foto de capa)
  — resolve o preview quebrado no WhatsApp/Facebook.
- **Sitemap + robots**: `app/sitemap.js` (gera XML listando todos os imóveis
  disponíveis dinamicamente) + `app/robots.js`.
- **Tailwind + shadcn**: reaproveitar 100% do que já existe (`tailwind.config.js` com
  paleta Caixa, `src/components/ui/*`, `src/lib/utils.js`) — copiar sem alteração.
- **WebSocket** (WhatsApp QR): Client Component, mesma lógica nativa que já escrevemos
  (sem socket.io), roda só no browser via `"use client"` + `useEffect`.

## 2. O que reaproveita 1:1 (sem reescrever)
- Toda a lógica de componentes internos (`src/components/*`) — copfacilidade de mover
  para o novo projeto quase sem alteração (trocar só `import.meta.env` por
  `process.env.NEXT_PUBLIC_*` e `useNavigate`/`Link` do react-router por
  `useRouter`/`Link` do `next/navigation`).
- `AuthContext.jsx`, `Sidebar.jsx`, `Header.jsx`, `ui/*` (shadcn), design tokens do
  dashboard (`DashboardUI.jsx`).
- Toda a integração com o backend Go — endpoints e contratos não mudam nada.

## 3. O que exige atenção/reescrita real
- Roteamento: `<Routes>/<Route>` → arquivos de pasta (`app/**/page.jsx`).
- `react-router-dom`'s `useNavigate()/useParams()/useLocation()` → `next/navigation`'s
  `useRouter()/useParams()/usePathname()`.
- Lazy loading: `React.lazy()` vira automático no Next (cada `page.jsx` já é
  code-split por padrão) — remover os `React.lazy`/`Suspense` manuais.
- `MoveisDetailPage` é usado em DUAS rotas hoje (`/imoveis-publicos/:id` pública e
  `/imovel/:id` protegida) — decidir se vira 1 componente parametrizado por contexto
  (público vs. interno) reaproveitado nos dois route groups, ou 2 páginas separadas.
- Página `Busca` hoje é um componente montado direto em rota — avaliar levar para
  `app/(public)/busca/page.jsx` como Server Component se fizer sentido para SEO de busca.
- Resolver a duplicata de `/laudos` (hoje definida 2x — em `App.jsx` E em
  `routes/laudos.jsx` via `customRoutes`) — manter só uma.
- `/financeiro/dashboard` usa um componente também chamado `DashboardPage` — colisão de
  nome com o dashboard principal, renomear no novo projeto.

## 3.5 Status atual (2026-07-22) — fundação validada ponta a ponta

✅ **Concluído e testado:**
- Scaffold Next.js 16.2.11 + React 19.2.4 + Tailwind v4 + shadcn/ui (últimas versões).
- Paleta Caixa (navy `#0B1426`/`#162a4a` + laranja `#F97316`) migrada para `@theme` (CSS-first, Tailwind v4) em `globals.css`. Fonte Plus Jakarta Sans via `next/font`.
- **Auth BFF completo**: `lib/session.js` (cookies httpOnly via `next/headers`), Route Handlers `api/auth/{login,logout,me,refresh}`, proxy genérico `api/backend/[...path]` (Client Components chamam só isso, nunca o Go direto — inclui retry automático em 401).
- `src/proxy.js` (renomeado de `middleware.js` no Next 16) — redirect otimista baseado em cookie, sem tocar JWT.
- `AuthContext.jsx` (client) — bem mais simples que a SPA: sem token, só usuário + login/logout via BFF.
- `AppShell` + `Sidebar` + `Header` portados da SPA (menu por role, dropdown de usuário via Radix).
- Página `/login` (Server Component, redireciona se já logado) + `/dashboard` mínimo (Server Component, `apiGet` direto do Go).
- **Testado de ponta a ponta via curl**: login grava cookie httpOnly → `/dashboard` com cookie retorna 200 com dados reais (15 clientes, 3 corretores, etc.) renderizados no servidor → `/dashboard` sem cookie retorna 307 redirect pro `/login` via `proxy.js`.

⬜ **Pendente (52 das 56 rotas do inventário §0):**
Todas as páginas exceto `/login` e `/dashboard` (versão mínima) ainda precisam ser
portadas da SPA. Ver lista completa em §0. Prioridade: cluster SEO crítico primeiro
(landing, vitrine de imóveis, detalhe do imóvel, busca, preços), depois o resto do CRM.

## 3.6 Princípio obrigatório: mobile-first em TODA página

Requisito do usuário: o sistema precisa funcionar perfeitamente em telas pequenas,
para usuários leigos usando celular. Isso vale para TODA página migrada daqui pra
frente, não só as que já existem:
- Testar cada página em viewport mobile (~375px) antes de considerar pronta.
- Touch targets grandes o suficiente (mínimo ~40px de altura em botões/links tocáveis).
- Sidebar/Header já seguem esse princípio (AppShell tem breakpoint mobile com overlay).
- Tabelas de listagem (clientes, imóveis, etc.) precisam de um layout alternativo em
  mobile (cards empilhados em vez de scroll horizontal de tabela) — decidir por página
  ao portar.
- Formulários longos (AddCliente, etc.) precisam de inputs com `font-size` ≥16px
  (evita zoom automático do iOS) e labels sempre visíveis (não só placeholder).

## 4. Ordem de execução proposta
1. Scaffold do projeto Next.js (`frontend-next/`) + Tailwind/shadcn copiados.
2. Migrar fundação: AuthContext, Sidebar, Header, layout `(app)` com guard.
3. Migrar cluster **SEO crítico** primeiro (é o motivo da migração): landing, vitrine,
   detalhe do imóvel, busca, preços — com generateMetadata + sitemap.
4. Migrar cluster **Auth**: login, registro, portal do inquilino.
5. Migrar clusters do **CRM protegido** em lote (dashboard, clientes, corretores,
   correspondentes, imóveis internos, proprietários, laudos, simulador, visitas,
   propostas, pagamentos, contratos, aluguéis, financeiro, whatsapp-qr, lembretes,
   acessos, relatório, super-admin, minha-assinatura, configurações-empresa).
6. Validar todas as 56 rotas funcionando contra o mesmo backend Go.
7. Cutover: trocar o deploy do domínio principal do Vite para o Next.js.
