# CRM IMOB

Sistema de gestão imobiliária completo — SaaS multi-tenant para imobiliárias, corretores e
correspondentes bancários. Centraliza todo o ciclo de negócio: captação e cadastro de clientes,
portfólio de imóveis, locação, contratos, financeiro e cobrança, comunicação via WhatsApp e
gestão de equipe — tudo isolado por organização (tenant) na mesma instalação.

---

## O que o sistema faz

### Vendas e cadastro
- **Clientes** — cadastro completo (dados pessoais, financeiros, cônjuge, fiador, documentos),
  funil de status (aguardando aprovação → proposta → documentação → aprovado/reprovado →
  concluído), upload e conversão de documentos.
- **Imóveis** — portfólio para venda, com situação (disponível/reservado/vendido), imagens,
  busca e vitrine pública.
- **Propostas, visitas e simulador** de financiamento (SAC e PRICE) para o funil de vendas.
- **Corretores e correspondentes** — cadastro de equipe, ranking de performance, permissões por
  papel (administrador / corretor / correspondente).

### Locação (aluguéis)
- Portfólio de imóveis para locação, inquilinos, contratos com reajuste (IGPM), vistorias,
  chamados de manutenção.
- **Régua de cobrança automatizada** (5 etapas: D-5 a D+15) com notificação via WhatsApp.
- **Repasses a proprietários** com cálculo de comissão e transferência PIX.
- **Portal do inquilino** — acesso próprio (login por CPF) para consultar cobranças, recibos e
  contrato.

### Financeiro
- Receitas, despesas, comissões e fluxo de caixa.
- **Pagamentos via Asaas** (boleto, PIX, cobrança avulsa e recorrente) com webhook de
  confirmação idempotente.
- Billing do próprio SaaS: planos, assinaturas, feature gating e limites por plano.

### Comunicação e operação
- **WhatsApp** integrado (QR Code, envio de mensagens, notificações automáticas de status,
  documentos e pagamentos) via conexão direta ao WhatsApp (sem API paga de terceiros).
- **WebSocket nativo** para atualizações em tempo real (status da conexão do WhatsApp, etc.).
- Dashboards com gráficos (funil de clientes, evolução mensal/semanal, portfólio de imóveis e
  aluguéis, indicadores financeiros), notificações e alertas.
- **Painel Super Admin** — métricas SaaS (MRR/ARR, churn, assinaturas por plano), gestão de
  tenants e planos.

### Multi-tenancy e segurança
- Cada organização (tenant) enxerga só os próprios dados — isolamento automático em toda
  consulta ao banco, com liberação apenas para o super admin da plataforma.
- Autenticação JWT com sessão deslizante; nenhuma exposição de credenciais no repositório.

---

## Arquitetura

O projeto está em transição controlada (estratégia *strangler-fig*): o backend e o frontend
originais em Node/React seguem funcionando enquanto as novas versões (Go e Next.js) assumem as
rotas gradualmente, sem downtime.

```
CRMCORRESPONDENTE/
├── backend-go/       → backend atual e definitivo, em Go (substitui o Node/Express)
├── frontend/          → frontend em produção hoje, em React + Vite
└── frontend-next/     → nova versão do frontend, em Next.js (migração em andamento)
```

| Componente | Papel |
|---|---|
| `backend-go` | API única consumida por **ambos** os frontends — é o backend real e definitivo do sistema. |
| `frontend` | SPA em React/Vite, em produção. Vai sendo substituída página por página pelo `frontend-next`. |
| `frontend-next` | Nova versão em Next.js, focada em SEO nas páginas públicas (vitrine de imóveis, landing) e em segurança de sessão (zero `localStorage`). |

---

## Stack

### Backend — `backend-go`

| Camada | Tecnologia |
|---|---|
| Linguagem | Go |
| Web framework | [Gin](https://github.com/gin-gonic/gin) |
| ORM / Banco | [GORM](https://gorm.io) + PostgreSQL (driver `pgx`) |
| Migrations | [golang-migrate](https://github.com/golang-migrate/migrate) — schema versionado, recria o banco do zero em qualquer ambiente |
| Autenticação | JWT ([golang-jwt](https://github.com/golang-jwt/jwt)) — access token (1h) + refresh (7d) |
| WhatsApp | [whatsmeow](https://github.com/tulir/whatsmeow) — conexão direta ao protocolo do WhatsApp, sem API paga |
| Tempo real | WebSocket nativo ([gorilla/websocket](https://github.com/gorilla/websocket)) — sem Socket.IO |
| Pagamentos | [Asaas](https://www.asaas.com/) (boleto, PIX, cobrança recorrente, webhook) |
| Jobs agendados | [robfig/cron](https://github.com/robfig/cron) — régua de cobrança, sincronização, relatórios |
| Multi-tenancy | Isolamento automático via `context.Context` + callbacks globais do GORM (equivalente a *row-level security* na camada de aplicação) |

**Arquitetura interna**: módulos por domínio (`internal/modules/{clientes,imoveis,alugueis,
financeiro,pagamentos,whatsapp,dashboards,superadmin,...}`), cada um com
`handler → service → repository`, seguindo o padrão de camadas do Go idiomático.

### Frontend em produção — `frontend`

| Camada | Tecnologia |
|---|---|
| Framework | React 18 |
| Build tool | [Vite](https://vitejs.dev) |
| Estilo | Tailwind CSS v3 + componentes próprios estilo shadcn (Radix UI + `class-variance-authority`) |
| Gráficos | [Recharts](https://recharts.org) |
| Animação | Framer Motion |
| Ícones | Lucide |
| Roteamento | React Router |

### Nova versão — `frontend-next` (em migração)

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 16** (App Router) |
| React | **React 19** |
| Estilo | **Tailwind CSS v4** (configuração CSS-first) + **shadcn/ui** (versão mais recente) |
| Autenticação | **Cookies httpOnly** via BFF (Backend for Frontend) — o JWT nunca é exposto ao JavaScript do navegador; zero `localStorage` |
| Renderização | Server Components com busca de dados direto no servidor (SSR) nas páginas do CRM; SSR/SSG + metadados dinâmicos (`generateMetadata`, Open Graph) nas páginas públicas |

**Por que migrar**: as páginas públicas (vitrine de imóveis, landing, detalhe de cada imóvel)
precisavam de SEO real e preview correto ao compartilhar links no WhatsApp/redes sociais — algo
que uma SPA pura não entrega. A migração aproveitou o momento para eliminar token em
`localStorage` (superfície de ataque XSS) e adotar as versões mais recentes de todo o stack.

---

## Rodando localmente

Cada parte roda de forma independente. O `backend-go` é obrigatório para qualquer um dos dois
frontends funcionar.

### Backend
```bash
cd backend-go
cp .env.example .env        # configurar DB_*, JWT_SECRET_KEY, etc.
migrate -path migrations -database "$DATABASE_URL" up   # recria o schema do zero
go run ./cmd/api
```

### Frontend (produção — Vite)
```bash
cd frontend
npm install
npm run st                  # dev server com hot reload
```

### Frontend (novo — Next.js)
```bash
cd frontend-next
npm install
cp .env.local.example .env.local   # configurar API_URL (privada, aponta pro backend-go)
npm run dev
```

---

## Status da migração

| Frente | Estado |
|---|---|
| Backend Node → Go | ✅ Migrado — `backend-go` é o backend real, todos os módulos de negócio implementados |
| Schema do banco | ✅ Versionado via `golang-migrate`, reproduzível do zero em qualquer ambiente |
| Frontend Vite → Next.js | 🚧 Em andamento — fundação de autenticação (BFF + cookies httpOnly) validada ponta a ponta; páginas sendo portadas por cluster (SEO público primeiro, depois o restante do CRM) |
| Design system | 🚧 React 19 + Tailwind v4 + shadcn/ui mais recentes adotados no `frontend-next`; refinamento visual de cada página é uma etapa própria, após todas estarem funcionalmente portadas |

Consulte `backend-go/STATUS.md` e `frontend-next/MIGRATION.md` para o detalhamento técnico
completo de cada frente.
