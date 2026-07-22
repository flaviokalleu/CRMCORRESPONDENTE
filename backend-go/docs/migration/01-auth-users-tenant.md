# 01 — Fundação: Autenticação, Usuários, Multi-tenancy e SaaS/Billing

> Especificação de migração **Node.js/Express + Sequelize/PostgreSQL → Go (Gin + GORM)**.
> Cluster **Fundação**. Este documento é o inventário *grounded* no código real de `backend/src`.
> Não contém código Go de produção — apenas o mapa preciso do comportamento atual e a receita de replicação.

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Endpoints (tabelas)](#2-endpoints-tabelas)
3. [Modelos & tabelas](#3-modelos--tabelas)
4. [Auth flow (JWT 1h + refresh 7d contra `tokens`)](#4-auth-flow)
5. [Tenant isolation (replicação em Go)](#5-tenant-isolation--replicação-em-go)
6. [Feature gating & storage](#6-feature-gating--storage)
7. [Gotchas](#7-gotchas)
8. [Layout Go proposto](#8-layout-go-proposto)

---

## 1. Visão geral

O cluster Fundação cobre tudo que sustenta o resto do sistema:

- **Autenticação** — login/logout/refresh/validate/check-auth, JWT de acesso (1h) + refresh (7d), com **dupla verificação** (assinatura JWT **e** existência do registro na tabela `tokens`).
- **Usuários** — CRUD de `users` com três flags de papel booleanas (`is_administrador`, `is_corretor`, `is_correspondente`) que coexistem, mais a flag SaaS `is_super_admin`. Rotas separadas legadas por papel: `/api/corretor`, `/api/correspondente`, `/api/admin`, `/api/user`, `/api/listadecorretores`.
- **Multi-tenancy** — cada linha das tabelas de negócio carrega `tenant_id`. Isolamento **automático** via `AsyncLocalStorage` + hooks Sequelize (`beforeFind/beforeCount/beforeCreate/beforeBulkCreate/beforeUpdate/beforeDestroy`). Super admin pode furar o escopo via header `X-Tenant-Id`.
- **SaaS/Billing** — `tenants`, `plans`, `subscriptions`. Onboarding público (`/api/tenant/register`), painel super admin (`/api/super-admin/*`), self-service settings (`/api/tenant-settings/*`), feature gating e storage limit por plano com override por tenant (padrão "Evoticket").

### Estado de inconsistência importante (existem TRÊS implementações de auth)

Há **três** middlewares/serviços de autenticação divergentes coexistindo. A migração deve **unificar** num único pacote `internal/auth`.

| Arquivo | Secret usado | Verifica `tokens`? | Popula `req.user` | Usado por |
|---|---|---|---|---|
| `middleware/authenticateToken.js` | `JWT_SECRET_KEY \|\| ACCESS_TOKEN_SECRET \|\| SECRET_KEY` | Sim (`expires_at`) | `{id,email,role,tenant_id,is_super_admin, ...userData}` | **server.js** (o global passado a `mountRoutes`), `tenantRoutes.js` |
| `middleware/authMiddleware.js` | `JWT_SECRET_KEY` (throw se ausente) | Sim (só existência, **não** checa expiração) | `req.user = user` (payload JWT cru) | `userRoutes.js`, `corretorRoutes.js`, `correspondente.js` |
| `routes/authRoutes.js` (exporta `authenticateToken`) | `JWT_SECRET_KEY \|\| 'your_jwt_secret_key'` | Sim (`expires_at`) | `{...decoded, ...user.toJSON()}` | `protectedRoutes.js`, `adminRoutes.js` |

Além disso, `services/authService.js` + `controllers/authController2.js` são uma **quarta** implementação (usa coluna `type` na tabela `tokens` — `access`/`refresh` — que **não existe** no model `token.js`; usa `foto` em vez de `photo`). **Está definida mas NÃO montada em `routes/index.js`** — é código morto/experimental. Documentada aqui para não ser reintroduzida por engano.

### Ordem de montagem (server.js → routes/index.js)

Middlewares globais relevantes, na ordem:

1. `app.use('/api', ...)` (server.js ~437) — para paths **não** públicos (`/auth`,`/tenant`,`/health`,`/uploads`,`/webhook`), se `req.user.tenant_id` existe, seta `req.tenantId`/`req.isSuperAdmin` e aplica `X-Tenant-Id` para super admin. **OBS:** neste ponto `req.user` normalmente ainda é `undefined` (auth roda por rota, depois), então este bloco raramente dispara — o preenchimento real acontece em `resolveTenant`.
2. `app.use(tenantContextMiddleware)` (server.js ~453) — **abre o `AsyncLocalStorage.run({tenantId, isSuperAdmin})`** para cada request. Este é o ponto que ativa os hooks.
3. `mountRoutes(app, { authenticateToken, resolveTenant, checkSubscription, getPlanUsage })`.

`authenticateToken` injetado é o de `middleware/authenticateToken.js`.

---

## 2. Endpoints (tabelas)

Legenda de middlewares: **auth** = autenticação Bearer; **rt** = `resolveTenant`; **cs** = `checkSubscription`; **sa** = `requireSuperAdmin`; **gate** = feature/limit gate. Prefixos conforme `routes/index.js`.

### 2.1 `/api/auth` — `authRoutes.js` (montado SEM auth global; auth é por rota)

Rota-level: um middleware de parsing JSON/urlencoded (50mb) roda antes, exceto multipart. `loginLimiter` = 10 req / 15 min por IP no `/login`.

| Método | Path | Middlewares | Role | Entrada | Resposta (200) | Status | Regra |
|---|---|---|---|---|---|---|---|
| POST | `/api/auth/login` | loginLimiter, validateLogin | pública | body `{email,password}` | `{token, refreshToken, user:{id,email,role,first_name,last_name,is_corretor,is_correspondente,is_administrador,tenant_id,is_super_admin}}` | 200/400/401/500 | Busca user por email; `bcrypt.compare`; role = 1ª flag verdadeira; **destrói todos tokens do user** e cria 1 registro em `tokens` (token acesso + refresh, `expires_at`=+60min). Fallback: se create falha, destrói por `user_id/token/refresh_token` e recria. |
| POST | `/api/auth/refresh-token` | — | pública | body `{refreshToken}` | `{token}` | 200/401/403/500 | Acha `tokens` por `refresh_token`; se ausente ou `expires_at`<now → 403; `jwt.verify` com `REFRESH_SECRET_KEY`; gera novo access token; `UPDATE tokens SET token, expires_at=+60min`. |
| POST | `/api/auth/validate-token` | auth (local) | autenticado | header Bearer | `{valid:true, user:{id,email,role}}` | 200/401/403 | Valida token. |
| GET | `/api/auth/me` | auth (local) | autenticado | header Bearer | `{user, type, role, tenant_id, is_super_admin}` (sem password) | 200/404/500 | Perfil do user logado. `role` = lowercase. |
| GET | `/api/auth/check-auth` | — (faz tudo inline) | pública/autenticado | header Bearer | `{authenticated:true, user, type, role, token, expiresAt, tenant_id, is_super_admin}` | 200/401/404/500 | Verifica `tokens` (com include User), expiração (deleta se expirado), `jwt.verify` (deleta se inválido), busca user (deleta se inexistente), **estende `expires_at` +60min** (sliding). |
| GET | `/api/auth/users/:email` | auth (local) | próprio ou admin | param email | user (sem password) | 200/403/404/500 | Só o próprio email ou `is_administrador`. |
| PUT | `/api/auth/users/:email` | auth (local), multer `photo` | próprio ou admin | multipart: campos + `photo` | `{message, photo?}` | 200/403/404/500 | Atualiza `...req.body`; se `password` → bcrypt hash (salt 10); foto salva em pasta por papel. |
| POST | `/api/auth/logout` | auth (local) | autenticado | header Bearer | `{message}` | 200/500 | `DELETE FROM tokens WHERE token=?`. |
| GET | `/api/auth/test` | — | pública | — | `{message,timestamp,uploadDir}` | 200 | Debug. |

**Multer (auth):** disco, pasta por papel do `req.user` (`imagem_administrador`/`imagem_correspondente`/`corretor`/`imagem_user`), nome `${timestamp}_${sanitized}${ext}`, só `image/*`, limite 10MB.

### 2.2 `/api/tenant` — `tenantRoutes.js` (público, auth manual inline em change-plan)

| Método | Path | Middlewares | Role | Entrada | Resposta | Status | Regra |
|---|---|---|---|---|---|---|---|
| GET | `/api/tenant/plans` | — | pública | — | `Plan[]` (exclui `features_extras`) `where ativo=true order by ordem` | 200/500 | Lista planos p/ pricing. |
| GET | `/api/tenant/check-slug/:slug` | — | pública | param slug | `{available:boolean}` | 200/500 | Slug livre? |
| POST | `/api/tenant/register` | — (transação) | pública | body `{empresa{nome,slug,cnpj,email,telefone}, admin{first_name,last_name,email,password,telefone}, plan_id\|plan_slug}` (+ aliases legados `empresa_*`/`admin_*`) | 201 `{message, token, refreshToken, tenant, user, subscription}` | 201/400/409/500 | Onboarding transacional: valida (slug regex `^[a-z0-9-]+$`, senha ≥6), checa duplicatas (slug/email empresa/email admin), cria `tenant` + `user` admin (bcrypt 10) + `subscription` (status `trialing` se `plan.trial_dias>0` senão `active`; plano default `slug='free'`). Commit → gera tokens + grava `tokens` → login automático. |
| POST | `/api/tenant/change-plan` | auth inline (jwt.verify) | admin do tenant | header Bearer, body `{planId}` | `{message, plan}` | 200/400/401/403/404/500 | Só `is_administrador`; `UPDATE subscription SET plan_id, status='active'`. |

### 2.3 `/api/super-admin` — `superAdminRoutes.js` (auth + rt globais + `requireSuperAdmin`)

Montado como `app.use('/api/super-admin', authenticateToken, resolveTenant, superAdminRoutes)`; router aplica `requireSuperAdmin` em tudo. **Role: `is_super_admin=true` obrigatório (senão 403).**

| Método | Path | Entrada | Resposta | Regra |
|---|---|---|---|---|
| GET | `/tenants` | query `{page=1,limit=20,search,ativo}` | `{tenants:[{...tenant, stats:{clientes,usuarios,imoveis}}], total, page, totalPages}` | Lista paginada com busca `iLike` em nome/email/cnpj + última subscription+plan. |
| GET | `/tenants/:id` | param id | `{...tenant, stats:{clientes,usuarios,imoveis,alugueis}, admin_user}` ou 404 | Detalhes + todas subscriptions + admin. |
| POST | `/tenants` | body `{nome,slug,cnpj,email,telefone,plan_id,admin_first_name,admin_last_name,admin_email,admin_password,admin_telefone}` | 201 tenant | Normaliza; valida obrigatórios + senha≥6; checa slug/email admin únicos; cria tenant+admin(bcrypt 10)+subscription opcional. |
| PUT | `/tenants/:id` | body campos permitidos + `admin_*` | tenant detalhado ou 404 | `ALLOWED_UPDATE_FIELDS` (dados+limites+storage+módulos). Se `use_custom_modules=false` → zera overrides de módulos (=null). Atualiza/cria admin. |
| GET | `/tenants/:id/modules` | param id | `{tenant_id,use_custom_modules,plan,modules,limits,storage}` c/ `{value,source:'tenant'|'plan'|'none'}` | Resolve herança efetiva. |
| PATCH | `/tenants/:id/toggle-status` | param id | `{message, ativo}` | Inverte `tenant.ativo`. |
| POST | `/tenants/:id/impersonate` | param id | `{message, tenant, admin, instrucao}` | Retorna instrução p/ usar `X-Tenant-Id` (NÃO gera token). |
| GET | `/tenants/:id/users` | param id | `User[]` (sem password) | Usuários do tenant. |
| GET | `/plans` | — | `Plan[]` order by ordem | — |
| POST | `/plans` | body plano | 201 plano | `Plan.create`. |
| PUT | `/plans/:id` | body | plano ou 404 | `plan.update`. |
| GET | `/subscriptions` | query `{status,tenant_id}` | `Subscription[]` + tenant + plan | — |
| PUT | `/subscriptions/:tenantId/change-plan` | body `{plan_id, ciclo}` | subscription | Cancela assinaturas ativas/trial (`status='canceled', cancelado_em=now`) + cria nova `active`; valor = anual/mensal. |
| GET | `/metrics` | — | `{tenants, financeiro:{mrr,arr,assinaturas_ativas,churn_mes}, planos, recursos}` | MRR = SUM(CASE ciclo mensal→valor ELSE valor/12) das `active`. |

### 2.4 `/api/tenant-settings` — `tenantSettingsRoutes.js` (auth + rt globais E router.use(auth,rt))

**Nota:** dupla aplicação de auth+rt (uma no mount em index.js com `middleware/authenticateToken`, outra no `router.use` com `middleware/authenticateToken`). Migrar para uma só.

| Método | Path | Role | Entrada | Resposta | Regra |
|---|---|---|---|---|---|
| GET | `/settings` | autenticado (tenant) | — | tenant `{id,nome,slug,cnpj,email,telefone,logo,configuracoes,endereco,cidade,estado,cep}` ou 404 | Dados do próprio tenant. |
| PUT | `/settings` | admin ou super_admin | body campos permitidos (`nome,cnpj,email,telefone,endereco,cidade,estado,cep,configuracoes` — **slug imutável**) | `{message, tenant}` | 403 se não admin. Valida (SequelizeValidationError→400). |
| POST | `/settings/logo` | admin ou super_admin | multipart `logo` (5MB, jpeg/png/webp/svg) | `{message, logo}` | Salva em `uploads/tenants/{tenantId}/logo_*`; remove antigo. |
| GET | `/settings/asaas` | autenticado | — | `{asaas_api_key_configured, asaas_api_key_preview:'****xxxxxx', asaas_webhook_token, webhook_url}` | Chave mascarada (últimos 6). |
| PUT | `/settings/asaas` | admin ou super_admin | body `{asaas_api_key, asaas_webhook_token}` | `{message, ..., teste_conexao}` | String vazia apaga (→null). Testa conexão se chave nova. |
| POST | `/settings/asaas/testar` | autenticado | body `{asaas_api_key?}` | resultado teste | Usa chave do body ou do tenant. |

### 2.5 `/api/plan-usage`, `/api/storage-usage`, `/api/storage-recalculate` (definidas inline em index.js)

| Método | Path | Middlewares | Resposta | Regra |
|---|---|---|---|---|
| GET | `/api/plan-usage` | auth, rt, cs, `getPlanUsage` | `{plano, uso:{clientes,usuarios,imoveis,alugueis:{atual,limite}}, features{...}, modulos_customizados, subscription}` | Se admin/super sem plano → "Ilimitado". `limite=0`→`'Ilimitado'`. |
| GET | `/api/storage-usage` | auth, rt | `{usado_mb,usado_bytes,limite_mb,limite_arquivo_mb,percentual,ilimitado,disponivel_mb}` | 400 se sem tenant. |
| POST | `/api/storage-recalculate` | auth, rt | `{message, tenant_id, bytes, mb}` | **Só super admin** (403 senão). Escaneia `uploads/` inteiro (ver Gotcha). |

### 2.6 `/api/user` — `userRoutes.js` (auth = `middleware/authMiddleware`, sem rt)

| Método | Path | Role | Entrada | Resposta | Regra |
|---|---|---|---|---|---|
| GET | `/api/user/me` | autenticado | — | `{user, type, role}` (sem password) | Busca por `req.user.email`. |
| GET | `/api/user/` | admin ou correspondente | — | `{success, users:[{...,type,role,roles[],displayName}], total, requestedBy}` | 403 se não admin/correspondente. Ordena admins→corresp→corretores. |
| GET | `/api/user/:id` | admin/corresp ou próprio | param id | `{success, user:{...,type,role,roles,displayName}}` | 403 se não admin/corresp e `id≠self`. |
| PUT | `/api/user/:id` | admin/corresp ou próprio | multipart `photo` + campos allow-list | `{success, message, user}` | Allow-list: `first_name,last_name,username,email,telefone,address,pix_account`. Foto → `usuario_{id}{ext}` em `uploads/usuario`. Emite socket `usuario-atualizado`. |

### 2.7 `/api/corretor` — `corretorRoutes.js` (montado com auth+rt globais; auth adicional local = authMiddleware)

**Uploads via `formidable`** (não multer). Pasta `uploads/corretor`.

| Método | Path | Auth | Entrada | Resposta | Regra |
|---|---|---|---|---|---|
| GET | `/api/corretor/me` | auth local | — | `{success, data:corretor}` | `where id=self, is_corretor=true`; attrs específicos. |
| POST | `/api/corretor/` | **nenhuma** (público!) | multipart (`photo` obrig.) `username,email,first_name,last_name,telefone,password,creci,address,pix_account` | 201 `{success, message, data}` | Valida; checa duplicata email/username; bcrypt 10; cria `is_corretor=true`; renomeia foto `corretor_{id}{ext}`; transação. |
| GET | `/api/corretor/` | auth local | query `{page=1,limit=10,search,all}` | paginado ou `{data,total,all:true}` | `iLike` em nome/email/username. |
| GET | `/api/corretor/:id` | auth local | param id | `{success, data}` ou 404 | — |
| PUT | `/api/corretor/:id` | auth local | multipart (formidable) | `{success, message, data}` | Update parcial; duplicata (exceto self); foto `corretor_{id}{ext}`; senha bcrypt 10. |
| DELETE | `/api/corretor/:id` | auth local | param id | `{success, message}` | Deleta user + foto. |

### 2.8 `/api/correspondente` — `correspondente.js` (SEM auth/rt globais)

**Uploads via `multer`+`sharp`** (redimensiona 800x800, converte webp q85). Pasta `uploads/imagem_correspondente`.

| Método | Path | Auth | Entrada | Resposta | Regra |
|---|---|---|---|---|---|
| GET | `/api/correspondente/me` | auth (authMiddleware) | — | `{success, data}` | `where id=self, is_correspondente=true`. |
| POST | `/api/correspondente/` | **nenhuma** | multipart `photo` obrig. + `username,email,first_name,last_name,address,pix_account,phone,password` | 201 `{success, message, data}` | Valida; duplicata; processa imagem→webp; bcrypt 12; `is_correspondente=true`; foto `correspondente_{id}{ext}`. |
| GET | `/api/correspondente/lista` | nenhuma | — | `User[]` (`is_correspondente=true`) | — |
| GET | `/api/correspondente/:id` | nenhuma | param id | `{success, data}` | — |
| PUT | `/api/correspondente/:id` | nenhuma | multipart | `{success, message, data}` | Update parcial; bcrypt 12; sharp. |
| DELETE | `/api/correspondente/:id` | nenhuma | param id | `{success, message}` | Deleta + foto. |
| GET | `/api/correspondente/debug/all` | nenhuma | — | debug | Remover na migração. |

### 2.9 `/api/admin` — `adminRoutes.js` (auth local = authRoutes.authenticateToken)

| Método | Path | Role | Entrada | Resposta | Regra |
|---|---|---|---|---|---|
| GET | `/api/admin/me` | admin | — | admin ou 404 | `where id=self, is_administrador=true`. |
| PUT | `/api/admin/me` | admin | multipart `avatar` + `{first_name,email,password}` | admin | bcrypt 10; salva `avatar` (campo **não existe** no model User → ver Gotcha). |

### 2.10 `/api/listadecorretores` — `listadecorretores.js` (SEM auth)

| Método | Path | Role | Resposta | Regra |
|---|---|---|---|---|
| GET | `/api/listadecorretores/` | **pública** | `User[]` (`is_corretor=true`) | Retorna **todos os campos, incluindo `password` hash** → ver Gotcha de segurança. |

### 2.11 `/api/protected` — `protectedRoutes.js`

| Método | Path | Role | Resposta | Regra |
|---|---|---|---|---|
| GET | `/api/protected/protected` | autenticado | `{message, keyExpiration}` | Smoke-test de auth. |

### 2.12 `/api/acessos` — `acessos.js` (SEM auth; log de acessos = `UserAccessLog`/`Acesso`)

| Método | Path | Role | Entrada | Resposta | Regra |
|---|---|---|---|---|---|
| POST | `/api/acessos/` | pública | body `{referer,userId,page}` | 201 `{message,id,timestamp}` | Registra acesso (geoip + device). Se page `/clientes/:id`, resolve userId do cliente. |
| GET | `/api/acessos/` | pública | query filtros | paginado c/ user | Filtros country/userId/deviceType/datas/search. |
| GET | `/api/acessos/stats` | pública | query `{period}` | métricas | Agregações por hora/página/dispositivo. |
| GET | `/api/acessos/realtime` | pública | — | `{usuariosOnline, acessosRecentes}` | Últimos 5 min. |
| GET | `/api/acessos/user/:userId` | pública | param+query | paginado + estatísticas | — |

> **Nota:** rotas de acessos são hoje públicas e globais (sem tenant). Na migração devem receber auth + tenant scope (tabela `acessos` **não** tem `tenant_id` hoje).

---

## 3. Modelos & tabelas

Colunas em snake_case (`underscored`). Timestamps `created_at`/`updated_at` salvo indicado.

### 3.1 `users` (model `User` — `user.js`)

| Coluna | Tipo | Notas |
|---|---|---|
| id | INTEGER PK auto | |
| username | STRING | |
| first_name | STRING | |
| last_name | STRING | |
| email | STRING UNIQUE | |
| telefone | STRING | |
| password | STRING | bcrypt (salt 10 em geral, 12 em correspondente) |
| creci | STRING | registro corretor |
| address | STRING | |
| pix_account | STRING | |
| photo | STRING | nome do arquivo |
| is_corretor | BOOLEAN default false | |
| is_administrador | BOOLEAN default false | |
| is_correspondente | BOOLEAN default false | |
| is_super_admin | BOOLEAN default false | SaaS |
| tenant_id | INTEGER FK→tenants.id nullable | **users É filtrado por tenant** (tem tenant_id e não está em GLOBAL_MODELS) |
| created_at / updated_at | DATE | |

Associações: `hasMany Cliente (user_id)`, `hasMany Nota (criado_por_id)`, `belongsTo Tenant (tenant_id)`.
Método: `verifyPassword(pw)` → `bcrypt.compare`.
Campos referenciados por rotas mas **inexistentes** no model: `avatar` (adminRoutes), `foto`/`type` (authService — dead code).

### 3.2 `tokens` (model `Token` — `token.js`, `timestamps:false`)

| Coluna | Tipo | Notas |
|---|---|---|
| id | INTEGER PK auto | |
| token | TEXT NOT NULL UNIQUE (`tokens_token_unique`) | access JWT |
| refresh_token | TEXT nullable UNIQUE (`tokens_refresh_token_unique`) | refresh JWT |
| user_id | INTEGER NOT NULL FK→users.id | |
| user_type | STRING(50) nullable | role no login (`Administrador` etc) |
| expires_at | DATE NOT NULL | usado p/ validação (sliding +60min) |
| email | STRING(255) NOT NULL | |
| created_at / updated_at | DATE NOT NULL default NOW | manuais |

Índices: unique(token), unique(refresh_token), user_id, email, expires_at. Assoc: `belongsTo User as user`. **Sem `tenant_id`** (mas não em GLOBAL_MODELS → hooks vão pular pois não tem coluna tenant_id).

### 3.3 `tenants` (model `Tenant` — `tenant.js`) — **GLOBAL (isento de scope)**

| Coluna | Tipo | Notas |
|---|---|---|
| id | INTEGER PK | |
| nome | STRING NOT NULL | |
| slug | STRING NOT NULL UNIQUE | regex `^[a-z0-9-]+$` |
| cnpj | STRING(18) nullable UNIQUE | |
| email | STRING NOT NULL | isEmail |
| telefone | STRING | |
| logo | STRING | path relativo |
| ativo | BOOLEAN default true | inativo→403 no resolveTenant |
| configuracoes | JSONB default {} | cores/prefs |
| dominio_customizado | STRING nullable UNIQUE | |
| endereco/cidade | STRING | |
| estado | STRING(2) | |
| cep | STRING(10) | |
| use_custom_modules | BOOLEAN default false | Evoticket: true→usa flags tenant |
| max_clientes/max_usuarios/max_imoveis/max_alugueis | INTEGER nullable | override plano (NULL=herda, 0=ilimitado) |
| has_whatsapp/has_pagamentos/has_ai_analysis/has_relatorios_avancados/has_multi_usuarios/has_api_access/has_suporte_prioritario/has_dominio_customizado | BOOLEAN nullable default null | override quando use_custom_modules |
| max_storage_mb | INTEGER nullable | NULL=herda, 0=ilimitado |
| max_file_size_mb | INTEGER nullable | |
| storage_used_bytes | BIGINT default 0 | uso atual |
| asaas_api_key | TEXT nullable | integração por tenant |
| asaas_webhook_token | STRING nullable | |
| created_at / updated_at | DATE | |

Assoc: hasMany User/Cliente/Imovel/Aluguel/Pagamento/Subscription (todos `tenant_id`).

### 3.4 `plans` (model `Plan` — `plan.js`) — **GLOBAL**

| Coluna | Tipo | Default |
|---|---|---|
| id | PK | |
| nome | STRING NOT NULL UNIQUE | |
| slug | STRING NOT NULL UNIQUE | (`free` é o fallback) |
| descricao | TEXT | |
| preco_mensal / preco_anual | DECIMAL(10,2) NOT NULL | 0 |
| max_clientes | INTEGER | 50 (0=ilimitado) |
| max_usuarios | INTEGER | 2 |
| max_imoveis | INTEGER | 20 |
| max_alugueis | INTEGER | 10 |
| has_* (8 flags) | BOOLEAN | false |
| max_storage_mb | INTEGER | 500 |
| max_file_size_mb | INTEGER | 10 |
| features_extras | JSONB | {} |
| ativo | BOOLEAN | true |
| ordem | INTEGER | 0 |
| trial_dias | INTEGER | 0 |
| created_at / updated_at | DATE | |

Assoc: hasMany Subscription (plan_id).

### 3.5 `subscriptions` (model `Subscription` — `subscription.js`) — **GLOBAL**

| Coluna | Tipo | Notas |
|---|---|---|
| id | PK | |
| tenant_id | INTEGER NOT NULL FK | |
| plan_id | INTEGER NOT NULL FK | |
| status | ENUM('trialing','active','past_due','canceled','suspended') default trialing | |
| ciclo | ENUM('mensal','anual') default mensal | |
| data_inicio | DATE NOT NULL default NOW | |
| data_fim | DATE nullable | fim assinatura |
| data_fim_trial | DATE nullable | fim trial |
| valor | DECIMAL(10,2) | |
| gateway_subscription_id / gateway_customer_id / gateway | STRING | asaas/mercadopago/stripe |
| proximo_pagamento | DATE | |
| tentativas_cobranca | INTEGER default 0 | |
| cancelado_em | DATE | |
| motivo_cancelamento | TEXT | |
| metadata | JSONB default {} | |
| created_at / updated_at | DATE | |

Métodos de instância (replicar em Go como métodos do struct):
- `isActive()` → status ∈ {active,trialing} **e** (data_fim nula ou > now).
- `isTrialing()` → status=trialing **e** data_fim_trial ≥ now.
- `daysRemaining()` → ceil((data_fim||data_fim_trial − now)/dia), min 0, null se sem data.

### 3.6 `acessos` (model `Acesso` — `acesso.js`, `timestamps:false`)

`ip`(NOT NULL), `referer`, `user_agent`, `device_type`, `page`, `geo_city/geo_region/geo_country/geo_timezone`, `geo_coordinates`(TEXT), `timestamp`(default NOW), `user_id` FK nullable. **Sem tenant_id.** Assoc `belongsTo User`.

### 3.7 `UserAccessLog` (model — `useraccesslog.js`)

**camelCase, timestamps default.** Campos: `userId`, `timestamp`, `ip_address`, `location`, `action`(TEXT), `reference_page`, `session_data`(TEXT), `referer_url`, `http_method`, `request_params/body/headers`(TEXT), `browser_info/device_info/os_info`(TEXT). Sem tableName explícito (→ `UserAccessLogs`). **Não usado nas rotas do cluster** — presente por completude. Provavelmente redundante com `Acesso`.

### 3.8 `system_configs` (model `SystemConfig` — `SystemConfig.js`, `underscored`)

`nome_sistema`(default 'Parnassá CRM'), `cor_primaria`(#003366), `cor_secundaria`(#ff7b00), `cor_texto`(#ffffff), `logo_url`, `tema_escuro`(bool true). Config global de branding (single-row esperado). Sem tenant_id → global.

---

## 4. Auth flow

### 4.1 Geração de tokens (login / register / refresh)

Payload JWT (idêntico em access e refresh):
```
{ id, email, role, is_corretor, is_correspondente, is_administrador, tenant_id|null, is_super_admin }
```
- **access token**: `jwt.sign(payload, JWT_SECRET_KEY, {expiresIn:'1h'})`.
- **refresh token**: `jwt.sign(payload, JWT_REFRESH_SECRET_KEY, {expiresIn:'7d'})`.
- `role` derivada por prioridade de flag: **Administrador > Corretor > Correspondente > User** (função `getUserRole`). ⚠️ atenção: em `authRoutes.js` a ordem é admin→corretor→correspondente; em `authService.js` idem mas minúsculo. Padronizar.

No login (`authRoutes.js`):
1. `User.findOne({email})`; `bcrypt.compare`.
2. `Token.destroy({where:{user_id}})` — **1 sessão por usuário** (login novo invalida anteriores).
3. `Token.create({token, refresh_token, user_id, user_type:role, expires_at:+60min, email})`. `expires_at` reflete o **access** (1h), não o refresh (7d) — o refresh só é validado por `jwt.verify` + presença do registro.

### 4.2 Verificação (middleware) — DUPLA CHECAGEM

Para cada request autenticado:
1. Extrai `Bearer <token>` do header `Authorization` (401 se ausente).
2. **Registro:** `Token.findOne({where:{token}})`; se não existe **ou** `now > expires_at` → 401.
3. **Assinatura:** `jwt.verify(token, JWT_SECRET_KEY)`; erro → 403.
4. `User.findByPk(decoded.id)` → 404/401 se ausente.
5. `req.user = {...decoded, ...user.toJSON()}` (merge; `user.toJSON()` inclui `password` — filtrar na migração).

### 4.3 Refresh (`/api/auth/refresh-token`)
1. `Token.findOne({where:{refresh_token}})`; ausente/`expires_at`<now → 403.
2. `jwt.verify(refreshToken, JWT_REFRESH_SECRET_KEY)`.
3. Gera novo access token; `Token.update({token, expires_at:+60min} where refresh_token)`.

### 4.4 check-auth (sliding session)
Igual à verificação, porém **estende `expires_at` +60min** a cada chamada e faz cleanup destrutivo (deleta o registro em qualquer falha).

### 4.5 Env vars
`JWT_SECRET_KEY` (obrigatória; há fallbacks perigosos `'your_jwt_secret_key'` — **remover na migração**), `JWT_REFRESH_SECRET_KEY`. Aliases aceitos em alguns middlewares: `ACCESS_TOKEN_SECRET`, `SECRET_KEY`, `REFRESH_TOKEN_SECRET`. Unificar para `JWT_SECRET_KEY` + `JWT_REFRESH_SECRET_KEY`.

### 4.6 Replicação em Go

- `github.com/golang-jwt/jwt/v5` com `RegisteredClaims` + claims custom (struct `Claims{UserID, Email, Role string, IsAdmin, IsCorretor, IsCorrespondente bool, TenantID *uint, IsSuperAdmin bool}`).
- `golang.org/x/crypto/bcrypt` (`CompareHashAndPassword`, `GenerateFromPassword` cost 10; padronizar — hoje há 10 e 12 misturados, o bcrypt lê o cost do próprio hash então convivem, mas gerar sempre com um só cost).
- Middleware Gin `AuthRequired()`:
  1. lê header, valida `Bearer`;
  2. `tokenRepo.FindByToken(raw)` → checa `ExpiresAt`;
  3. `jwt.ParseWithClaims(raw, ..., keyFunc(JWT_SECRET))`;
  4. `userRepo.FindByID(claims.UserID)`;
  5. `c.Set("user", user)` / `c.Set("claims", claims)`.
- Rate limit login: `ulule/limiter` ou middleware próprio (10/15min por IP).
- **Uma sessão por user**: `tokenRepo.DeleteByUserID` antes de criar (dentro de transação).

---

## 5. Tenant isolation — replicação em Go

### 5.1 Como funciona hoje (Node)

**Contexto assíncrono:** `middleware/tenantScope.js` cria um `AsyncLocalStorage`. `tenantContextMiddleware` (global, server.js ~453) faz `tenantStorage.run({tenantId:null, isSuperAdmin:false}, next)` — abre um "store" por request. Depois, `resolveTenant` (por rota) chama `setCurrentTenant(tenantId, isSuperAdmin)` que **muta** o store aberto.

**Resolução do tenant (`resolveTenant`, tenantMiddleware.js):**
- Se `is_super_admin` ou `is_administrador`: `tenantId` = header `X-Tenant-Id` (se presente) ou `req.user.tenant_id`; `isSuperAdmin=req.user.is_super_admin`. Passa sem checar tenant.
- Senão: exige `req.user.tenant_id` (403 se não); `Tenant.findByPk`; 404 se não existe; **403 se `!tenant.ativo`**; seta `req.tenantId/req.tenant/req.isSuperAdmin=false`.
- Sempre chama `setCurrentTenant`.

**Hooks Sequelize (`setupTenantScopes`, roda 1x no boot):** para cada model que **(a)** não está em `GLOBAL_MODELS` e **(b)** tem `rawAttributes.tenant_id`:

| Hook | Comportamento |
|---|---|
| `beforeFind` (`tenantFilter`) | Se store tem `tenantId`, injeta `where.tenant_id = store.tenantId` (só se não houver filtro explícito). Super admin **sem** tenantId → sem filtro (vê tudo). |
| `beforeCount` (`tenantFilterCount`) | Idem para COUNT. |
| `beforeCreate` (`tenantInject`) | Se `!instance.tenant_id`, seta = store.tenantId. |
| `beforeBulkCreate` (`tenantInjectBulk`) | Idem para cada instance. |
| `beforeUpdate` (`tenantProtect`) | Bloqueia mudar tenant_id p/ outro tenant (throw). Super admin isento. |
| `beforeDestroy` (`tenantProtectDelete`) | Bloqueia deletar registro de outro tenant (throw). Super admin isento. |

**Models GLOBAIS (isentos de scope):**
```
Tenant, Plan, Subscription, SequelizeMeta, Estado, Municipio
```
Mais qualquer model **sem** coluna `tenant_id` (o hook checa `rawAttributes.tenant_id`; se não tem, pula) — ex.: `Token`, `Acesso`, `UserAccessLog`, `SystemConfig`. **`User` NÃO é global** → é escopado por tenant.

**Regras de super admin:**
- Com `X-Tenant-Id` → escopa naquele tenant (store.tenantId setado; hooks filtram normalmente).
- Sem `X-Tenant-Id` e sem tenant_id próprio → store.tenantId=null → hooks **não filtram** (acesso global). Note o guard `if (store.isSuperAdmin && !store.tenantId) return;` que reforça o bypass.

### 5.2 Replicação em Go (context.Context + GORM)

Go não tem AsyncLocalStorage, mas o modelo request-scoped se mapeia **1:1** para `context.Context` propagado do `*gin.Context` para o `*gorm.DB`.

**Passo 1 — tipo de contexto (`internal/tenant/context.go`):**
```
type TenantScope struct { TenantID *uint; IsSuperAdmin bool }
type ctxKey struct{}
func With(ctx, TenantScope) context.Context
func From(ctx) (TenantScope, bool)
```

**Passo 2 — middleware Gin (`internal/middleware/tenant.go`) — equivalente a resolveTenant:**
- Após auth, lê `user` do contexto.
- Resolve `tenantID`/`isSuperAdmin` (mesma lógica: admin/super usam `X-Tenant-Id` ou o próprio; demais exigem tenant ativo, 403/404).
- `ctx := tenant.With(c.Request.Context(), scope); c.Request = c.Request.WithContext(ctx)`.
- Guarda também em `c.Set` para os handlers.

**Passo 3 — GORM global callbacks (`internal/tenant/scope.go`) — equivalente aos hooks:**
Registrar callbacks no `*gorm.DB` que leem o scope de `db.Statement.Context`:
```
db.Callback().Query().Before("gorm:query").Register("tenant:filter", filterFn)
db.Callback().Row().Before("gorm:row").Register("tenant:filter_row", filterFn)
db.Callback().Create().Before("gorm:create").Register("tenant:inject", injectFn)
db.Callback().Update().Before("gorm:update").Register("tenant:protect_update", protectUpdateFn)
db.Callback().Delete().Before("gorm:delete").Register("tenant:protect_delete", protectDeleteFn)
```
- `filterFn`: se scope tem TenantID != nil e o schema do model tem campo `tenant_id` e o modelo **não** é global → `db.Statement.AddClause(clause.Where{...tenant_id = ?})`. (GORM cobre Find/First/Count/Take via callback de Query; para Count use o mesmo Query callback pois GORM roteia COUNT por lá.)
- `injectFn`: se campo `tenant_id` está zero, setá-lo via reflection no `db.Statement.ReflectValue`.
- `protectUpdate/Delete`: se não super admin, **forçar** cláusula `tenant_id = scope.TenantID` no WHERE (mais robusto que o throw do Node — impede o UPDATE/DELETE atravessar tenants em vez de só barrar instância carregada).

**Detecção "model tem tenant_id" + "é global":** manter um `set` de nomes/tabelas globais (`tenants, plans, subscriptions, migrations, estados, municipios`) e checar `db.Statement.Schema.LookUpField("tenant_id") != nil`. Preferir uma **interface marcadora** para clareza:
```
type TenantScoped interface { TenantColumn() string } // ou apenas campo TenantID uint
```
Models globais simplesmente não têm `TenantID` → callback é no-op.

**Padrão de uso recomendado (mais idiomático que callbacks mágicos):** repositórios recebem `ctx` e fazem `db.WithContext(ctx)`; os callbacks leem o scope do ctx. Isso reproduz o comportamento "transparente" do Node sem exigir que cada repo lembre de filtrar. Manter helpers explícitos `AddTenantFilter(ctx, q)` / `AddTenantToData(ctx, &m)` como escape hatches (equivalentes a `addTenantFilter`/`addTenantToData`).

**Lista de models a escopar em Go (têm tenant_id, não globais):** `User` e todos os models de negócio dos outros clusters (Cliente, Imovel, Aluguel, Pagamento, etc.). Deste cluster, **apenas `User`**.

**Lista de globais isentos:** `Tenant`, `Plan`, `Subscription`, `Migrations` (SequelizeMeta), `Estado`, `Municipio`, e (por não terem coluna) `Token`, `Acesso`, `UserAccessLog`, `SystemConfig`.

---

## 6. Feature gating & storage

### 6.1 Resolução de features/limites (padrão Evoticket)

`isFeatureEnabled(tenant, plan, feature)`:
- Se `tenant.use_custom_modules === true` **e** `tenant[feature]` não é null/undefined → usa valor do tenant.
- Senão → `plan[feature] || false`.

`getEffectiveLimit(tenant, plan, field)`:
- Limite do **tenant** sempre vence se definido (≠ null/undefined) — **independente** de `use_custom_modules`.
- Senão → `plan[field] || 0`.
- **`0` = ilimitado** (convenção em todo o sistema).

### 6.2 Middlewares (`featureGating.js`)

- `checkFeature(featureName)` → super admin bypass; sem `req.plan`→402 `NO_PLAN`; resolve tenant (usa `req.tenant` ou `Tenant.findByPk`); se feature off → **403** `FEATURE_NOT_AVAILABLE` `{feature, plano_atual, upgrade_necessario}`. Features válidas: `has_whatsapp, has_pagamentos, has_ai_analysis, has_relatorios_avancados, has_multi_usuarios, has_api_access, has_suporte_prioritario, has_dominio_customizado`.
- `checkLimit(resourceType)` → super admin bypass; sem plano→402; mapa `{clientes:max_clientes/Cliente, usuarios:max_usuarios/User, imoveis:max_imoveis/Imovel, alugueis:max_alugueis/Aluguel}`; `maxAllowed=getEffectiveLimit`; `0`→passa; `count where tenant_id`; se `>=maxAllowed` → **403** `LIMIT_REACHED` `{limite, atual, ...}`; senão seta `req.resourceUsage`. **Fail-open**: erro no count → `next()` (deixa passar).
- `getPlanUsage(req,res)` → handler de `/api/plan-usage`. Admin/super sem plano → tudo "Ilimitado" + todas features true. Senão retorna `uso` (counts vs limites efetivos, `0`→`'Ilimitado'`), `features` (resolvidas), `modulos_customizados`, `subscription{status,ciclo,dias_restantes}`.

`checkSubscription` (tenantMiddleware.js) roda **antes** de `getPlanUsage` no `/api/plan-usage`: super/admin bypass; busca `Subscription where tenant_id, status∈[active,trialing]` (com plan, order created_at DESC); ausente→**402** `SUBSCRIPTION_REQUIRED`; `!isActive()`→**402** `SUBSCRIPTION_EXPIRED`; seta `req.subscription`/`req.plan`.

### 6.3 Storage (`storageService.js` + `storageLimit.js`)

- `getStorageLimits(tenantId)` → tenant + última subscription active/trialing + plan; `maxStorageMb` = tenant override ?? plan ?? 500; `maxFileSizeMb` = tenant ?? plan ?? 10.
- `getStorageUsage` → `{usedBytes: tenant.storage_used_bytes, usedMb}`.
- `getStorageInfo` → `{usado_mb, usado_bytes, limite_mb, limite_arquivo_mb, percentual, ilimitado(=limite 0), disponivel_mb}`.
- `incrementStorage(tenantId, bytes)` → `Tenant.increment('storage_used_bytes', by:bytes)` (atômico).
- `decrementStorage` → `max(0, atual-bytes)` (não atômico — usar UPDATE atômico em Go).
- `recalculateStorage` → escaneia recursivamente `uploads/` **inteiro** (single-tenant hoje; ver Gotcha).
- Middleware `checkStorageLimit` (usar **antes** do multer): super bypass; sem tenant→passa; `maxStorageMb=0`→passa; se `usedBytes>=limiteBytes`→**413** `STORAGE_LIMIT_REACHED`; se `Content-Length>maxFileBytes`→**413** `FILE_TOO_LARGE`. **Fail-open** em erro.
- `trackStorageAfterUpload` (após multer, statusCode<400) → soma `req.files[].size` e `incrementStorage`.

### 6.4 Replicação em Go

- Serviço `PlanResolver` com `IsFeatureEnabled(tenant, plan, feature)` e `EffectiveLimit(tenant, plan, field)` (usar `*int`/`*bool` para distinguir "null herda" de "0 ilimitado" — **crítico**: mapear NULL→ponteiro nil, não 0).
- Middlewares Gin `RequireFeature("has_whatsapp")`, `RequireLimit("clientes")`, `RequireActiveSubscription()`. Manter os **códigos de erro string** (`NO_PLAN`, `FEATURE_NOT_AVAILABLE`, `LIMIT_REACHED`, `SUBSCRIPTION_REQUIRED`, `SUBSCRIPTION_EXPIRED`, `STORAGE_LIMIT_REACHED`, `FILE_TOO_LARGE`) e **status codes** (402/403/413) idênticos — o frontend depende deles.
- Storage: `increment` via `UpdateColumn("storage_used_bytes", gorm.Expr("storage_used_bytes + ?", bytes))`.

---

## 7. Gotchas

1. **Três/quatro implementações de auth divergentes** (§1). Unificar num pacote `internal/auth`. `authService.js`+`authController2.js` são dead code (referenciam coluna `type` inexistente em `tokens` e `foto`) — **não portar**.
2. **`expires_at` é do access token (1h)**, mas é usado para validar também o refresh em `/refresh-token` (`expires_at<now`→403). Como o registro é sempre reescrito com +60min, o refresh de 7d efetivamente **expira junto do access de 1h** salvo se `check-auth`/refresh forem chamados. Decidir na migração: separar `access_expires_at` / `refresh_expires_at`, ou manter comportamento.
3. **1 sessão por usuário**: login faz `Token.destroy({user_id})`. Multi-dispositivo não é suportado. Preservar ou mudar deliberadamente.
4. **`req.user` inclui `password`** (merge de `user.toJSON()`) em `authenticateToken.js` e `authRoutes.js`. Em Go, nunca colocar hash no contexto/claims.
5. **Rotas públicas que deveriam ser protegidas:** `POST /api/corretor/`, `POST/PUT/DELETE /api/correspondente/*`, `GET /api/listadecorretores/` (esta **retorna o hash de senha**!), `/api/acessos/*`. Corrigir na migração (auth + tenant scope).
6. **Fallbacks de secret hardcoded** (`'your_jwt_secret_key'`, `'chave_secreta_padrao'`). Em Go, **falhar no boot** se `JWT_SECRET_KEY` ausente.
7. **`recalculateStorage` escaneia `uploads/` inteiro** ignorando tenant (comentário admite "single-tenant por enquanto"). Multi-tenant real precisa de paths/prefixos por tenant. Storage é global-por-instalação hoje, não por tenant de fato — o `storage_used_bytes` por tenant só é confiável via increment/decrement, não via recalc.
8. **`checkLimit` e `checkStorageLimit` são fail-open** (erro → deixa passar). Replicar o mesmo comportamento tolerante OU decidir por fail-closed conscientemente.
9. **`adminRoutes` grava `admin.avatar`** — coluna inexistente no model `User` (só há `photo`). Provavelmente silenciosamente ignorado pelo Sequelize. Em GORM isso seria erro de compilação — usar `photo`.
10. **`X-Tenant-Id` só é honrado para super admin/admin.** Um admin comum (não super) também pode trocar de tenant via header no `resolveTenant` (`is_administrador` cai no mesmo ramo). Verificar se é intencional — potencial vazamento entre tenants para admin comum. Em Go, restringir o override a `is_super_admin` apenas (recomendado).
11. **`resolveTenant` não checa subscription/feature** — são camadas separadas. A maioria das rotas de negócio tem apenas auth+rt, **sem** `checkSubscription` nem gates. Ou seja, o paywall é aplicado de forma **esparsa** (só `/api/plan-usage` e onde `checkFeature/checkLimit` forem explicitamente adicionados — hoje quase nenhum). Mapear cluster a cluster onde gates devem entrar.
12. **`tenantSettingsRoutes` aplica auth+rt duas vezes** (mount + router.use). Idempotente mas redundante.
13. **Prioridade de role** difere sutilmente entre helpers (`getUserRole`). Padronizar: Administrador > Corretor > Correspondente > User.
14. **Onboarding (`/tenant/register`) depende de um plano `slug='free'`** existir como fallback. Garantir seed do plano free na migração (senão `plan.id` quebra).
15. **`beforeUpdate/beforeDestroy` do Node barram por instância carregada** (só protege quando você deu `.findByPk().update()`). Um `Model.update(data, {where})` em massa **não** dispara `beforeUpdate` de instância — logo o scope de update em massa hoje é frágil. Em Go, prefira **sempre injetar `tenant_id` no WHERE** (mais seguro que o original).
16. **`bcrypt` cost inconsistente** (10 em auth/corretor/admin, 12 em correspondente). Hashes convivem (cost embutido), mas padronizar geração.

---

## 8. Layout Go proposto

```
internal/
  auth/                         # unifica as 3-4 implementações Node de auth
    handler.go                  # login, logout, refresh, validate, checkAuth, me
    service.go                  # gerar/validar JWT, rotação, 1-sessão-por-user
    repository.go               # tokens (FindByToken, FindByRefresh, DeleteByUserID, Create, TouchExpiry)
    dto.go                      # LoginRequest, LoginResponse, RefreshRequest, TokenPair, MeResponse
    model.go                    # Token (tabela tokens), Claims struct
    password.go                 # bcrypt helpers (cost único)
    middleware.go               # AuthRequired() Gin (dupla checagem: registro + assinatura)

  users/
    handler.go                  # /api/user CRUD, me, list (admin/correspondente)
    service.go                  # regras de papel, allow-list de update, foto
    repository.go               # User queries (scoped por tenant)
    dto.go                      # UserResponse (nunca expõe password), UpdateUserRequest
    model.go                    # User (flags is_*, tenant_id)

  corretores/                   # ex-corretorRoutes.js + listadecorretores.js
    handler.go                  # CRUD corretor, lista pública (REMOVER exposição de senha)
    service.go
    repository.go               # where is_corretor=true (+ tenant scope)
    dto.go
    # reusa users/model.go (User) — mesma tabela

  correspondentes/              # ex-correspondente.js
    handler.go                  # CRUD + upload+resize (sharp→ bild/imaging em Go)
    service.go
    repository.go
    dto.go

  admins/                       # ex-adminRoutes.js (me/update admin)
    handler.go
    service.go

  tenants/                      # onboarding público + settings self-service
    handler.go                  # register, check-slug, plans(public), change-plan, /settings/*, /settings/asaas/*
    service.go                  # createTenantWithAdminAndSubscription (transação), updateSettings
    repository.go
    dto.go                      # RegisterRequest (empresa/admin/plan + aliases legados), SettingsResponse
    model.go                    # Tenant (GLOBAL — sem tenant scope)

  billing/                      # plans + subscriptions + feature/limit resolution
    plan_handler.go             # (super-admin) list/create/update plans
    subscription_handler.go     # list subscriptions, change-plan
    service.go                  # PlanResolver: IsFeatureEnabled, EffectiveLimit, StorageLimits
    repository.go
    dto.go
    plan_model.go               # Plan (GLOBAL)
    subscription_model.go       # Subscription (GLOBAL) + IsActive/IsTrialing/DaysRemaining

  superadmin/                   # ex-superAdminController + tenantService (painel plataforma)
    handler.go                  # tenants CRUD, toggle-status, impersonate, users, modules, metrics
    service.go                  # getEffectiveModules, getMetrics(MRR/ARR/churn), listTenants+stats
    dto.go

  storage/
    handler.go                  # /api/storage-usage, /api/storage-recalculate
    service.go                  # GetLimits/GetUsage/GetInfo/Increment/Decrement/Recalculate
    middleware.go               # CheckStorageLimit (pré-upload), TrackStorageAfterUpload

  tenant/                       # infraestrutura de isolamento (equivalente a tenantScope.js)
    context.go                  # TenantScope, With(ctx)/From(ctx)
    scope.go                    # GORM callbacks (filter/inject/protect) + registro
    globals.go                  # set de tabelas globais isentas
    helpers.go                  # AddTenantFilter, AddTenantToData (escape hatches)

  middleware/
    auth.go                     # (re-export de auth.AuthRequired) ou fica em auth/
    tenant.go                   # ResolveTenant (equivalente resolveTenant): X-Tenant-Id, ativo, 402/403/404
    subscription.go             # RequireActiveSubscription (checkSubscription)
    feature_gate.go             # RequireFeature(name), RequireLimit(resource)
    ratelimit.go                # loginLimiter (10/15min por IP)
    access_log.go               # ex-accessLogger (Acesso) — opcional
    recovery.go / error.go      # errorHandler equivalente

  models/                       # (alternativa) structs GORM centralizados + migrations
  config/                       # env (JWT secrets obrigatórios, DB), fail-fast no boot
  server/
    router.go                   # equivalente a routes/index.js: monta grupos com middlewares na ordem correta
```

**Ordem de montagem no router Go (espelhar index.js):**
1. Global: recovery, CORS, request-id, `TenantContext` (abre scope vazio no ctx).
2. `/api/auth` → sem auth global (por rota).
3. `/api/tenant` → público (register/plans/check-slug), change-plan com auth inline.
4. `/api/super-admin` → `AuthRequired, ResolveTenant, RequireSuperAdmin`.
5. `/api/tenant-settings` → `AuthRequired, ResolveTenant`.
6. `/api/plan-usage` → `AuthRequired, ResolveTenant, RequireActiveSubscription, PlanUsageHandler`.
7. `/api/storage-usage|recalculate` → `AuthRequired, ResolveTenant`.
8. Demais grupos de negócio → `AuthRequired, ResolveTenant` (+ gates onde aplicável).

**Convenções obrigatórias na migração:**
- Nunca serializar `password` em nenhum DTO.
- `*int`/`*bool` (nulos) para limites/flags de tenant (distinguir "herda" de "0/false").
- Preservar status codes e `code` strings do JSON de erro (contrato do frontend).
- `tenant_id` sempre no WHERE de update/delete (não só barra instância).
- Secrets obrigatórios: falhar no boot se ausentes.
