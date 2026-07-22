# 04 — Subsistema de Aluguéis (Locação)

Especificação de migração Node.js/Express (Sequelize/PostgreSQL) → Go (Gin + GORM).
Cluster: **Locação / Aluguéis** — imóveis para locação, contratos, proprietários, portal do inquilino, vistorias, chamados de manutenção, régua de cobrança e repasses.

> Base analisada: `backend/src` no commit `97d9074`. Todos os endpoints, colunas e regras abaixo foram extraídos do código real (rotas, controllers, models, services e `routes/cronJobs.js`).

---

## Visão geral

O subsistema de aluguéis é um módulo paralelo ao CRM de vendas. Ele tem seu **próprio "cliente"** (`ClienteAluguel` = inquilino, tabela `cliente_aluguels`), distinto de `Cliente` (comprador). O fluxo central é:

1. Cadastra-se um **imóvel de locação** (`Aluguel`, tabela `alugueis`).
2. Cadastra-se um **inquilino** (`ClienteAluguel`) vinculado ao imóvel (`aluguel_id`) e, opcionalmente, a um **proprietário** (`proprietario`).
3. Ao criar o inquilino, o sistema tenta criar **cliente + assinatura recorrente no Asaas** (gateway de pagamento de aluguel). As parcelas mensais viram `CobrancaAluguel` (tabela `cobranca_aluguels`).
4. Um **webhook Asaas** (`asaasWebhook.js`) recebe eventos de pagamento, atualiza a cobrança, gera recibo PDF, notifica por WhatsApp e dispara o **repasse ao proprietário** (`RepasseProprietario`) via PIX.
5. **Cron jobs** automatizam: régua de cobrança (WhatsApp), sincronização Asaas, recálculo de score de inquilino (Gemini AI), verificação de reajuste de contratos e relatório mensal ao proprietário.
6. O **inquilino** tem um portal próprio (login por CPF, JWT `tipo: 'inquilino'`) para ver dados, cobranças, recibos, contrato e abrir chamados de manutenção.

### Peculiaridades de montagem de rotas (`routes/index.js`)

A ordem de montagem é **crítica** e precisa ser replicada em Go:

| Ordem | Mount | Auth aplicada no mount? | Observação |
|---|---|---|---|
| 1 | `app.use('/api', portalInquilinoRoutes)` | **NÃO** (JWT próprio de inquilino) | Montado no topo p/ evitar conflito com rotas dinâmicas |
| 2 | `app.use('/api', dashboardAluguelRoutes)` | **NÃO** | **Montado ANTES de `dashboardRoutes`** para `/api/dashboard/alugueis` não ser capturado pelo router genérico de dashboard |
| 3 | `app.use('/api/dashboard', auth+tenant, dashboardRoutes)` | sim | genérico |
| 4 | `app.use('/api/alugueis', auth+tenant, alugueisRouter)` | sim (no mount) | CRUD de imóveis |
| 5 | `app.use('/api', asaasWebhookRoutes)` | **NÃO** (valida token Asaas) | webhook público |
| 6 | `app.use('/api', auth+tenant, clienteAluguelRoutes)` | sim (no mount) | inquilinos + cobranças Asaas |
| 7 | `app.use('/api', contratoAluguelRoutes)` | **NÃO no mount** — sem auth | contrato PDF/texto/reajuste (⚠ ver Gotchas) |
| 8 | `app.use('/api', contratoRoutes)` | **auth interno** (`router.use(auth, resolveTenant)`) | vínculo/documentos de contrato |
| 9 | `app.use('/api', proprietariosRoutes)` | **auth interno** | CRUD proprietários |
| 10 | `app.use('/api', mw-condicional, repasseRoutes)` | **auth só se `path` começa com `/repasses`** | ⚠ `/clientealuguel/:id/multa-juros` dentro deste router fica **SEM auth** |
| 11 | `app.use('/api', vistoriaRoutes)` | **NÃO** — nenhum auth | ⚠ vistorias abertas |
| 12 | `app.use('/api', chamadoRoutes)` | **NÃO no mount** — rotas admin sem auth, rotas `/portal/*` com JWT inquilino | ⚠ `/chamados` admin sem auth |

O mount genérico final `app.use('/api/', auth+tenant, clienteRoutes)` (clientes de venda) vem por último.

### Middlewares relevantes

- **`authenticateToken`** — valida `Bearer` JWT (1h) contra assinatura e tabela `Token`; seta `req.user` (com flags `is_administrador`, `is_correspondente`, `is_corretor`, `is_super_admin`, `tenant_id`).
- **`resolveTenant`** — após auth, seta `req.tenantId` e `req.tenant`. Admin/super-admin podem trocar de tenant via header `x-tenant-id`. `addTenantFilter(req, where)` injeta `where.tenant_id`.
- **`authenticateInquilino`** (definido inline em `portalInquilino.js` e `chamadoRoutes.js`) — valida JWT com `JWT_SECRET_KEY` (fallback `'portal-inquilino-secret'`), exige `decoded.tipo === 'inquilino'`, seta `req.inquilino = { cliente_aluguel_id, nome }`. **Não passa por `resolveTenant`** → portal do inquilino não é tenant-scoped na query.

### Roles

O subsistema **não usa checagem fina de role** dentro das rotas — quem está autenticado como usuário do sistema (qualquer papel: `is_administrador`/`is_correspondente`/`is_corretor`) acessa. A separação real é entre **usuário do sistema** (JWT normal + tenant) e **inquilino** (JWT do portal). O isolamento por empresa é feito por `tenant_id` (com fallback `tenant_id IS NULL` para dados legados em vários endpoints).

---

## Endpoints (tabelas)

### 1. Imóveis de locação — `routes/alugueis.js` → `controllers/aluguelController.js` → `services/aluguelService.js`
Mount: `/api/alugueis` com `authenticateToken + resolveTenant`. Multer: `foto_capa` (1) + `fotos_adicionais` (até 10), imagens ≤5MB, gravadas em `uploads/temp` e movidas p/ `uploads/alugueis`.

| Método | Path completo | Middlewares | Role | Entrada | Resposta | Status | Regra de negócio |
|---|---|---|---|---|---|---|---|
| GET | `/api/alugueis/` | auth+tenant | usuário | — | `Aluguel[]` (order `created_at DESC`) | 200/500 | Lista todos os imóveis (⚠ **não filtra tenant** no service — `listarAlugueis()` faz `findAll` sem where). |
| POST | `/api/alugueis/` | auth+tenant, multer | usuário | multipart: campos de `Aluguel` + fotos | `Aluguel` | 201/500 | `parseCurrencyValue` no `valor_aluguel` (limpa `R$`, milhar, vírgula). Move fotos temp→final. Emite socket `aluguel-criado`. Em erro limpa temp. |
| PUT | `/api/alugueis/:id` | auth+tenant, multer | usuário | multipart | `Aluguel` | 200/404/500 | Substitui foto_capa (apaga antiga), substitui `fotos_adicionais` inteiro. Emite `aluguel-atualizado`. |
| PUT | `/api/alugueis/:id/alugado` | auth+tenant | usuário | — | `Aluguel` | 200/404/500 | Toggle booleano `alugado`. |
| DELETE | `/api/alugueis/:id` | auth+tenant | usuário | — | `{message}` | 200/404/500 | Apaga fotos do disco + registro. Emite `aluguel-removido`. |
| GET | `/api/alugueis/:id/download` | auth+tenant | usuário | — | ZIP (`archiver`) | 200/404/500 | Gera ZIP com `capa` + `foto_*` a partir de `uploads/`. Usa `fotos_adicionais` (campo que no model é `foto_adicional` — ⚠ inconsistência de nome, ver Gotchas). |
| POST | `/api/alugueis/cleanup-temp` | auth+tenant | usuário | — | `{success}` | 200 | Remove temp >30min. |

### 2. Inquilinos + cobranças Asaas — `routes/clienteAluguel.js`
Mount: `/api` com `authenticateToken + resolveTenant`. Multer: `documento_id`, `contrato`, `fiador_documento_id` (≤10MB) → `uploads/clientes` (e `uploads/fiador_documentos` p/ o fiador).

| Método | Path completo | Middlewares | Entrada | Resposta | Status | Regra de negócio |
|---|---|---|---|---|---|---|
| POST | `/api/clientealuguel` | auth+tenant, multer | dados inquilino + fiador + arquivos | `ClienteAluguel` | 201/500 | Cria inquilino local. **Se `ASAAS_API_KEY` set**: cria cliente Asaas (`criarCliente`), calcula `calcularProximoVencimento(dia_vencimento)`, cria assinatura recorrente (`criarAssinatura`), salva `asaas_customer_id`, `asaas_subscription_id`, `asaas_subscription_status='ACTIVE'`. Falha Asaas **não bloqueia** (inquilino fica sem Asaas). |
| GET | `/api/clientealuguel` | auth+tenant | — | `ClienteAluguel[]` (order `id DESC`) | 200/500 | **Schema-safe**: `describeTable('cliente_aluguels')` p/ filtrar atributos existentes (cache em memória). |
| GET | `/api/clientealuguel/:id` | auth+tenant | — | `ClienteAluguel` | 200/404/500 | `findByPk`. |
| POST | `/api/clientealuguel/:id/pagamento` | auth+tenant | `{data,valor,status,forma_pagamento}` | `ClienteAluguel` | 200/404/500 | Append manual ao JSON `historico_pagamentos` (id=`Date.now()`). `changed(...,true)` p/ persistir JSON. |
| DELETE | `/api/clientealuguel/:id/pagamento/:pagamentoId` | auth+tenant | — | `ClienteAluguel` | 200/400/404/500 | Filtra item do JSON por id. |
| PUT | `/api/clientealuguel/:id` | auth+tenant, multer | dados inquilino/fiador/proprietário/corretor | `ClienteAluguel` | 200/404/500 | Update parcial (helper `f()`). **Se `valor_aluguel` mudou e há `asaas_subscription_id`**: `atualizarAssinatura` com novo valor. |
| DELETE | `/api/clientealuguel/:id` | auth+tenant | — | — | 204/404/500 | Cancela assinatura Asaas, `destroy` das `CobrancaAluguel` filhas, apaga inquilino. |
| POST | `/api/clientealuguel/:id/cobranca-avulsa` | auth+tenant | `{valor,data_vencimento,descricao}` | `CobrancaAluguel` | 201/400/404/500 | Exige `asaas_customer_id`. `criarCobrancaAvulsa` no Asaas + cria `CobrancaAluguel` tipo `avulso`. |
| GET | `/api/clientealuguel/:id/cobrancas` | auth+tenant | — | `CobrancaAluguel[]` (order `data_vencimento DESC`) | 200/500 | Lista cobranças do inquilino. |
| POST | `/api/clientealuguel/:id/sincronizar-asaas` | auth+tenant | — | `ClienteAluguel` | 200/400/404/500 | Cria cliente/assinatura Asaas se faltarem; importa cobranças existentes (`mapAsaasStatus`). |
| POST | `/api/clientealuguel/:id/score` | auth+tenant | — | resultado score | 200/404/500 | `calcularScoreInquilino(cliente, cobrancas)`; salva `score_inquilino`, `score_detalhes`, `score_atualizado_em`. |
| GET | `/api/alugueis-disponiveis` | auth+tenant | — | `Aluguel[]` | 200/500 | Lista imóveis p/ vincular (⚠ mesma rota-base `/api`, distinta de `/api/alugueis`). |

### 3. Contratos (PDF/texto/reajuste) — `routes/contratoAluguel.js` → `services/contratoService.js`
Mount: `/api` **sem auth no mount** (⚠). Schema-safe via `describeTable`.

| Método | Path completo | Entrada | Resposta | Status | Regra de negócio |
|---|---|---|---|---|---|
| GET | `/api/clientealuguel/:id/contrato/texto` | query `?modelo=padrao` | `{texto_contrato}` | 200/404/500 | `obterTextoContrato` (texto salvo em `.txt` ou gerado) ou `obterModeloContratoPadrao` (força template). |
| POST | `/api/clientealuguel/:id/contrato` | `{texto_contrato}` | `{message, caminho, nome_arquivo, url_relativa}` | 200/404/500 | `gerarContratoPDF` via **Puppeteer**; salva texto editável (`contrato_editavel.txt`) e PDF em `uploads/contratos/{id}/`. |
| GET | `/api/clientealuguel/:id/contrato` | — | download PDF | 200/404/500 | Baixa o PDF mais recente da pasta do inquilino. |
| GET | `/api/clientealuguel/:id/reajuste` | query `?indice=` | objeto reajuste | 200/404/500 | `calcularReajuste` (default 5%). |
| POST | `/api/clientealuguel/:id/reajuste/aplicar` | `{indice}` | `{valor_anterior, valor_novo, indice_aplicado}` | 200/404/500 | Aplica reajuste: atualiza `valor_aluguel` e, se houver assinatura, `atualizarAssinatura` no Asaas. |

### 4. Vínculo/documentos de contrato — `routes/contratoRoutes.js`
Mount: `/api`. **Auth interno**: `router.use(authenticateToken, resolveTenant)`. Multer p/ `uploads/contratos` (≤20MB, `.pdf/.jpg/.jpeg/.png/.doc/.docx`). Schema-safe extensivo (colunas opcionais `proprietario_id`, `contrato_documentos`, `tenant_id`).

| Método | Path completo | Entrada | Resposta | Status | Regra de negócio |
|---|---|---|---|---|---|
| GET | `/api/contratos/opcoes` | — | `{imoveis, proprietarios, inquilinos}` | 200/500 | Listas p/ montar vínculo (tenant + legado `tenant_id IS NULL`). |
| POST | `/api/contratos/vincular` | `{cliente_aluguel_id, aluguel_id, proprietario_id}` | `{message, cliente}` | 200/400/403/404/500 | Vincula inquilino↔imóvel↔proprietário; grava `proprietario_nome/telefone` (e `proprietario_id` se existir coluna). Valida tenant cruzado (403). |
| POST | `/api/contratos/:clienteAluguelId/documentos` | multipart `documentos[]` (≤10) | `{message, documentos}` | 201/403/404/500 | Anexa docs ao JSON `contrato_documentos`; fallback legado grava em `contrato_path`. |
| GET | `/api/contratos` | — | contratos normalizados | 200/500 | Inquilinos com `aluguel_id != null`; inclui `imovel` e `proprietario` (se coluna existir); normaliza `contrato_documentos` (IDs estáveis). |
| PUT | `/api/contratos/:id/atualizar` | `{cliente_aluguel_id, aluguel_id, proprietario_id}` | `{message, cliente}` | 200/400/403/404/500 | Re-vincula. |
| DELETE | `/api/contratos/:id` | — | `{message}` | 200/403/404/500 | Limpa vínculos (`aluguel_id`, proprietário, docs) — não apaga inquilino. |
| GET | `/api/contratos/documento/:docId/download` | — | download arquivo | 200/404/500 | Busca doc em todos os contratos do tenant; resolve caminho seguro dentro de `backend/uploads`. |

### 5. Proprietários — `routes/proprietarios.js`
Mount: `/api`. **Auth interno** `router.use(authenticateToken, resolveTenant)`.

| Método | Path completo | Entrada | Resposta | Status | Regra de negócio |
|---|---|---|---|---|---|
| GET | `/api/proprietarios` | — | `proprietario[]` (order `name ASC`) | 200/500 | Filtro `tenant_id = req.tenantId OR NULL`. |
| POST | `/api/proprietarios` | `{name, phone, address}` | `proprietario` | 201/400/500 | `name` obrigatório; grava `tenant_id`. |
| DELETE | `/api/proprietarios/:id` | — | `{message}` | 200/403/404/500 | Bloqueia deleção de outro tenant (403). |

### 6. Repasses ao proprietário — `routes/repasseRoutes.js` → `services/repasseService.js`
Mount: `/api` com **middleware condicional**: auth+tenant **só** quando `req.path` começa com `/repasses`. ⚠ `/clientealuguel/:id/multa-juros` (definida neste mesmo router) fica **sem auth**.

| Método | Path completo | Auth | Entrada | Resposta | Status | Regra de negócio |
|---|---|---|---|---|---|---|
| GET | `/api/repasses` | sim | query `mes, status, transfer_status` | `RepasseProprietario[]` + `clienteAluguel` | 200/500 | Lista repasses (order `created_at DESC`). |
| POST | `/api/repasses/gerar` | sim | `{mes:"YYYY-MM", enviar_pix}` | `{message, transferencias_pix, erros?}` | 200/400/500 | Para cada `CobrancaAluguel` CONFIRMED/RECEIVED do mês sem repasse: `processarRepasse(cob, cliente, null, req.tenant?.asaas_api_key)`. |
| POST | `/api/repasses/:id/transferir` | sim | — | `{message, repasse}` | 200/500 | `reenviarRepasse` — retenta PIX p/ FALHOU/SEM_PIX. |
| PUT | `/api/repasses/:id/confirmar` | sim | `{observacao}` | `RepasseProprietario` | 200/404/500 | Marca `REALIZADO` manualmente (`data_repasse`=hoje), sem PIX. |
| GET | `/api/repasses/resumo` | sim | query `mes` | totais + `repasses` | 200/400/500 | Soma `valor_aluguel/taxa/repasse/comissao`; conta pendentes/realizados/falhos/sem_pix. |
| GET | `/api/clientealuguel/:id/multa-juros` | **NÃO** ⚠ | — | array por cobrança | 200/404/500 | Para cada `CobrancaAluguel` OVERDUE: `calcularMultaJuros(valor, %multa, %juros, diasAtraso)`. |

### 7. Vistorias — `routes/vistoriaRoutes.js`
Mount: `/api` **sem auth** ⚠. Multer p/ `uploads/vistorias/{id}` (≤10MB).

| Método | Path completo | Entrada | Resposta | Status | Regra de negócio |
|---|---|---|---|---|---|
| POST | `/api/vistorias` | `{cliente_aluguel_id, aluguel_id, tipo, data_vistoria, observacoes_gerais, checklist}` | `VistoriaAluguel` | 201/500 | `tipo` default `entrada`; `checklist` default = `getChecklistPadrao()` (7 cômodos × 8 itens, estado `bom`). |
| GET | `/api/vistorias/cliente/:id` | — | `VistoriaAluguel[]` | 200/500 | Do inquilino, order `data_vistoria DESC`. |
| GET | `/api/vistorias/:id` | — | `VistoriaAluguel` + inquilino + imóvel | 200/404/500 | Detalhe. ⚠ colide com `/vistorias/cliente/:id`? Não — `cliente` é literal, resolve antes. |
| PUT | `/api/vistorias/:id` | `{checklist, observacoes_gerais, status}` | `VistoriaAluguel` | 200/404/500 | Update parcial. |
| POST | `/api/vistorias/:id/fotos` | multipart `fotos[]` (≤20) + `descricao,comodo` | `VistoriaAluguel` | 200/404/500 | Append ao JSON `fotos` (`{url, descricao, comodo}`). |
| POST | `/api/vistorias/:id/gerar-pdf` | — | `{message, pdf_url}` | 200/404/500 | Monta HTML do laudo e gera PDF via **Puppeteer**; salva `pdf_url`, `status='finalizado'`. |
| GET | `/api/vistorias/:clienteId/comparativo` | — | `{entrada, saida}` | 200/500 | Última vistoria de entrada vs. saída do inquilino. |

### 8. Chamados de manutenção — `routes/chamadoRoutes.js`
Mount: `/api`. Rotas `/portal/*` usam `authenticateInquilino`; rotas admin **sem auth** ⚠.

| Método | Path completo | Auth | Entrada | Resposta | Status | Regra de negócio |
|---|---|---|---|---|---|---|
| POST | `/api/portal/chamados` | inquilino | `{titulo, descricao, categoria, prioridade}` | `ChamadoManutencao` | 201/500 | Cria chamado do inquilino logado; puxa `aluguel_id` do cadastro. Notifica admin (`DEFAULT_PHONE_NUMBER`) via WhatsApp. |
| GET | `/api/portal/chamados` | inquilino | — | `ChamadoManutencao[]` | 200/500 | Chamados do inquilino (order `created_at DESC`). |
| GET | `/api/chamados` | **NÃO** ⚠ | query `status, prioridade` | `ChamadoManutencao[]` + inquilino + imóvel | 200/500 | Admin lista todos; ordena por prioridade (`urgente>alta>media>outros`) via `literal CASE`. |
| PUT | `/api/chamados/:id` | **NÃO** ⚠ | `{status, resposta_admin}` | `ChamadoManutencao` | 200/404/500 | Atualiza; se `status='resolvido'` grava `data_resolucao`; notifica inquilino por WhatsApp. |
| GET | `/api/chamados/resumo` | **NÃO** ⚠ | — | `{total, abertos, em_andamento, resolvidos, urgentes}` | 200/500 | Contadores. |

### 9. Portal do inquilino — `routes/portalInquilino.js`
Mount: `/api` (topo). Login público; demais com `authenticateInquilino`.

| Método | Path completo | Auth | Entrada | Resposta | Status | Regra de negócio |
|---|---|---|---|---|---|---|
| POST | `/api/portal/login` | público | `{cpf}` | `{token, nome, email}` | 200/400/403/404/500 | Busca inquilino por CPF limpo e por CPF formatado. Respeita `tenant.configuracoes.permitir_portal_inquilino !== false`. Emite JWT `tipo:'inquilino'`, `expiresIn 24h`. |
| GET | `/api/portal/meus-dados` | inquilino | — | inquilino + `imovel` + `em_atraso` | 200/404/500 | `em_atraso = hoje.getDate() > dia_vencimento && !pago`. |
| GET | `/api/portal/cobrancas` | inquilino | — | `CobrancaAluguel[]` | 200/500 | Order `data_vencimento DESC`. |
| GET | `/api/portal/recibos` | inquilino | — | `CobrancaAluguel[]` CONFIRMED/RECEIVED | 200/500 | Order `data_pagamento DESC`. |
| GET | `/api/portal/recibo/:id/pdf` | inquilino | — | download PDF | 200/404/500 | Exige `recibo_url`; download seguro. |
| GET | `/api/portal/contrato` | inquilino | — | download PDF | 200/404/500 | Prioridade: `contrato_documentos` (mais recente) → `contrato_path` legado → PDF gerado em `uploads/contratos/{id}/`. |

### 10. Dashboard de aluguéis — `routes/dashboardAluguel.js`
Mount: `/api` (antes de `dashboardRoutes`) — **sem auth**. ⚠

| Método | Path completo | Auth | Resposta | Status | Regra de negócio |
|---|---|---|---|---|---|
| GET | `/api/dashboard/alugueis` | **NÃO** ⚠ | resumo + séries | 200/500 | Agrega: receita prevista (Σ `valor_aluguel`), recebida (Σ cobranças CONFIRMED/RECEIVED do mês), inadimplência, taxa de ocupação, receita mensal 12m, ranking 10 inadimplentes, distribuição por `billing_type`. **N+1 pesado** (loop 12 meses + loop por inquilino). |

### 11. Webhook Asaas (integração de pagamento) — `routes/asaasWebhook.js`
Mount: `/api` — **sem auth** (valida `asaas-access-token`).

| Método | Path completo | Entrada | Status | Regra de negócio |
|---|---|---|---|---|
| POST | `/api/asaas/webhook/:tenantSlug` | `{event, payment}` + header `asaas-access-token` | 200/401/404 | Resolve tenant por `slug`, usa `tenant.asaas_webhook_token` + `tenant.asaas_api_key`. |
| POST | `/api/asaas/webhook` | idem | 200/401 | Legado — usa `ASAAS_WEBHOOK_TOKEN`/chave global. |
| GET | `/api/asaas/teste` | — | 200/500 | `testarConexao`. |

Eventos tratados: `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` (marca CONFIRMED, `data_pagamento`, `pago=true`, append `historico_pagamentos`, gera recibo PDF, WhatsApp de confirmação, **dispara `processarRepasse`**), `PAYMENT_OVERDUE` (OVERDUE + WhatsApp cobrança), `PAYMENT_CREATED` (PENDING + URLs), `PAYMENT_REFUNDED` (REFUNDED), `PAYMENT_DELETED` (CANCELLED). **Sempre responde 200** (evita retries). Cria cobrança inexistente se `payment.subscription` casar com `asaas_subscription_id`.

---

## Modelos & tabelas

### `alugueis` — model `Aluguel` (`models/aluguel.js`, `underscored: false`, timestamps `created_at`/`updated_at`)
| Coluna | Tipo | Notas |
|---|---|---|
| id | INTEGER PK auto | |
| nome_imovel | STRING NOT NULL | 3–255 |
| descricao | TEXT NOT NULL | 10–1000 |
| valor_aluguel | DECIMAL(10,2) NOT NULL | >0 |
| quartos | INTEGER NOT NULL | 0–20 |
| banheiro | INTEGER NOT NULL | 1–20 |
| dia_vencimento | INTEGER NOT NULL | 1–31 |
| foto_capa | STRING | caminho relativo em `uploads/` |
| alugado | BOOLEAN default false | |
| foto_adicional | TEXT (JSON stringificado) | getter/setter JSON. ⚠ código de rotas usa `fotos_adicionais` — **campo não existe no model** (ver Gotchas) |
| tenant_id | INTEGER FK tenants | |

Associação: `hasOne ClienteAluguel as 'inquilino'` (FK `aluguel_id`).

### `cliente_aluguels` — model `ClienteAluguel` (timestamps `created_at`/`updated_at`)
Tabela **larga**; muitas colunas são opcionais e verificadas por `describeTable` em runtime.
| Grupo | Colunas |
|---|---|
| Identificação | nome (NOT NULL), cpf, email, telefone |
| Financeiro | valor_aluguel DECIMAL(10,2) NOT NULL, dia_vencimento INT NOT NULL, pago BOOL, historico_pagamentos JSON `[]`, percentual_multa DECIMAL(5,2)=2.00, percentual_juros_mora DECIMAL(5,2)=1.00 |
| Asaas | asaas_customer_id, asaas_subscription_id, asaas_subscription_status |
| Contrato | aluguel_id INT, data_inicio_contrato DATEONLY, data_fim_contrato DATEONLY, indice_reajuste STRING='IGPM', contrato_path, contrato_documentos JSONB `[]` |
| Score | score_inquilino INT, score_detalhes JSON, score_atualizado_em DATE |
| Proprietário | proprietario_nome, proprietario_telefone, proprietario_pix, proprietario_id INT, taxa_administracao DECIMAL(5,2)=10.00 |
| Corretor | corretor_percentual DECIMAL(5,2)=0, corretor_nome, corretor_pix |
| Pessoais | data_nascimento DATEONLY, cidade_nascimento |
| Fiador | tem_fiador BOOL NOT NULL false, fiador_nome, fiador_telefone, fiador_email, fiador_cpf, fiador_data_nascimento DATEONLY, fiador_cidade_nascimento |
| Documentos | documento_id_path, fiador_documento_id_path |
| Multitenancy | tenant_id INT FK tenants |

Associações: `hasMany CobrancaAluguel as 'cobrancas'`; `belongsTo Aluguel as 'imovel'`; `hasMany ReguaCobranca as 'reguaCobrancas'`; `hasMany RepasseProprietario as 'repasses'`; `hasMany VistoriaAluguel as 'vistorias'`; `hasMany ChamadoManutencao as 'chamados'`; `belongsTo proprietario as 'proprietario'` (FK `proprietario_id`).

### `cobranca_aluguels` — model `CobrancaAluguel` (`underscored: true`)
| Coluna | Tipo | Notas |
|---|---|---|
| cliente_aluguel_id | INTEGER NOT NULL | FK |
| asaas_payment_id | STRING UNIQUE | |
| valor | DECIMAL(10,2) NOT NULL | |
| data_vencimento | DATEONLY NOT NULL | |
| data_pagamento | DATEONLY | |
| status | STRING NOT NULL default 'PENDING' | PENDING/CONFIRMED/OVERDUE/REFUNDED/CANCELLED |
| billing_type | STRING default 'UNDEFINED' | PIX/BOLETO/CREDIT_CARD/UNDEFINED |
| invoice_url, bank_slip_url | STRING | |
| pix_qr_code | TEXT | |
| tipo | STRING NOT NULL default 'recorrente' | recorrente/avulso |
| descricao | STRING | |
| recibo_url | STRING | |
Associação: `belongsTo ClienteAluguel as 'clienteAluguel'`.

### `regua_cobrancas` — model `ReguaCobranca` (`underscored: true`)
`cliente_aluguel_id` NOT NULL, `cobranca_aluguel_id`, `etapa` STRING NOT NULL (`D-5/D-1/D+1/D+7/D+15`), `dias_referencia` INT NOT NULL, `mensagem_enviada` BOOL, `data_envio` DATE, `data_referencia` DATEONLY NOT NULL, `mes_referencia` STRING (`YYYY-MM`).

### `repasse_proprietarios` — model `RepasseProprietario` (`underscored: true`)
`cliente_aluguel_id` NOT NULL, `cobranca_aluguel_id`, `valor_aluguel` DEC(10,2), `taxa_administracao_percentual` DEC(5,2), `valor_taxa` DEC(10,2), `valor_repasse` DEC(10,2), `corretor_percentual` DEC(5,2)=0, `comissao_corretor` DEC(10,2)=0, `mes_referencia` STRING NOT NULL, `status` STRING='PENDENTE' (PENDENTE/REALIZADO), `data_repasse` DATEONLY, `observacao` STRING, `asaas_transfer_id` STRING, `transfer_status` STRING='PENDENTE' (PENDENTE/PROCESSANDO/REALIZADO/FALHOU/SEM_PIX), `transfer_error` TEXT.

### `proprietario` — model `proprietario` (nome minúsculo!, `underscored: false`, timestamps `createdAt`/`updatedAt`)
`id` PK, `name` STRING(255) NOT NULL, `address` STRING(255), `phone` STRING(255), `tenant_id` INT. ⚠ Tabela `proprietario` (singular) e timestamps camelCase — divergente do resto.

### `vistoria_aluguels` — model `VistoriaAluguel` (`underscored: true`)
`cliente_aluguel_id` NOT NULL, `aluguel_id`, `tipo` STRING='entrada' (entrada/saida), `data_vistoria` DATEONLY NOT NULL, `observacoes_gerais` TEXT, `checklist` JSON `[]`, `fotos` JSON `[]`, `pdf_url` STRING, `status` STRING='rascunho' (rascunho/finalizado).

### `chamado_manutencaos` — model `ChamadoManutencao` (`underscored: true`)
`cliente_aluguel_id` NOT NULL, `aluguel_id`, `titulo` STRING NOT NULL, `descricao` TEXT NOT NULL, `categoria` STRING, `prioridade` STRING='media' (baixa/media/alta/urgente), `status` STRING='aberto' (aberto/em_andamento/resolvido), `fotos` JSON `[]`, `resposta_admin` TEXT, `data_resolucao` DATE.

> ⚠ Nomes de tabela pluralizados de forma "ingênua" pelo Sequelize: `chamado_manutencaos`, `vistoria_aluguels`, `cliente_aluguels`, `cobranca_aluguels`. Em GORM defina `TableName()` explicitamente para preservá-los.

---

## Régua de cobrança & repasses

### Régua de cobrança (`services/reguaCobrancaService.js`)
Automação de cobrança recorrente **via WhatsApp** (não é geração de cobrança financeira — isso é o Asaas). 5 etapas fixas relativas ao dia de vencimento do inquilino:

| Etapa | dias | Momento | Mensagem |
|---|---|---|---|
| D-5 | -5 | 5 dias antes | lembrete amigável |
| D-1 | -1 | véspera | vence amanhã |
| D+1 | +1 | 1 dia após | venceu ontem, regularize (+ link) |
| D+7 | +7 | 7 dias após | multa e juros aplicados (+ link) |
| D+15 | +15 | 15 dias após | aviso importante, medidas administrativas (+ link) |

`processarReguaCobranca(ClienteAluguel, CobrancaAluguel, ReguaCobranca, whatsappClient, isAuthenticated)`:
- Calcula `diffDias = hoje - dataVencimentoDoMês`.
- Para cada etapa cujo dia bate, verifica idempotência: `ReguaCobranca` com mesma `etapa` + `mes_referencia` + `mensagem_enviada=true`. Se já enviada, pula.
- Busca `invoice_url` de cobrança PENDING/OVERDUE p/ o link.
- Envia via `whatsappClient.sendMessage('{55tel}@c.us', msg)` **somente se `whatsappClient && isAuthenticated`**.
- Registra `ReguaCobranca` (sempre, mesmo sem enviar de fato).

`calcularMultaJuros(valorOriginal, %multa, %jurosMora, diasAtraso)` → `{valor_original, multa, juros, dias_atraso, valor_total, ...}`. Juros mensal convertido p/ diário (`/30`).

### Repasses (`services/repasseService.js`)
Fluxo após pagamento confirmado (chamado pelo webhook e por `/repasses/gerar`):
1. Idempotência por `cobranca_aluguel_id`.
2. Cálculo: `valorTaxa = valor * taxa_administracao/100`; `valorRepasse = valor - valorTaxa`; `comissaoCorretor = valor * corretor_percentual/100`.
3. `mes_referencia = data_vencimento[0:7]`.
4. Cria `RepasseProprietario` PENDENTE.
5. Se sem `proprietario_pix` → `transfer_status='SEM_PIX'` (aguarda manual).
6. Senão → PROCESSANDO → `asaasService.realizarTransferenciaPix({valor, chavePix, descricao}, apiKey)` → REALIZADO (grava `asaas_transfer_id`, `data_repasse`) + WhatsApp ao proprietário; em erro → FALHOU (`transfer_error`).

`reenviarRepasse(id, fn, apiKey)` retenta FALHOU/SEM_PIX; recusa REALIZADO.

### Integração de pagamento (`services/asaasService.js`)
Funções: `criarCliente`, `buscarCliente`, `criarAssinatura`, `atualizarAssinatura`, `cancelarAssinatura`, `criarCobrancaAvulsa`, `buscarCobranca`, `listarCobrancasPorAssinatura`, `listarCobrancasPorCliente`, `buscarPixQrCode`, `buscarIdentificacaoBoleto`, `realizarTransferenciaPix(dados, apiKey)`, `buscarSaldo(apiKey)`, `testarConexao(apiKey)`, `calcularProximoVencimento(diaVencimento)`. Chave por tenant (`tenant.asaas_api_key`) com fallback global `ASAAS_API_KEY`.
> Nota de destino: a migração planeja pagamento de aluguel **via Asaas** (já é o gateway atual deste cluster). Em Go, encapsular num `pkg/asaas` cliente HTTP; nada de Mercado Pago aqui (MP é do cluster de assinaturas SaaS).

### Cron/Jobs (`routes/cronJobs.js`, `node-cron`, TZ America/Sao_Paulo)
| Schedule | Ação |
|---|---|
| `*/5 * * * *` | Lembretes (15min antes) + aviso de vencimento 3 dias (WhatsApp). Só em horário comercial. |
| `0 * * * *` | **Régua de cobrança** — `processarReguaCobranca`. Só horário comercial. |
| `*/30 * * * *` | Sincroniza cobranças Asaas (`sincronizarCobrancasAsaas`). |
| `0 */6 * * *` | Backup DB. |
| `0 6 * * *` | **Recalcular score** de todos inquilinos (`calcularScoreTodosInquilinos`). |
| `0 7 * * *` | **Verificar reajuste** de contratos (`verificarContratosReajuste`) — alerta 30 dias antes. |
| `0 9 1 * *` | **Relatório mensal** ao proprietário (WhatsApp). |
`isHorarioComercial()`: seg–sex 9–18h, sáb 9–13h.

---

## Contratos & vistorias & chamados

### Contratos
- **Texto editável**: `contrato_editavel.txt` por inquilino em `uploads/contratos/{id}/`. `gerarTextoContrato` produz Markdown (contrato de locação em "linguagem simples", Lei 8.245/91, foro Valparaíso de Goiás), seções numeradas dinamicamente conforme presença de imóvel/fiador.
- **PDF**: `gerarContratoPDF` — Markdown → HTML (`markdownToHtml` próprio) → **Puppeteer** (`--no-sandbox`) → PDF A4 em `uploads/contratos/{id}/contrato_{id}_{ts}.pdf`.
- **Reajuste**: `calcularReajuste(cliente, indice=5%)` → valor reajustado + data (aniversário do contrato) + dias restantes. `verificarContratosReajuste` alerta quando faltam exatamente 30 dias.
- **Documentos de contrato**: anexos em JSONB `contrato_documentos` (`{id, nome, tipo, path, data_upload}`), com fallback ao legado `contrato_path`.

### Vistorias
- Checklist padrão: 7 cômodos × 8 itens = 56 entradas `{comodo, item, estado:'bom', observacao}`.
- Fotos em JSON `fotos` (`{url, descricao, comodo}`), arquivos em `uploads/vistorias/{id}/`.
- Laudo PDF via **Puppeteer** (HTML inline com estilo caixa navy/orange), grava `pdf_url` e `status='finalizado'`.
- Comparativo entrada×saída (últimas de cada tipo).

### Chamados de manutenção
- Aberto pelo inquilino (portal, JWT) → notifica admin por WhatsApp (`DEFAULT_PHONE_NUMBER`).
- Admin lista/atualiza (rotas **sem auth** ⚠), ordena por prioridade via SQL `CASE`. Ao resolver, grava `data_resolucao` e notifica inquilino por WhatsApp.

---

## Portal do inquilino & score

### Portal do inquilino
- **Autenticação separada**: login por CPF (busca por CPF limpo e formatado), JWT `tipo:'inquilino'` 24h assinado com `JWT_SECRET_KEY`. Middleware `authenticateInquilino` valida o tipo.
- Feature-flag por empresa: `tenant.configuracoes.permitir_portal_inquilino !== false`.
- Endpoints: meus-dados (com flag `em_atraso`), cobranças, recibos, recibo PDF, contrato (3 fontes em cascata), chamados (abrir/listar).
- ⚠ Portal **não aplica `resolveTenant`** — o escopo vem só do `cliente_aluguel_id` no token.

### Score do inquilino (`services/scoreInquilinoService.js`)
- `calcularMetricas` combina `historico_pagamentos` (manuais) + `CobrancaAluguel` (Asaas): total, pontuais, atrasados, taxa de pontualidade, média de dias de atraso, meses de contrato.
- `calcularScoreComIA` usa **Gemini** (`gemini-2.0-flash`, `GEMINI_API_KEY`) com prompt que devolve JSON `{score, classificacao, observacoes, recomendacao}`; fallback `calcularScoreLocal` (heurística 0–100: base 50 + pontualidade×40 − atraso − bônus tempo/volume; classifica Excelente/Bom/Regular/Risco).
- Persistido em `score_inquilino`, `score_detalhes` (JSON completo), `score_atualizado_em`. Recalculado sob demanda (`POST /score`) e diariamente (cron 6h).

---

## Gotchas

1. **Ordem de mount é lógica de negócio.** `dashboardAluguelRoutes` e `portalInquilinoRoutes` são montados **antes** dos routers genéricos para evitar shadowing. Em Gin, registre grupos/rotas específicas antes das genéricas ou use paths distintos.
2. **Rotas SEM autenticação** (herança do mount): `dashboardAluguel.js` (`GET /api/dashboard/alugueis`), `vistoriaRoutes.js` (todas), `chamadoRoutes.js` rotas admin (`/chamados`, `/chamados/:id`, `/chamados/resumo`), `contratoAluguel.js` (todas), e `GET /api/clientealuguel/:id/multa-juros` (o middleware condicional de `repasseRoutes` só protege paths que começam com `/repasses`). Na migração Go, **decida conscientemente** se isso é bug a corrigir (recomendado: exigir auth+tenant) ou comportamento a preservar.
3. **`Aluguel.foto_adicional` vs `fotos_adicionais`.** O model define `foto_adicional` (singular, com getter/setter JSON), mas `aluguelController.downloadFotos` e `aluguelService` gravam/leem `fotos_adicionais` (plural). Provável coluna extra criada por migration não refletida no model. **Verificar a tabela real** (`\d alugueis`) antes de mapear em GORM.
4. **Nomes de tabela pluralizados pelo Sequelize**: `cliente_aluguels`, `cobranca_aluguels`, `vistoria_aluguels`, `chamado_manutencaos`, `regua_cobrancas`, `repasse_proprietarios`, `alugueis`, e `proprietario` (singular). Fixe via `TableName()` em GORM.
5. **`proprietario` é divergente**: nome de model minúsculo, tabela singular, timestamps `createdAt`/`updatedAt` (camelCase) — todo o resto do cluster usa `created_at`/`updated_at`. Em GORM, mapear com tags de coluna explícitas.
6. **Colunas "schema-safe"**: vários routers (`clienteAluguel`, `contratoAluguel`, `contratoRoutes`, `portalInquilino`) chamam `describeTable('cliente_aluguels')` em runtime e filtram atributos, tolerando bancos sem colunas novas (`proprietario_id`, `contrato_documentos`, `tenant_id`). Em Go com migrations versionadas isso deixa de ser necessário — **garanta o schema completo por migration** e remova a lógica condicional.
7. **Filtro de tenant inconsistente**: `alugueisRouter.listarAlugueis()` faz `findAll` sem `tenant_id`; `dashboardAluguel`, `vistorias`, `chamados`, `repasses`, `cobranças` também não filtram tenant. Já `proprietarios`, `contratos`, `contratoRoutes` filtram (`tenant_id = req.tenantId OR NULL`). **Padronizar** o isolamento no Go.
8. **Bug latente na régua**: o cron chama `processarReguaCobranca(ClienteAluguel, CobrancaAluguel, ReguaCobranca, enviarWhatsAppMsg)` — sem o 5º arg `isAuthenticated`, e passa uma **função** onde o service espera um cliente com `.sendMessage()`. Ou seja, o envio real via `whatsappClient.sendMessage` **nunca dispara** (registra `ReguaCobranca` mas não manda WhatsApp). Ao migrar, redesenhar o contrato do envio (injetar um `WhatsAppSender` com interface clara).
9. **Puppeteer** é usado em `contratoService` e `vistoriaRoutes` para PDF (headless Chromium). Em Go, substituir por `chromedp`, `wkhtmltopdf`, `gotenberg` ou serviço externo — decidir cedo (impacta Dockerfile).
10. **JSON/JSONB**: `historico_pagamentos`, `score_detalhes`, `contrato_documentos` (JSONB), `checklist`, `fotos`. Mapear como `datatypes.JSON`/structs em GORM. Persistência de JSON no Sequelize exige `changed(...,true)` — em GORM salvar o campo diretamente resolve.
11. **`historico_pagamentos` com id `Date.now()`** (não é PK de tabela) — array embutido; o webhook e a rota manual dão append. Manter como lista embutida.
12. **Webhook sempre responde 200** (mesmo em erro) para evitar retries do Asaas. Preservar.
13. **Segredo do portal**: fallback `'portal-inquilino-secret'` quando `JWT_SECRET_KEY` ausente — **remover fallback** em produção Go (falhar explicitamente).
14. **Colisão de rota em vistorias**: `/vistorias/:id` e `/vistorias/cliente/:id` e `/vistorias/:clienteId/comparativo` coexistem; a ordem no Express resolve porque `cliente` e o sufixo `comparativo` são literais. No Gin, cuidar da ordem/segmentos para não capturar `cliente` como `:id`.
15. **WhatsApp via HTTP interno**: cron/webhook/chamados chamam `POST {BACKEND_URL}/api/whatsapp/send-message` (Baileys) — acoplamento HTTP loopback, não chamada de função. Em Go, considerar chamada direta a um serviço interno.

---

## Layout Go proposto

Arquitetura modular (Gin + GORM), um pacote por agregado, com serviços de domínio e integração isolada. Sugestão alinhada aos demais docs de migração:

```
backend-go/
├── cmd/
│   └── server/main.go
├── internal/
│   ├── modules/
│   │   ├── alugueis/                # imóveis de locação (Aluguel) + inquilinos (ClienteAluguel) + cobranças
│   │   │   ├── handler.go           # Gin: /alugueis, /clientealuguel, /alugueis-disponiveis
│   │   │   ├── service.go           # criar/atualizar/toggle/deletar; parseCurrency; fotos
│   │   │   ├── inquilino_service.go # CRUD inquilino + integração Asaas (assinatura/cobrança)
│   │   │   ├── cobranca_service.go  # régua, multa/juros, sync Asaas
│   │   │   ├── repository.go        # GORM (tenant-aware)
│   │   │   ├── model.go             # Aluguel, ClienteAluguel, CobrancaAluguel, ReguaCobranca
│   │   │   └── dto.go
│   │   ├── contratos/               # contratoAluguel + contratoRoutes
│   │   │   ├── handler.go           # /contratos*, /clientealuguel/:id/contrato*, /reajuste*
│   │   │   ├── service.go           # gerar texto/PDF, reajuste, vínculo, documentos
│   │   │   ├── pdf.go               # geração via chromedp/gotenberg
│   │   │   └── template.go          # markdown->html do contrato
│   │   ├── proprietarios/
│   │   │   ├── handler.go           # /proprietarios
│   │   │   ├── service.go
│   │   │   └── model.go             # Proprietario (TableName "proprietario")
│   │   ├── repasses/                # repasseRoutes + repasseService
│   │   │   ├── handler.go           # /repasses*, /clientealuguel/:id/multa-juros
│   │   │   ├── service.go           # processarRepasse, reenviarRepasse, resumo
│   │   │   └── model.go             # RepasseProprietario
│   │   ├── vistorias/
│   │   │   ├── handler.go           # /vistorias*
│   │   │   ├── service.go           # checklist padrão, comparativo
│   │   │   ├── pdf.go               # laudo PDF
│   │   │   └── model.go             # VistoriaAluguel
│   │   ├── chamados/
│   │   │   ├── handler.go           # /portal/chamados (inquilino) + /chamados (admin)
│   │   │   ├── service.go
│   │   │   └── model.go             # ChamadoManutencao
│   │   ├── portalinquilino/
│   │   │   ├── handler.go           # /portal/login, meus-dados, cobrancas, recibos, contrato
│   │   │   ├── auth.go              # JWT tipo:"inquilino", middleware AuthInquilino
│   │   │   └── service.go
│   │   └── dashboardalugueis/
│   │       └── handler.go           # /dashboard/alugueis (agregações)
│   ├── platform/
│   │   ├── asaas/                   # cliente HTTP Asaas (por-tenant apiKey): clientes, assinaturas, cobranças, PIX transfer
│   │   ├── whatsapp/                # sender interface (Baileys/HTTP)
│   │   ├── score/                   # scoreInquilinoService (Gemini + fallback local)
│   │   ├── pdf/                     # engine PDF compartilhado (contratos, vistorias, recibos)
│   │   └── tenant/                  # resolveTenant, addTenantFilter equivalentes
│   ├── jobs/
│   │   └── scheduler.go             # robfig/cron: régua, sync Asaas, score, reajuste, relatório mensal, backup
│   ├── middleware/
│   │   ├── auth.go                  # JWT usuário do sistema + tabela Token
│   │   └── tenant.go
│   └── webhooks/
│       └── asaas.go                 # /asaas/webhook[/:tenantSlug] — dispara cobrança/recibo/repasse
└── docs/migration/04-alugueis.md
```

### Notas de mapeamento GORM
- Definir `TableName()` para preservar os nomes exatos (`cliente_aluguels`, `cobranca_aluguels`, `vistoria_aluguels`, `chamado_manutencaos`, `regua_cobrancas`, `repasse_proprietarios`, `alugueis`, `proprietario`).
- Campos JSON/JSONB → `datatypes.JSON` (ou struct + `gorm:"serializer:json"`).
- Decimais monetários → `decimal.Decimal` (shopspring) ou `float64` com arredondamento controlado (o código atual usa `Math.round(x*100)/100`).
- `Proprietario`: tags de coluna `createdAt`/`updatedAt` (camelCase, exceção do cluster).
- Duas identidades de autenticação distintas: middleware de **usuário do sistema** (Bearer + tabela Token + tenant) e middleware de **inquilino** (JWT `tipo:"inquilino"`, sem tenant). Mantê-las separadas em pacotes distintos.
- Encapsular WhatsApp e Asaas como interfaces injetáveis para tornar régua/repasse testáveis (resolve o bug do item 8 dos Gotchas).
- Padronizar isolamento por tenant em TODAS as queries do cluster (corrigir as que hoje ignoram `tenant_id`).
```
