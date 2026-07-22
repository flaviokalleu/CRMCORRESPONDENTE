# 06 — Dashboards, Relatórios, Vendas, Laudos e Configurações

> Especificação de migração Node.js/Express (Sequelize + PostgreSQL) → Go (Gin + GORM).
> Cluster: **Dashboards, Relatórios, Vendas (simulações/visitas/propostas), Laudos, Configurações**.
> Documento *grounded* no código real do backend (`backend/src`). NÃO contém código Go final — é o inventário/contrato para implementação.

---

## Visão geral

Este cluster reúne cinco domínios funcionais que hoje estão espalhados por vários arquivos de `routes/`, `services/`, `controllers/` e `models/`:

| Domínio | Mount base (`routes/index.js`) | Middleware no mount | Auth interno adicional | Arquivos-fonte |
|---|---|---|---|---|
| **Dashboards** | `/api/dashboard` | `authenticateToken`, `resolveTenant` | `authMiddleware` (dentro de `dashboardRoutes.js`) | `routes/dashboardRoutes.js`, `controllers/dashboardController.js`, `services/dashboardService.js` |
| **Relatórios** | `/api/report` | *(nenhum no mount)* | *(nenhum — rotas públicas!)* | `routes/reportRoutes.js` |
| **Simulações** | `/api/simulacoes` | *(nenhum no mount)* | `authenticateToken` por rota | `routes/simulacaoRoutes.js`, `models/simulacao.js` |
| **Visitas** | `/api/visitas` | *(nenhum no mount)* | `authenticateToken` por rota | `routes/visitaRoutes.js`, `models/visita.js` |
| **Propostas** | `/api/propostas` | *(nenhum no mount)* | `authenticateToken` por rota | `routes/propostaRoutes.js`, `models/proposta.js` |
| **Laudos** | `/api/laudos` | `authenticateToken`, `resolveTenant` | `authenticateToken` por rota (de `authRoutes`) | `routes/laudos.js`, `models/Laudo.js`, `middleware/upload.js` |
| **Configurações (sistema)** | `/api` (`configurations.js`) | *(nenhum)* | `authMiddleware` por rota | `routes/configurations.js`, `models/SystemConfig.js` |
| **Configurações (tenant)** | `/api/tenant-settings` | `authenticateToken`, `resolveTenant` | ambos re-aplicados internamente | `routes/tenantSettingsRoutes.js`, `models/tenant.js` |
| **Métricas Super Admin** | `/api/super-admin` | `authenticateToken`, `resolveTenant` | `requireSuperAdmin` | `routes/superAdminRoutes.js`, `controllers/superAdminController.js` (`getMetrics`) |
| **Resumo de chamados** (dashboard-like) | `/api` (`chamadoRoutes.js`) | *(nenhum)* | *(nenhum!)* | `routes/chamadoRoutes.js` (`GET /chamados/resumo`) |

### Observações críticas de segurança/tenant (transportar para o Go)

- **`/api/report/*` NÃO tem autenticação nenhuma** — qualquer requisição anônima gera o relatório completo de todos os clientes (inclui CPF, renda, e-mail). Na migração Go isto **deve** passar a exigir auth + escopo de tenant.
- **Dashboards não filtram por `tenant_id`.** O `dashboardService` filtra por `user_id` apenas para corretores puros (`is_corretor && !is_administrador && !is_correspondente`); administradores/correspondentes veem **todos os clientes de todos os tenants**. Isto é um vazamento multi-tenant a corrigir no Go.
- **Simulações/Visitas/Propostas gravam `tenant_id`** na criação, mas as listagens **não filtram por `tenant_id`** (só por `user_id` em algumas). Corrigir no Go: todo `WHERE` deve incluir `tenant_id`.
- **Laudos não têm `tenant_id`** no modelo — escopo é global + `user_id`. Migrar exige adicionar `tenant_id`.
- **Duplo `authMiddleware`** no dashboard: o mount aplica `authenticateToken`+`resolveTenant` e o router aplica `authMiddleware` de novo (redundante). No Go, um único middleware.
- `SystemConfig` (`models/SystemConfig.js`) está **definido mas não usado em rota alguma** (grep confirma zero uso fora do próprio model). O `configurations.js` devolve um objeto **hardcoded** (`{ theme: 'dark', language: 'pt-BR' }`), sem tocar no banco.

---

## Endpoints (tabelas)

### Dashboards — mount `/api/dashboard` (auth + resolveTenant + authMiddleware)

`req.user` vem do JWT (`authMiddleware`): usa `req.user.email` e `req.user.role`. Papéis esperados no JWT: `administrador`, `correspondente`, `corretor`.

| Método | Path completo | Role | Entrada | Resposta (200) | Regra de negócio |
|---|---|---|---|---|---|
| GET | `/api/dashboard/` | qualquer autenticado | — | objeto grande (ver abaixo) | Dashboard principal com métricas. Cache em memória 5 min por `email+role`. |
| GET | `/api/dashboard/monthly` | qualquer | — | `{ monthlyData[12], monthlyGrowth[12], totalYear, averageMonth, labels[12] }` | Clientes cadastrados por mês (últimos ~12 meses). |
| GET | `/api/dashboard/weekly` | qualquer | — | `{ weeklyData[7], previousWeekData[7], totalWeek, weeklyGrowth, labels[7] }` | Cadastros por dia da semana atual vs. anterior. |
| GET | `/api/dashboard/system-stats` | qualquer | — | `{ totalRegistros, totalUsuarios, atividadeRecente, usuariosRecentes, timestamp }` | Estatísticas globais (sem filtro de role/tenant). |
| GET | `/api/dashboard/activity-metrics` | qualquer | — | `{ clientesUltimas24h, clientesUltimos7d, weeklyGrowth, onlineUsers, efficiency }` | `onlineUsers` = users com `updated_at` nos últimos 30 min. |
| GET | `/api/dashboard/notifications` | qualquer | — | `{ notifications[], unreadCount }` | Notificações geradas dinamicamente (pendentes/novos/parados). |
| GET | `/api/dashboard/dashboard/aguardando-aprovacao` | qualquer | — | `Cliente[]` (`id, nome, status, created_at`) | **Path duplicado** por definição `/dashboard/...` dentro do router já montado em `/api/dashboard`. |

Resposta de `GET /api/dashboard/` (campos):
```
totalCorretores, totalClientes, totalCount, totalCorrespondentes,
totalClientesAguardandoAprovacao, clientesAguardandoAprovacao[],
userPermissions { canViewAll, isCorretor, isAdministrador, isCorrespondente },
clientesAprovados, clientesReprovados, clientesPendentes,
clientesEsteMes, clientesMesAnterior, crescimentoSemanal, crescimentoMensal,
usuariosAtivosHoje, clientesHoje, clientesSemana,
top5Usuarios [{ user{id,first_name,last_name,email}, clientes }],
performance { eficienciaMedia, taxaAprovacao, taxaRejeicao, totalUsuarios },
rendaAnalysis { rendaMedia, rendaMaxima, rendaMinima, clientesComRenda }
```
Todos os erros → `500 { message, error }`.

### Relatórios — mount `/api/report` (SEM AUTH hoje)

| Método | Path completo | Role | Entrada | Resposta | Regra de negócio |
|---|---|---|---|---|---|
| GET | `/api/report/relatorio` | **público (a corrigir)** | — | `text/html` (relatório completo) | Renderiza HTML analítico dos clientes. `404` HTML se não houver clientes. |
| GET | `/api/report/relatorio/download` | público | — | `application/pdf` (attachment) | Gera PDF via **Puppeteer** (`--no-sandbox`), A4, filename `relatorio-clientes-YYYY-MM-DD.pdf`. `404 {error}` se vazio; `500 {error}` em falha do Puppeteer. |
| GET | `/api/report/relatorio/dados` | público | — | `{ success, data: analytics, total, timestamp }` | JSON com toda a análise (para front consumir). |

Colunas de `Cliente` lidas: `id, nome, email, telefone, cpf, estado_civil, profissao, naturalidade, valor_renda, status, data_nascimento, data_admissao, renda_tipo, possui_carteira_mais_tres_anos, numero_pis, possui_dependente, created_at, updated_at` (+ `documentos_pessoais, extrato_bancario, documentos_dependente, documentos_conjuge` na análise de docs).

### Simulações — mount `/api/simulacoes` (authenticateToken por rota)

| Método | Path completo | Role | Entrada (body/query) | Resposta | Regra de negócio |
|---|---|---|---|---|---|
| POST | `/api/simulacoes/calcular` | autenticado | body: `valor_imovel, valor_entrada, prazo_meses, taxa_juros_anual, sistema?` | `200 { success, data{...} }` | Prévia **sem salvar**. `400` se faltar campo obrigatório ou `valor_financiado <= 0`. |
| POST | `/api/simulacoes` | autenticado | body: `cliente_id?, valor_imovel, valor_entrada, prazo_meses, taxa_juros_anual, sistema?, observacoes?` | `201 { success, data: Simulacao }` | Recalcula e **persiste** (grava `user_id`, `tenant_id`). |
| GET | `/api/simulacoes/cliente/:clienteId` | autenticado | — | `200 { success, data: Simulacao[] }` | Inclui `user{id,first_name,last_name}`. Ordena `created_at DESC`. |
| GET | `/api/simulacoes` | autenticado | query: `page=1, limit=20` | `200 { success, data, total, page, pageSize }` | Filtra `WHERE user_id = req.user.id`. Inclui `cliente`, `user`. |
| DELETE | `/api/simulacoes/:id` | autenticado (dono) | — | `200 { success, message }` | `WHERE id AND user_id`. `404` se não for do usuário. |

### Visitas — mount `/api/visitas` (authenticateToken por rota)

| Método | Path completo | Role | Entrada | Resposta | Regra de negócio |
|---|---|---|---|---|---|
| GET | `/api/visitas` | autenticado | query: `status?, corretor_id?, data_inicio?, data_fim?, page=1, limit=20` | `{ success, data, total, page, pageSize }` | Filtros dinâmicos; `data_visita` entre `data_inicio`/`data_fim`. Inclui `cliente, imovel, corretor`. Ordena `data_visita ASC`. |
| GET | `/api/visitas/cliente/:clienteId` | autenticado | — | `{ success, data: Visita[] }` | Inclui `imovel, corretor`. Ordena `data_visita DESC`. |
| POST | `/api/visitas` | autenticado | body: `cliente_id, imovel_id, corretor_id?, data_visita, observacoes?` | `201 { success, data }` | `400` sem `cliente_id/imovel_id/data_visita`. `corretor_id` default = `req.user.id`; grava `criado_por_id`, `tenant_id`. **Efeitos colaterais:** cria `Notificacao` + emite Socket.io `notification:{userId}`. |
| PUT | `/api/visitas/:id` | autenticado | body: `data_visita?, status?, observacoes?, feedback_cliente?, nota_avaliacao?` | `200 { success, data }` | Atualização parcial. `404` se não existe. `nota_avaliacao` 1–5. |
| DELETE | `/api/visitas/:id` | autenticado | — | `200 { success, message }` | `404` se não existe. Sem checagem de dono. |

### Propostas — mount `/api/propostas` (authenticateToken por rota)

| Método | Path completo | Role | Entrada | Resposta | Regra de negócio |
|---|---|---|---|---|---|
| GET | `/api/propostas` | autenticado | query: `status?, page=1, limit=20` | `{ success, data, total, page, pageSize }` | Inclui `cliente, imovel(+valor_venda), corretor`. Ordena `created_at DESC`. |
| GET | `/api/propostas/cliente/:clienteId` | autenticado | — | `{ success, data: Proposta[] }` | Inclui `imovel, corretor`. |
| POST | `/api/propostas` | autenticado | body: `cliente_id, imovel_id, valor_ofertado, forma_pagamento?, data_validade?, condicoes?, observacoes?` | `201 { success, data }` | `400` sem `cliente_id/imovel_id/valor_ofertado`. `forma_pagamento` default `financiamento`. Grava `corretor_id=req.user.id`, `tenant_id`. **Efeito:** cria `Notificacao`. |
| PUT | `/api/propostas/:id` | autenticado | body: `status?, valor_contra_proposta?, valor_aceito?, motivo_recusa?, observacoes?, condicoes?` | `200 { success, data }` | Atualização parcial (negociação). `404` se não existe. |
| DELETE | `/api/propostas/:id` | autenticado | — | `200 { success, message }` | `404` se não existe. Sem checagem de dono. |

### Laudos — mount `/api/laudos` (auth + resolveTenant no mount; `authenticateToken` de `authRoutes` por rota)

Upload via Multer (`uploadFields` de `middleware/upload.js`); arquivos salvos em `uploads/clientes/` e metadados em coluna `arquivos` (JSONB).

| Método | Path completo | Role | Entrada | Resposta | Regra de negócio |
|---|---|---|---|---|---|
| GET | `/api/laudos/` | autenticado | query: `page=1, limit=10, search?, parceiro?, tipo_imovel?, status='todos'` | `{ success, data[], pagination }` | Filtros: `search` iLike em `parceiro/endereco/observacoes`; `status` = `vencidos/vencendo/vigentes` (por `vencimento`). Adiciona `status` + `diasParaVencimento` calculados. Inclui `user`. |
| GET | `/api/laudos/:id` | autenticado | — | `{ success, data }` | `404` se não existe. Calcula status/dias. |
| POST | `/api/laudos/` | autenticado | multipart: `parceiro, tipo_imovel, valor_solicitado, valor_liberado?, vencimento, endereco, observacoes?` + arquivos | `201 { success, message, data }` | **Transação**. `400` valida obrigatórios, `tipo_imovel ∈ {casa,apartamento}`, valores numéricos, data válida. `cleanupAllTempFiles` no erro. Grava `user_id`. |
| PUT | `/api/laudos/:id` | admin **ou dono** | multipart parcial + `remover_arquivos?` | `200 { success, message, data }` | **Transação**. `403` se `role != 'Administrador'` e `user_id != req.user.id`. Remove arquivos do disco por categoria; anexa novos. |
| DELETE | `/api/laudos/:id` | admin **ou dono** | — | `200 { success, message }` | **Transação**. `403` mesma regra. Remove arquivos físicos associados. |
| GET | `/api/laudos/:id/arquivo/:categoria/:filename` | autenticado | — | download (`sendFile`) | `404` em cada nível (laudo/categoria/arquivo/arquivo-no-disco). Usa `originalname` no `Content-Disposition`. |
| GET | `/api/laudos/relatorios/estatisticas` | autenticado | — | `{ success, data{ resumo, laudosPorTipo, laudosPorParceiro, valores } }` | Agregações (ver seção de agregações). **NOTA:** ordem de rotas — `/relatorios/estatisticas` é declarada **depois** de `/:id`, mas como `/:id` casa `relatorios`? Não — `/:id/arquivo/...` tem mais segmentos; `/:id` casaria `GET /relatorios`? Sim casaria `GET /laudos/relatorios` se fosse esse path, mas o path real tem 2 segmentos (`relatorios/estatisticas`), então não conflita com `/:id`. Manter ordem no Go por segurança. |

### Configurações

| Método | Path completo | Role | Entrada | Resposta | Regra de negócio |
|---|---|---|---|---|---|
| GET | `/api/configurations` | autenticado (`authMiddleware`) | — | `{ theme:'dark', language:'pt-BR' }` | **Hardcoded**, não lê banco. `SystemConfig` existe mas é ignorado. |
| GET | `/api/tenant-settings/settings` | autenticado + tenant | — | dados do `Tenant` (subset) | Config do tenant (nome, cnpj, logo, configuracoes JSON, endereço...). |
| PUT | `/api/tenant-settings/settings` | **admin do tenant / super admin** | body: campos permitidos | `{ message, tenant }` | `403` se não `is_administrador`/`is_super_admin`. `slug` imutável. `400` em `SequelizeValidationError`. |
| POST | `/api/tenant-settings/settings/logo` | admin/super | multipart `logo` (JPEG/PNG/WebP/SVG, ≤5MB) | `{ message, logo }` | Remove logo antigo; salva em `uploads/tenants/{tenantId}/`. |
| GET | `/api/tenant-settings/settings/asaas` | autenticado + tenant | — | `{ asaas_api_key_configured, asaas_api_key_preview, asaas_webhook_token, webhook_url }` | Chave mascarada (`****` + últimos 6). |
| PUT | `/api/tenant-settings/settings/asaas` | admin/super | body: `asaas_api_key?, asaas_webhook_token?` | `{ message, ... , teste_conexao }` | Salva; string vazia apaga; testa conexão Asaas se chave enviada. |
| POST | `/api/tenant-settings/settings/asaas/testar` | autenticado + tenant | body: `asaas_api_key?` | resultado do teste | `400` se nenhuma chave. |
| GET | `/api/super-admin/metrics` | **super admin** | — | métricas SaaS (via `tenantService.getMetrics()`) | Dashboard global de tenants/planos. `requireSuperAdmin`. |
| GET | `/api/chamados/resumo` | **público (a corrigir)** | — | `{ total, abertos, em_andamento, resolvidos, urgentes }` | COUNTs de `ChamadoManutencao` por status/prioridade. Dashboard-like de manutenção. |

---

## Agregações de dashboard (SQL / Go)

> **GOTCHA CENTRAL:** `Cliente.valor_renda` é **VARCHAR**, não numérico. Toda agregação numérica exige `CAST("valor_renda" AS NUMERIC)`. Além disso o `WHERE` de renda exclui `NULL`, `''` e `'0'`. O `reportRoutes.js` faz o cast **em JS** (`parseFloat`), enquanto o `dashboardService.js` faz no **SQL** — no Go padronizar via SQL.

### `whereCondition` por role (a replicar no Go)
```
user := SELECT * FROM users WHERE email = req.user.email
where := {}
if user.is_corretor && !user.is_administrador && !user.is_correspondente {
    where.user_id = user.id      // corretor puro vê só os seus
}
// admin/correspondente => where vazio (vê todos)  <-- adicionar tenant_id no Go!
```

### Contadores (`getMainDashboard`)
| Métrica | Sequelize | SQL equivalente |
|---|---|---|
| totalCorretores | `User.count({where:{is_corretor:true}})` (ou `1` se role corretor) | `SELECT COUNT(*) FROM users WHERE is_corretor = true` |
| totalClientes | `Cliente.count()` / `Cliente.count({where:{user_id}})` | `SELECT COUNT(*) FROM clientes [WHERE user_id = ?]` |
| totalCorrespondentes | `User.count({where:{is_correspondente:true}})` | `SELECT COUNT(*) FROM users WHERE is_correspondente = true` |
| statusCounts | `findAll attributes:[status, COUNT(status)] group:[status]` | `SELECT status, COUNT(status) FROM clientes [WHERE ...] GROUP BY status` |

Buckets de status (case-insensitive, em JS): `includes('aprovado')` → aprovados; `includes('reprovado'|'rejeitado')` → reprovados; senão → pendentes.

### Aguardando aprovação (`getMainDashboard`)
```sql
SELECT id,nome,status,created_at,updated_at FROM clientes
WHERE [whereCondition] AND (
  status ILIKE '%aguardando%' OR status ILIKE '%pendente%' OR
  status ILIKE '%análise%'  OR status ILIKE '%em análise%' OR
  status = 'aguardando_aprovação')
ORDER BY created_at DESC
```

### Crescimento mensal / semanal
```sql
-- este mês vs mês anterior
COUNT(*) WHERE created_at >= inicioMes
COUNT(*) WHERE created_at >= inicioMesAnterior AND created_at < fimMesAnterior
-- crescimento = round((atual-anterior)/anterior*100), 100 se anterior=0 e atual>0
```

### Top 5 usuários do mês (apenas se role != corretor)
```sql
SELECT user_id, COUNT("Cliente"."id") AS clientes
FROM clientes
WHERE user_id IS NOT NULL AND created_at BETWEEN inicioMes AND fimMes
GROUP BY "Cliente"."user_id"
ORDER BY COUNT("Cliente"."id") DESC
LIMIT 5
-- depois faz N+1: User.findByPk por item (otimizar no Go com JOIN)
```

### Análise de renda — **CAST obrigatório**
```sql
SELECT
  AVG(CAST("valor_renda" AS NUMERIC)) AS "rendaMedia",
  MAX(CAST("valor_renda" AS NUMERIC)) AS "rendaMaxima",
  MIN(CAST("valor_renda" AS NUMERIC)) AS "rendaMinima",
  COUNT("valor_renda")                AS "clientesComRenda"
FROM clientes
WHERE [whereCondition]
  AND "valor_renda" IS NOT NULL AND "valor_renda" <> '' AND "valor_renda" <> '0'
```
> No Go/GORM: `db.Model(&Cliente{}).Select("AVG(CAST(valor_renda AS NUMERIC)) as renda_media, ...").Where("valor_renda IS NOT NULL AND valor_renda <> '' AND valor_renda <> '0'")`. **Cuidado:** valores com vírgula decimal ou texto quebram o CAST — considerar `NULLIF`/regex de validação ou `CAST(REPLACE(valor_renda, ',', '.') AS NUMERIC)`.

### Mensal (12 meses) — `getMonthlyData`
```sql
SELECT EXTRACT(MONTH FROM "created_at") AS month,
       EXTRACT(YEAR  FROM "created_at") AS year,
       COUNT(id) AS count
FROM clientes
WHERE [where] AND created_at >= (hoje - 1 ano até início do mês)
GROUP BY EXTRACT(YEAR ...), EXTRACT(MONTH ...)
ORDER BY year ASC, month ASC
```
Preenche array `[12]` (índice = mês-1) mesclando ano atual e anterior. Labels PT: `Jan..Dez`.

### Semanal — `getWeeklyData`
```sql
SELECT EXTRACT(DOW FROM "created_at") AS "dayOfWeek", COUNT(id) AS count
FROM clientes WHERE [where] AND created_at >= (hoje-7d)
GROUP BY EXTRACT(DOW ...) ORDER BY EXTRACT(DOW ...) ASC
```
DOW 0=Dom..6=Sáb. Repete para semana anterior (`-14d` a `-7d`). Labels: `Dom..Sáb`.

### System stats / Activity metrics
```sql
-- system-stats
COUNT clientes; COUNT users;
COUNT clientes WHERE created_at >= ontem;      -- atividadeRecente
COUNT users    WHERE updated_at >= ontem;      -- usuariosRecentes
-- activity-metrics
COUNT clientes WHERE created_at >= ontem;               -- 24h
COUNT clientes WHERE created_at >= (hoje-7d);           -- 7d
COUNT clientes WHERE created_at BETWEEN -14d AND -7d;   -- semana anterior
COUNT users    WHERE updated_at >= (hoje-30min);        -- onlineUsers
efficiency = round(totalClientes/totalUsuarios*100)
```

### Notificações dinâmicas — `getNotifications`
Três queries paralelas: pendentes (`status='aguardando_aprovacao'`, limit 10), novos de hoje (`created_at >= hoje`, limit 10), parados (`updated_at < hoje-30d`, limit 5). Retorna lista tipada `{ warning | info | alert }` + `unreadCount`.

### Laudos — `GET /laudos/relatorios/estatisticas`
```sql
COUNT(*)                                   -- totalLaudos
COUNT(*) WHERE vencimento < hoje           -- vencidos
COUNT(*) WHERE vencimento BETWEEN hoje AND +1mes  -- vencendo
COUNT(*) WHERE vencimento > +1mes          -- vigentes
SELECT tipo_imovel, COUNT(id)        GROUP BY tipo_imovel               -- por tipo
SELECT parceiro, COUNT(id), SUM(valor_solicitado), SUM(valor_liberado)
  GROUP BY parceiro ORDER BY COUNT(id) DESC                             -- por parceiro
SELECT SUM(valor_solicitado); SELECT SUM(valor_liberado)               -- totais
```
`valor_solicitado`/`valor_liberado` são `DECIMAL(15,2)` — SUM direto, **sem cast** (diferente de `valor_renda`).

### Chamados — `GET /chamados/resumo`
```sql
COUNT(*); COUNT WHERE status='aberto'; COUNT WHERE status='em_andamento';
COUNT WHERE status='resolvido';
COUNT WHERE prioridade='urgente' AND status IN ('aberto','em_andamento')
```

### Cache
`dashboardService` mantém cache em memória (objeto), TTL 5 min, chave `dashboard_{email}_{role}` — só em `getMainDashboard`. `invalidateCache()` exportado. No Go: usar cache in-process (ex.: `sync.Map` + TTL) ou Redis; invalidar em create/update/delete de `Cliente`.

---

## Simulações / Visitas / Propostas

### Simulações — cálculo de financiamento imobiliário (SAC e PRICE)

Lógica pura em `simulacaoRoutes.js` (mover para service Go). Ambos os sistemas usam **taxa mensal derivada da anual composta**:
```
taxaMensal = (1 + taxaAnual/100)^(1/12) − 1
valorFinanciado = valor_imovel − valor_entrada     // deve ser > 0
```

**SAC (amortização constante):**
```
amortizacao = valorFinanciado / prazoMeses          // fixa
para cada mês i:
  juros    = saldoDevedor * taxaMensal
  parcela  = amortizacao + juros                     // decrescente
  saldoDevedor -= amortizacao
```

**PRICE (parcela fixa):**
```
parcela = valorFinanciado * (i*(1+i)^n) / ((1+i)^n − 1)   // i=taxaMensal, n=prazo
para cada mês:
  juros       = saldoDevedor * taxaMensal
  amortizacao = parcela − juros
  saldoDevedor -= amortizacao
```

Saída de ambos: `parcelas[]` (`numero, parcela, amortizacao, juros, saldo_devedor`, arredondado 2 casas), `primeira_parcela`, `ultima_parcela`, `total_pago`, `total_juros`, `taxa_mensal` (4 casas). **Regra de renda mínima:** `renda_minima = round(primeira_parcela / 0.3)` (parcela ≤ 30% da renda). Default `sistema = 'SAC'`.

> No Go: implementar em `internal/modules/simulacoes/service.go` com `decimal` (shopspring/decimal) para evitar erro de float; expor `Calcular(input) Resultado` reusado por `/calcular` (preview) e `POST /` (persistência).

### Visitas
Agendamento com FK `cliente_id`, `imovel_id`, `corretor_id`, `criado_por_id`, `tenant_id`. Status enum `agendada|realizada|cancelada|reagendada`. Avaliação pós-visita: `feedback_cliente`, `nota_avaliacao` (1–5). Efeitos colaterais na criação: **Notificacao** + **Socket.io** (`io.emit('notification:{userId}')`). No Go, replicar via camada de eventos/notificações e hub de WebSocket.

### Propostas
Negociação imobiliária. `valor_ofertado` → `valor_contra_proposta` → `valor_aceito`. `forma_pagamento` enum `financiamento|a_vista|fgts|misto` (default `financiamento`). `status` enum `pendente|em_negociacao|aceita|recusada|expirada|cancelada`. `data_validade`, `motivo_recusa`, `condicoes`. Efeito na criação: cria **Notificacao** (sem Socket). Sem checagem de dono em PUT/DELETE (corrigir no Go: escopo tenant + corretor).

---

## Laudos

Laudo = avaliação/parecer de imóvel para um **parceiro** (banco/correspondente), com validade (`vencimento`) e valores solicitado/liberado.

- **Modelo** (`models/Laudo.js`, tabela `laudos`): `parceiro`(STRING 255, obrig.), `tipo_imovel`(ENUM `casa|apartamento`), `valor_solicitado`(DECIMAL 15,2, >0), `valor_liberado`(DECIMAL 15,2, ≥0, nullable), `vencimento`(DATE, obrig.), `endereco`(TEXT, obrig.), `observacoes`(TEXT), `arquivos`(**JSONB**), `user_id`(FK users). Timestamps `created_at`/`updated_at`. Índices: `parceiro, tipo_imovel, vencimento, user_id, created_at`. **Sem `tenant_id`** (adicionar na migração).
- **Métodos de instância** (portar como helpers Go): `getStatus()` → `vencido` (dias<0) / `vencendo` (≤30) / `vigente`; `getDiasParaVencimento()`; formatação BRL.
- **Upload:** `uploadFields` (Multer) — arquivos em `uploads/clientes/`. Metadados por categoria (fieldname) guardados no JSONB `arquivos`: `{ categoria: [{filename, originalname, path, size, mimetype}] }`. Remoção física ao deletar/editar (`remover_arquivos`). Uso de **transação** Sequelize em POST/PUT/DELETE + `cleanupAllTempFiles` para arquivos órfãos em falha.
- **Permissão** PUT/DELETE: `role === 'Administrador'` OU `laudo.user_id === req.user.id`.
- **Geração de relatório PDF de clientes** (não de laudo) fica em `reportRoutes.js` via Puppeteer (ver abaixo).

### Relatórios / exportação (reportRoutes.js)
- Formatos: **HTML** (`/relatorio`), **PDF** (`/relatorio/download`, Puppeteer headless A4), **JSON** (`/relatorio/dados`).
- Análises computadas em memória a partir de `Cliente[]`: `geral` (totais, taxas, renda média via `parseFloat`), `mcmv` (faixas Minha Casa Minha Vida), `perfil` (estado civil, profissão, naturalidade, tipo renda, idade, tempo emprego), `tendencias` (12 meses), `documentos`, `fgts`, `recomendacoes` (**Gemini `gemini-2.0-flash`**, com fallback estático).
- **Config MCMV** (faixas de renda): Faixa 1 `0–2.640`, Faixa 2 `2.640,01–4.400`, Faixa 3 `4.400,01–8.000`. Elegível se `renda ≤ 8.000 && > 0`.
- Dependências externas a substituir no Go: **Puppeteer** → gerador PDF Go (chromedp / gotenberg / wkhtmltopdf / maroto); **@google/generative-ai** → cliente Gemini Go (ou desativar/portar). Chave Gemini está **hardcoded como fallback** no código — remover.

---

## Configurações

Três camadas distintas de "configuração":

1. **App/sistema (`configurations.js` + `SystemConfig`)** — hoje **inerte**: `GET /api/configurations` retorna JSON fixo; o model `SystemConfig` (`system_configs`: `nome_sistema, cor_primaria, cor_secundaria, cor_texto, logo_url, tema_escuro`) **não é lido/gravado por rota alguma**. Decisão de migração: (a) implementar de verdade lendo `system_configs`, ou (b) descontinuar em favor de config por tenant. Recomendado: unificar em tenant settings.

2. **Tenant (`tenantSettingsRoutes.js` + `Tenant`)** — config real e ativa: dados cadastrais, `configuracoes` (JSON), `logo` (upload), integração **Asaas** (`asaas_api_key`, `asaas_webhook_token`, webhook URL derivada de `slug`). Guardas: `is_administrador` ou `is_super_admin`. Chave Asaas retornada mascarada.

3. **SaaS / Super Admin (`superAdminRoutes.js`)** — `requireSuperAdmin`; inclui `GET /api/super-admin/metrics` (dashboard global via `tenantService.getMetrics()`), gestão de tenants/planos/assinaturas (fora do escopo detalhado deste cluster, mas `metrics` é dashboard).

---

## Tabelas / colunas (resumo para GORM)

| Tabela | Colunas-chave | Tipos notáveis |
|---|---|---|
| `simulacoes` | id, cliente_id(FK clientes,null), user_id(FK users), tenant_id(null), valor_imovel, valor_entrada, valor_financiado (DECIMAL 12,2), prazo_meses(INT), taxa_juros_anual(DECIMAL 5,2), sistema(ENUM SAC/PRICE), primeira_parcela, ultima_parcela, total_pago(14,2), total_juros(14,2), renda_minima, observacoes(TEXT), timestamps | underscored |
| `visitas` | id, cliente_id(FK), imovel_id(FK), corretor_id(FK,null), criado_por_id(FK), tenant_id(null), data_visita(DATE), status(ENUM), observacoes, feedback_cliente(TEXT), nota_avaliacao(INT 1–5), timestamps | 4 associações User (corretor/criador) |
| `propostas` | id, cliente_id(FK), imovel_id(FK), corretor_id(FK,null), tenant_id(null), valor_ofertado/contra_proposta/aceito(DECIMAL 12,2), forma_pagamento(ENUM), status(ENUM), data_validade(DATE), condicoes/motivo_recusa/observacoes(TEXT), timestamps | |
| `laudos` | id, parceiro(STR255), tipo_imovel(ENUM casa/apartamento), valor_solicitado/valor_liberado(DECIMAL 15,2), vencimento(DATE), endereco(TEXT), observacoes(TEXT), arquivos(**JSONB**), user_id(FK), created_at/updated_at | **sem tenant_id**; índices em parceiro/tipo/vencimento/user_id/created_at |
| `system_configs` | nome_sistema, cor_primaria, cor_secundaria, cor_texto, logo_url(null), tema_escuro(BOOL), timestamps | **não usado** |
| `clientes` (lido) | valor_renda(**VARCHAR** ⚠), status(STR), user_id, tenant_id, created_at, updated_at, + campos de relatório | agregações exigem CAST |
| `tenants` (lido) | nome, slug(imutável), cnpj, email, telefone, logo, configuracoes(JSON), endereco/cidade/estado/cep, asaas_api_key, asaas_webhook_token | |

---

## Gotchas

1. **`valor_renda` é VARCHAR** — `AVG/MAX/MIN/SUM` exigem `CAST("valor_renda" AS NUMERIC)`; `WHERE valor_renda NOT IN (NULL,'','0')`. Valores mal formatados (vírgula decimal, texto) quebram o CAST em runtime — blindar com `NULLIF`/`REPLACE`/regex no Go.
2. **`/api/report/*` sem auth** e **dashboards/simulações/visitas/propostas sem filtro de `tenant_id`** nas leituras → vazamento multi-tenant. **Corrigir na migração**: exigir auth + `tenant_id` em todo `WHERE`.
3. **Path duplicado** `/api/dashboard/dashboard/aguardando-aprovacao` (rota `/dashboard/...` dentro do router já montado em `/api/dashboard`). Decidir path limpo no Go (ex.: `/api/dashboard/aguardando-aprovacao`) e manter alias se o frontend depender.
4. **Duplo middleware de auth** no dashboard (mount + `authMiddleware` interno). Unificar.
5. **Cache em memória** (5 min) não é multi-tenant nem cluster-safe; a chave é só `email+role`. Refazer com tenant na chave e store compartilhado.
6. **N+1** no Top 5 usuários (loop `User.findByPk`). Usar JOIN no Go.
7. **Puppeteer** (Chromium headless, `--no-sandbox`) e **Gemini** são dependências pesadas/externas do relatório — planejar substituição Go (gerador PDF + cliente Gemini/opcional). **Chave Gemini hardcoded** no fallback — remover.
8. **Laudos sem `tenant_id`** — adicionar coluna + escopo. Arquivos em `uploads/clientes/` (mesma pasta de clientes) — considerar reorganizar para `uploads/laudos/`.
9. **Sem checagem de dono** em `PUT/DELETE` de visitas e propostas — adicionar autorização por tenant/corretor.
10. **`SystemConfig` órfão** — decidir descontinuar ou implementar.
11. **Efeitos colaterais** (Notificacao + Socket.io em visitas; Notificacao em propostas) precisam de portabilidade explícita (event bus / hub WS no Go).
12. **DOW / meses**: `EXTRACT(DOW)` (0=Dom) e `EXTRACT(MONTH/YEAR)` do Postgres — replicar exatamente em GORM/`db.Raw` para não deslocar índices dos arrays do frontend.
13. **Enums** (`sistema`, `status`, `forma_pagamento`, `tipo_imovel`) são ENUM Postgres — no GORM usar `type:varchar` + `check` ou tipos ENUM nativos via migration; manter os mesmos valores string.
14. **Decimais**: usar `shopspring/decimal` em simulações e valores monetários — não `float64`.

---

## Layout Go proposto

```
internal/
  modules/
    dashboards/
      handler.go        # GET / , /monthly , /weekly , /system-stats , /activity-metrics , /notifications , /aguardando-aprovacao
      service.go        # agregações (CAST valor_renda), buildScope(role,tenant), cache TTL
      dto.go            # MainDashboardResponse, MonthlyResponse, WeeklyResponse, ...
      cache.go          # cache in-process com tenant+role na chave (ou Redis)
      routes.go
    relatorios/
      handler.go        # GET /relatorio (html) , /relatorio/download (pdf) , /relatorio/dados (json)
      analytics.go      # geral/mcmv/perfil/tendencias/documentos/fgts (portar funções puras)
      mcmv.go           # faixas MCMV + elegibilidade
      pdf.go            # geração PDF (chromedp/gotenberg/maroto) — substitui Puppeteer
      ai.go             # recomendações via Gemini (opcional/feature-flag) + fallback estático
      routes.go
    simulacoes/
      handler.go        # POST /calcular , POST / , GET /cliente/:id , GET / , DELETE /:id
      service.go        # CalcularSAC / CalcularPRICE / RendaMinima (decimal)
      model.go          # Simulacao (GORM)
      dto.go
      routes.go
    visitas/
      handler.go        # GET / (filtros) , GET /cliente/:id , POST , PUT /:id , DELETE /:id
      service.go        # + emissão de Notificacao/WebSocket
      model.go          # Visita (GORM, enum status, nota 1-5)
      routes.go
    propostas/
      handler.go        # GET / , GET /cliente/:id , POST , PUT /:id , DELETE /:id
      service.go        # fluxo de negociação + Notificacao
      model.go          # Proposta (enums forma_pagamento/status)
      routes.go
    laudos/
      handler.go        # CRUD + /:id/arquivo/:categoria/:filename + /relatorios/estatisticas
      service.go        # status/dias-vencimento, agregações (SUM valores)
      upload.go         # multipart, JSONB arquivos, cleanup, storage uploads/laudos
      model.go          # Laudo (+ tenant_id novo)
      routes.go
    configuracoes/
      tenant_handler.go # /tenant-settings/settings (+ /logo, /asaas, /asaas/testar)
      system_handler.go # /configurations (implementar SystemConfig ou descontinuar)
      superadmin_handler.go # /super-admin/metrics (dashboard SaaS)
      service.go
      model.go          # SystemConfig, (Tenant compartilhado do módulo tenants)
      routes.go
  shared/
    middleware/         # AuthRequired, ResolveTenant, RequireSuperAdmin, RequireTenantAdmin
    money/              # wrappers shopspring/decimal + formatação BRL
    pagination/         # page/limit → offset padrão
    events/             # notificações + hub WebSocket (Socket.io equivalente)
```

**Regras transversais a aplicar em todos os módulos deste cluster:**
- Middleware de auth + `resolveTenant` obrigatório (inclusive em relatórios).
- Todo repositório aplica `WHERE tenant_id = ?` por padrão; corretor puro adiciona `user_id = ?`.
- Respostas padronizadas: `{ success, data, ...paginação }` (manter compatibilidade com frontend atual: `{ success, data, total, page, pageSize }` e, em laudos, `{ success, data, pagination{...} }`).
- Erros: 400 (validação), 401/403 (auth/permissão), 404 (não encontrado), 500 (interno) — igual ao Express atual.
