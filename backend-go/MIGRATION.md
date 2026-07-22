# Migração Backend: Node.js/Express → Go

> CRM IMOB — SaaS multi-tenant. Meta: backend em Go, organizado, performático, com GORM,
> WebSocket nativo (sem socket.io), whatsmeow (WhatsApp) e **Asaas substituindo Mercado Pago**.
> Estratégia: **strangler-fig** — o Go novo aponta para o **MESMO PostgreSQL** e sobe ao lado do
> Node; o nginx roteia rota por rota; nada fica fora do ar.

---

## 0. Escopo real descoberto (baseline Node)

| Item | Quantidade | Observação |
|---|---|---|
| Arquivos de rotas | 47 (`routes/`) | maiores: `pagamentos.js` (66KB), `clientes.js` (63KB), `dashboardRoutes.js`, `configuracao.js` |
| Models Sequelize | 35 (`models/`) | + `index.js` / `init-models.js` |
| Services | 22 (`services/`) | inclui `asaasService.js` (JÁ EXISTE), `mercadoPagoService.js` (SAI) |
| Middleware | 11 (`middleware/`) | auth, tenant (2), featureGating, storageLimit, accessLogger, upload, validators |
| Migrations | 88 | schema NÃO muda — Go reutiliza as tabelas existentes |
| Multi-tenancy | ✅ | `tenant_id` + `AsyncLocalStorage` + hooks automáticos beforeFind/Create/Update/Destroy |
| SaaS/billing | ✅ | `Tenant`, `Plan`, `Subscription`, feature gating, storage limits |
| Realtime | socket.io | vira **WebSocket nativo** (hub por tenant: sala `whatsapp:{tenantId}`) |
| WhatsApp | Baileys | vira **whatsmeow** (Go) |
| Pagamentos | Mercado Pago + Asaas | vira **só Asaas** |

---

## 1. Fundação (bloqueia todo o resto) — FASE 1 ✅ ESQUELETO CONCLUÍDO (compila + vet OK)

- [x] **Projeto Go**: `go mod init crmimob`, layout `cmd/api + internal/...`
- [x] **Config**: `internal/config` — carrega `.env` (mesmas vars: `DB_*`, `JWT_SECRET_KEY`, `FRONTEND_URL`), fail-fast sem secret
- [x] **DB**: `internal/database` — GORM + `pgx`, pool (25/10), `PrepareStmt`, aponta pro `crmjs`, SEM auto-migrate
- [x] **Naming**: models com `TableName()` + tags de coluna explícitas, 1:1 com tabelas atuais
- [x] **Router**: `internal/server/router.go` — Gin, grupos `/api/...`
- [x] **Middleware base**: `internal/middleware` — recovery, logger (slog), CORS (allowlist), rate limit (10/15min por IP)
- [x] **Auth unificado**: `internal/auth` — JWT (1h) + refresh (7d), dupla verificação (assinatura + registro em `tokens`), 1-sessão-por-user; login/refresh/logout/me/validate
- [x] **Tenant isolation**: `internal/tenant` — `context.Context` + callbacks GORM (filter em query/update/delete, inject em create); globais isentos; `ResolveTenant` middleware
- [x] **Super admin**: `X-Tenant-Id` sobrepõe tenant — **restrito a is_super_admin** (corrige gotcha §7.10)
- [x] **Health check**: `GET /api/health` (autentica no DB)
- [x] **Graceful shutdown** + timeouts de servidor
- [ ] **PENDENTE p/ rodar**: preencher `.env` (copiar de `.env.example`) e validar contra o Postgres real
- [ ] **PENDENTE**: baseline golang-migrate (`pg_dump` → `0001_baseline` + `migrate force 1`) — ver `migrations/README.md`
- [ ] **PENDENTE p/ paridade total do cluster 01**: módulos users/corretores/correspondentes/admins, tenant onboarding (`/api/tenant/register`), super-admin, feature gating, storage

## 2. Migrations & Schema

- [ ] Adotar `golang-migrate` OU deixar o Node continuar dono das migrations (decisão) — schema é compartilhado
- [ ] Gerar structs GORM a partir das 88 migrations / tabelas reais (não do zero)
- [ ] Validar: `valor_renda` em `Cliente` é **VARCHAR** — aggregations exigem `CAST(... AS NUMERIC)`

## 3. Domínios a migrar (rota por rota)

### 3.1 Core / Cadastros
- [ ] **Auth** — `authRoutes`, `protectedRoutes`, tokens, refresh
- [ ] **Users** — `userRoutes`, `adminRoutes`, roles (`is_administrador`/`is_correspondente`/`is_corretor`), uploads por role
- [ ] **Corretor / Correspondente** — `corretorRoutes`, `correspondente`, `listadecorretores`
- [ ] **Clientes** — `clientes.js` (63KB!), `listadeclientes`, model gigante (financeiro, cônjuge, fiador, docs)
- [ ] **Imóveis** — `imoveis`, `imovelService`
- [ ] **Notas / Lembretes / Acessos / Locations** — `notas`, `notasRoutes`, `lembreteRoutes`, `acessos`, `locations` (estados/municípios globais)

### 3.2 Financeiro / Pagamentos (Asaas)
- [ ] **Pagamentos** — `pagamentos.js` (66KB), `pagamentoService`, migrar de MP → **Asaas** (boleto/PIX/cartão)
- [ ] **Asaas webhook** — `asaasWebhook.js` (já existe) — validar assinatura, idempotência
- [ ] **REMOVER** Mercado Pago — `mercadoPagoService.js`, origins de CORS do MP, `PagamentoService` acoplado a MP
- [ ] **Receitas / Despesas / Comissões / Fluxo de caixa** — `receitas`, `despesas`, `comissoes`, `fluxocaixa`
- [ ] **Repasses** — `repasseRoutes`, `repasseService`, `repasseproprietario`
- [ ] **Planos / Assinaturas** — `plan`, `subscription`, billing SaaS via Asaas, feature gating, storage limit

### 3.3 Aluguéis (subsistema grande)
- [ ] **Aluguéis** — `alugueis`, `aluguelService`, `clienteAluguel`, `cobrancaaluguel`, `reguacobranca`, `reguaCobrancaService`
- [ ] **Contratos** — `contratoRoutes`, `contratoAluguel`, `contratoService`
- [ ] **Proprietários** — `proprietarios`, `Proprietario`
- [ ] **Portal do inquilino** — `portalInquilino`, `scoreInquilinoService`
- [ ] **Vistorias / Chamados** — `vistoriaRoutes`, `vistoriaaluguel`, `chamadoRoutes`, `chamadomanutencao`
- [ ] **Dashboard aluguel** — `dashboardAluguel`

### 3.4 Vendas / Operacional
- [ ] **Simulações / Visitas / Propostas** — `simulacaoRoutes`, `visitaRoutes`, `propostaRoutes`
- [ ] **Laudos** — `laudos`, `Laudo`, upload
- [ ] **Timeline / Notificações** — `timelineRoutes`, `notificacaoRoutes` (emitem via WebSocket)
- [ ] **Dashboards / Relatórios** — `dashboardRoutes`, `reportRoutes`, `dashboardService`
- [ ] **Configurações** — `configurations`, `SystemConfig`, `tenantSettingsRoutes`

### 3.5 SaaS / Super Admin
- [ ] **Tenant** — `tenantRoutes` (públicas: signup/onboarding), `tenantSettingsRoutes`
- [ ] **Super Admin** — `superAdminRoutes`, gestão de tenants/planos, `X-Tenant-Id`

## 4. Integrações (partes frágeis)

- [ ] **WhatsApp (Baileys → whatsmeow)**: QR pairing, persistência de sessão (`WhatsappSession` model + arquivos), envio de mensagens, reconexão (limite/backoff), eventos por tenant via WS. Ver `baileysAuthStateAdapter`, `whatsappFileSessionManager`, `whatsappSessionService`
- [ ] **WebSocket nativo**: hub com salas por tenant (`whatsapp:{tenantId}`), substituir `socket.js`/`getSocketIO()` por hub Go; frontend troca `socket.io-client` por WS nativo (coordenar)
- [ ] **PDF** (`pdfService.js` 44KB): geração + conversão imagem (docs de cliente). Go: `chromedp`/Gotenberg (HTML→PDF) ou `pdfcpu`/`gofpdf`. Definir estratégia
- [ ] **Email** (`emailService.js`): SMTP/Nodemailer → `gomail`/net/smtp
- [ ] **Storage** (`storageService.js`): uploads em `backend/uploads/` por tipo/role, cálculo de uso por tenant, storage limit
- [ ] **Jobs/Cron** (`jobs/enviarParcelas.js`, `cronJobs.js`): `robfig/cron` — envio de parcelas, régua de cobrança
- [ ] **Gemini (IA)**: análise de cliente/score — SDK Go ou HTTP

## 5. Uploads estáticos (server.js tem lógica pesada)

- [ ] Servir `/api/uploads/*` com busca por múltiplos diretórios + fallback recursivo
- [ ] Regra de segurança: docs de `clientes/` só por caminho exato (nunca busca genérica)
- [ ] Headers anti-cache para PDF, ETag por mtime
- [ ] Rotina de organização/normalização de diretórios na inicialização

## 6. Corte final (cutover)

- [ ] Paridade de contrato de API validada (mesmos paths, payloads, status codes) — frontend não muda
- [ ] Testes de integração por domínio
- [ ] nginx: mover rotas do Node → Go gradualmente; por fim desligar o Node (exceto se sobrar sidecar)
- [ ] Observabilidade: logs estruturados, métricas, health

---

## Arquitetura Go alvo (proposta)

```
backend-go/
  cmd/api/main.go              # entrypoint: config, db, router, ws hub, jobs, shutdown
  internal/
    config/                    # env, flags
    database/                  # GORM + pgx, pool
    server/                    # router Gin, montagem de rotas (espelha routes/index.js)
    middleware/                # auth, tenant, ratelimit, recover, logger, cors, featuregate, storagelimit
    tenant/                    # contexto de tenant (context.Context) + GORM scopes globais
    modules/
      auth/  users/  tenants/  plans/  clientes/  imoveis/
      pagamentos/  financeiro/  alugueis/  contratos/  proprietarios/
      vistorias/  chamados/  dashboards/  relatorios/  notificacoes/
      simulacoes/  visitas/  propostas/  laudos/  notas/  configuracoes/
      # cada módulo: handler.go (HTTP) | service.go (regras) | repository.go (GORM) | dto.go | model.go
    integrations/
      asaas/                   # pagamentos (substitui mercadopago)
      whatsapp/                # whatsmeow + session store
      pdf/  email/  storage/  ai/
    ws/                        # hub WebSocket nativo, salas por tenant
    jobs/                      # cron (parcelas, régua de cobrança)
  migrations/                  # golang-migrate (ou compartilhar com Node)
  pkg/                         # utils compartilháveis
```

**Stack recomendada:** Gin + GORM (pgx) + gorilla/websocket + whatsmeow + robfig/cron + zerolog + golang-migrate.
Padrão por módulo: `handler → service → repository` (Clean-ish), DTOs explícitos, sem lógica na rota.

---

## Especificações detalhadas por domínio

Os agentes de inventário produzem specs precisos (endpoints, payloads, regras, tabelas) em
`backend-go/docs/migration/`. Ver os arquivos `NN-*.md` gerados.
