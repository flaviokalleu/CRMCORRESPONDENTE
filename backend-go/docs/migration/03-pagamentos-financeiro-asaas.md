# 03 — Pagamentos e Financeiro (migração Node/Express → Go/Gin + GORM)

> Especificação de migração **grounded no código real** de `backend/src`.
> Cluster: **Pagamentos e Financeiro**. Foco especial: **substituir Mercado Pago por Asaas**.
> Este documento NÃO contém código Go — é o inventário/contrato para implementação posterior.

## Visão geral

O backend possui **dois subsistemas de cobrança que coexistem e usam gateways diferentes**:

| Subsistema | Gateway atual | Modelo | Estado |
|---|---|---|---|
| **Pagamentos avulsos de clientes** (boleto/PIX/cartão via link/checkout) | **Mercado Pago** (`Preference` / checkout hospedado) | `Pagamento` | **SAI** — deve migrar 100% para Asaas |
| **Aluguéis recorrentes** (assinatura mensal + repasse PIX ao proprietário) | **Asaas** (`asaasService.js` JÁ implementado) | `ClienteAluguel`, `CobrancaAluguel`, `RepasseProprietario` | **FICA** — já é Asaas, apenas portar para Go |
| **Billing SaaS** (assinatura de plano por tenant) | **Nenhum** (só grava no DB, campos `gateway_*` ociosos) | `Subscription`, `Plan` | **A CONSTRUIR** — plugar Asaas subscriptions |

Pontos-chave:
- O Mercado Pago usa **checkout hospedado por preferência** (`init_point`), não cria boleto/PIX server-side com linha digitável/QR. Os campos `codigo_barras`, `linha_digitavel`, `qr_code` do modelo `Pagamento` existem mas **não são populados** pelo fluxo MP atual.
- O Asaas (`asaasService.js`) já cobre customers, subscriptions, payments (cobrança avulsa), PIX QR Code, linha digitável de boleto, transfers (repasse PIX) e saldo. É **multi-tenant**: cada `Tenant` pode ter `asaas_api_key` e `asaas_webhook_token` próprios (fallback para chave global `.env`).
- Toda a lógica de negócio "pós-pagamento" (recibo PDF, WhatsApp, repasse ao proprietário, comissão do corretor) está **acoplada ao webhook Asaas** (`routes/asaasWebhook.js`), NÃO ao webhook MP.

### Arquivos do cluster (referência)

| Papel | Arquivo | Notas |
|---|---|---|
| Rotas pagamentos MP | `routes/pagamentos.js` (~1982 linhas) | boleto/pix/universal + webhook MP + CRUD |
| Webhook Asaas | `routes/asaasWebhook.js` | aluguéis recorrentes |
| Financeiro CRUD | `routes/receitas.js`, `despesas.js`, `comissoes.js`, `fluxocaixa.js` | CRUD genérico |
| Repasses | `routes/repasseRoutes.js` | repasse PIX ao proprietário |
| Service Asaas (FICA) | `services/asaasService.js` (326 linhas) | client HTTP + funções |
| Service MP (SAI) | `services/mercadoPagoService.js` (549 linhas) | preferências |
| Config MP (SAI) | `config/mercadoPago.js` | client alternativo, usa `MP_ACCESS_TOKEN` |
| Service pagamento | `services/pagamentoService.js` | utils + CRUD + mapeia status MP |
| Repasse | `services/repasseService.js` | cálculo + transfer PIX Asaas |
| Recibo PDF | `services/reciboService.js` | puppeteer → PDF |
| Controllers | `controllers/pagamentoController.js`, `receitaController.js`, `despesaController.js`, `comissaoController.js`, `fluxocaixaController.js` | |
| Job parcelas (SAI) | `jobs/enviarParcelas.js` | cron MP parcelas |
| Cron aluguéis (FICA) | `routes/cronJobs.js` | sincroniza cobranças Asaas |
| Models | `Pagamento.js`, `receita.js`, `despesa.js`, `comissao.js`, `fluxocaixa.js`, `repasseproprietario.js`, `cobrancaaluguel.js`, `clientealuguel.js`, `subscription.js`, `plan.js`, `tenant.js` | |

---

## Endpoints (tabelas)

### Montagem no `routes/index.js`
Ordem de mount (relevante):
- `app.use('/api', asaasWebhookRoutes)` → webhook Asaas (público, sem auth global)
- `app.use('/api/pagamentos', pagamentosRoutes)` → auth aplicada **dentro** do router (`router.use(authenticateToken)` na linha 372; rotas acima dela são públicas)
- `app.use('/api', authenticateToken, resolveTenant, clienteAluguelRoutes)` → aluguéis
- `app.use('/api', <auth p/ /repasses>, repasseRoutes)` → repasses (auth condicional inline)
- `app.use('/api/receitas'|'/despesas'|'/comissoes'|'/fluxocaixa', authenticateToken, resolveTenant, ...)` → financeiro

### 1. Pagamentos — Mercado Pago (`routes/pagamentos.js`) — mount `/api/pagamentos`

| Método | Path completo | Auth | Role | Entrada | Resposta | Status | Regra |
|---|---|---|---|---|---|---|---|
| POST | `/api/pagamentos/webhook` | **público** | — | body MP `{type, action, data:{id}, live_mode}` | `{received}` | 200/400 | Recebe notificação MP. Busca `Payment` no MP por `data.id`, casa com `Pagamento` local via `external_reference` (`/^(boleto\|pix)_(\d+)_(\d+)$/`) ou por valor (±0.01) nas últimas 24h. Mapeia status MP→local e atualiza; dispara WhatsApp p/ cliente/admins/criador se aprovado. **SEMPRE 200** salvo body inválido (400). **→ substituir por webhook Asaas** |
| POST | `/api/pagamentos/webhook/test` | público | — | qualquer | eco | 200 | Debug do webhook |
| GET | `/api/pagamentos/publico/:id` | **público** | — | `:id` | pagamento (attrs limitados do cliente) | 200/404 | Página pública de pagamento (checkout) |
| POST | `/api/pagamentos/boleto` | Bearer | admin* | `{cliente_id, titulo, descricao, valor, data_vencimento, observacoes, parcelas=1, enviar_whatsapp=true, enviar_email=true}` | `{success, pagamento, mercado_pago:{preference_id, init_point}, envios}` | 201/400/404/500 | Cria `Pagamento` tipo `boleto`, chama `criarPreferenciaBoleto`, grava `mp_preference_id`+`init_point`, envia WhatsApp/email. **→ Asaas `/payments` billingType BOLETO** |
| POST | `/api/pagamentos/pix` | Bearer | admin* | `{cliente_id, titulo, descricao, valor, observacoes, enviar_whatsapp, enviar_email}` | idem boleto | 201/400/404/500 | Cria `Pagamento` tipo `pix`, expira em `PIX_EXPIRE_MINUTES` (30). **→ Asaas `/payments` billingType PIX + `/pixQrCode`** |
| POST | `/api/pagamentos/universal` | Bearer | admin* | `{cliente_id, titulo, descricao, valor, data_vencimento, observacoes, enviar_whatsapp, enviar_email}` | idem, com `link_unico` | 201/400/404/500 | Cria `Pagamento` tipo `universal` (checkout aceita todos métodos). **→ Asaas `/payments` billingType UNDEFINED** |
| POST | `/api/pagamentos/:id/enviar-whatsapp` | Bearer | **admin** | `:id` | `{success}` | 200/403/404 | Reenvia link via Baileys. Requer `user.is_administrador` |
| POST | `/api/pagamentos/:id/enviar-email` | Bearer | admin | `:id` | resultado | 200/404 | Reenvia por email (simulado) |
| GET | `/api/pagamentos/` | Bearer | admin/criador | query `{page, limit, status, tipo, cliente_id}` | `{pagamentos[], total, page, totalPages}` | 200 | Lista paginada; não-admin vê só `criado_por = userId` |
| GET | `/api/pagamentos/whatsapp/status` | Bearer | — | — | `{connected, status}` | 200 | Status Baileys |
| GET | `/api/pagamentos/config` | Bearer | — | — | `{maxParcelas, boletoDaysToExpire, pixExpireMinutes, ...}` | 200 | Config do sistema |
| GET | `/api/pagamentos/mercadopago/config` | Bearer | — | — | `{publicKey, ready}` | 200 | **→ REMOVER** (config MP) |
| GET | `/api/pagamentos/mercadopago/test` | Bearer | — | — | `{success, preferenceId}` | 200/500 | **→ REMOVER / trocar por `asaas/test`** |
| GET | `/api/pagamentos/:id` | Bearer | admin/criador | `:id` | pagamento + cliente + criador | 200/403/404 | Se aprovado sem `receipt_url`, busca comprovante no MP. **→ Asaas `invoiceUrl`** |
| DELETE | `/api/pagamentos/:id` | Bearer | admin | `:id` | `{message}` | 200/400/403/404 | Não permite excluir `aprovado` |
| PUT | `/api/pagamentos/:id` | Bearer | admin | campos permitidos | pagamento | 200/400/403/404 | Só edita `pendente`; campos: titulo, descricao, valor, data_vencimento, parcelas, observacoes |
| POST | `/api/pagamentos/verificar-status` | Bearer | **admin** | `{pagamento_id?}` | resultado | 200/403 | Consulta status no MP e sincroniza local. **→ Asaas `GET /payments/:id`** |
| POST | `/api/pagamentos/:id/reenviar-notificacoes` | Bearer | admin | `{notificar_criador?}` | `{resultados}` | 200/403 | Reenvia notificações de aprovado |

*admin*: as rotas de criação buscam `User.findOne({email: req.user.email})` mas não exigem `is_administrador` explicitamente (só `/enviar-whatsapp`, `/verificar-status`, lista, delete, put exigem). Validar por role no Go conforme cada rota.

### 2. Webhook Asaas (`routes/asaasWebhook.js`) — mount `/api`

| Método | Path completo | Auth | Entrada | Resposta | Status | Regra |
|---|---|---|---|---|---|---|
| POST | `/api/asaas/webhook/:tenantSlug` | token header | body Asaas `{event, payment}` + header `asaas-access-token` | `{received}` | 200/401/404 | Webhook **por tenant**: resolve `Tenant` por slug, valida `asaas_webhook_token` do tenant, usa `asaas_api_key` do tenant. |
| POST | `/api/asaas/webhook` | token global | idem | `{received}` | 200/401 | Rota legada, usa `ASAAS_WEBHOOK_TOKEN` global + chave `.env` |
| GET | `/api/asaas/teste` | público | — | `{success, environment, balance}` | 200/500 | Testa conexão Asaas (chave global) |

### 3. Repasses ao proprietário (`routes/repasseRoutes.js`) — mount `/api` (auth+tenant só p/ `/repasses*`)

| Método | Path completo | Auth | Entrada | Resposta | Status | Regra |
|---|---|---|---|---|---|---|
| GET | `/api/repasses` | Bearer+tenant | query `{mes, status, transfer_status}` | `RepasseProprietario[]` + clienteAluguel | 200 | Lista repasses |
| POST | `/api/repasses/gerar` | Bearer+tenant | `{mes:"YYYY-MM", enviar_pix:bool}` | `{message, transferencias_pix, erros?}` | 200/400 | Gera repasses do mês para cobranças `CONFIRMED/RECEIVED`, dispara PIX via Asaas |
| POST | `/api/repasses/:id/transferir` | Bearer+tenant | `:id` | `{message, repasse}` | 200/500 | Retenta PIX de repasse `FALHOU`/`SEM_PIX` |
| PUT | `/api/repasses/:id/confirmar` | Bearer+tenant | `{observacao?}` | repasse | 200/404 | Marca `REALIZADO` manualmente (sem PIX) |
| GET | `/api/repasses/resumo` | Bearer+tenant | query `{mes}` | totais agregados + repasses | 200/400 | Somatórios de aluguel/taxa/repasse/comissão |
| GET | `/api/clientealuguel/:id/multa-juros` | **sem auth** (fora do prefixo `/repasses`) | `:id` | array multa/juros por cobrança OVERDUE | 200/404 | Usa `reguaCobrancaService.calcularMultaJuros` |

> ⚠️ Gotcha: no Go, replicar que **só paths iniciando com `/repasses`** recebem auth+tenant. `/clientealuguel/:id/multa-juros` está no mesmo router mas **sem** middleware.

### 4. Financeiro CRUD — mount `/api/receitas`, `/api/despesas`, `/api/comissoes`, `/api/fluxocaixa` (todos `authenticateToken` + `resolveTenant`)

`receitas`, `despesas`, `comissoes` têm o **mesmo shape CRUD**:

| Método | Path | Handler | Entrada | Resposta | Status |
|---|---|---|---|---|---|
| POST | `/api/{recurso}/` | create | body do model | registro | 201/400 |
| GET | `/api/{recurso}/` | list | — | `[]` (⚠️ **sem filtro de tenant** hoje) | 200/500 |
| GET | `/api/{recurso}/:id` | get | `:id` | registro | 200/404 |
| PUT | `/api/{recurso}/:id` | update | body | registro | 200/400/404 |
| DELETE | `/api/{recurso}/:id` | delete | `:id` | — | 204/404/500 |

`fluxocaixa` = CRUD acima **+**:

| Método | Path | Handler | Resposta | Regra |
|---|---|---|---|---|
| GET | `/api/fluxocaixa/dashboard` | dashboard | `{totalReceitas, totalDespesas, lucro, pendencias}` | `Receita.sum('valor') - Despesa.sum('valor')`; pendências = registros com `data > hoje` (⚠️ **sem filtro tenant** — corrigir no Go) |

---

## De-Para Mercado Pago → Asaas

### Endpoints/SDK

| Operação (uso atual MP) | Chamada MP atual | Equivalente Asaas API v3 | Já existe em `asaasService.js`? |
|---|---|---|---|
| Criar cliente (payer) | embutido na `Preference.payer` | `POST /customers` `{name, cpfCnpj, email, phone, notificationDisabled}` | ✅ `criarCliente` |
| Buscar cliente | — | `GET /customers/:id` | ✅ `buscarCliente` |
| Boleto (link/checkout) | `criarPreferenciaBoleto` → `Preference.create` (`init_point`) | `POST /payments` `{customer, billingType:"BOLETO", value, dueDate, description}` → `invoiceUrl`/`bankSlipUrl` | ✅ `criarCobrancaAvulsa` (billingType `UNDEFINED`; ajustar p/ `BOLETO`) |
| Linha digitável do boleto | não suportado no fluxo MP | `GET /payments/:id/identificationField` | ✅ `buscarIdentificacaoBoleto` |
| PIX (link/checkout) | `criarPreferenciaPix` → `Preference.create` | `POST /payments` `{billingType:"PIX", ...}` | ✅ `criarCobrancaAvulsa` (billingType `PIX`) |
| PIX QR Code / copia-e-cola | não suportado no fluxo MP | `GET /payments/:id/pixQrCode` → `{encodedImage, payload, expirationDate}` | ✅ `buscarPixQrCode` |
| Universal (todos métodos) | `criarPreferenciaUniversal` | `POST /payments` `{billingType:"UNDEFINED"}` (cliente escolhe) | ✅ `criarCobrancaAvulsa` |
| Cartão de crédito parcelado | `installments` na preferência | `POST /payments` `{billingType:"CREDIT_CARD", creditCard{}, installmentCount, installmentValue}` | ⚠️ **falta** — implementar tokenização/`creditCardToken` |
| Cálculo de juros por parcela | `calcularJurosPorTipo` (lógica local) | manter lógica local OU usar `interest`/`fine`/`discount` no payload Asaas | lógica local (portar) |
| Buscar pagamento | `Payment.get({id})` | `GET /payments/:id` | ✅ `buscarCobranca` |
| Comprovante / receipt | `transaction_details.external_resource_url` | `invoiceUrl` (fatura) / `transactionReceiptUrl` | via `buscarCobranca` |
| Assinatura recorrente | não usado (MP só avulso) | `POST /subscriptions` `{customer, billingType, value, nextDueDate, cycle:"MONTHLY", description}` | ✅ `criarAssinatura` |
| Atualizar assinatura | — | `PUT /subscriptions/:id` | ✅ `atualizarAssinatura` |
| Cancelar assinatura | — | `DELETE /subscriptions/:id` | ✅ `cancelarAssinatura` |
| Listar cobranças da assinatura | — | `GET /payments?subscription=:id` | ✅ `listarCobrancasPorAssinatura` |
| Listar cobranças do cliente | — | `GET /payments?customer=:id` | ✅ `listarCobrancasPorCliente` |
| Transferência PIX (repasse) | não usado | `POST /transfers` `{value, pixAddressKey, pixAddressKeyType, description}` | ✅ `realizarTransferenciaPix` |
| Saldo da conta | não usado | `GET /finance/getCurrentBalance` | ✅ `buscarSaldo` |
| Webhook | `notification_url` na preferência; handler busca `Payment` | webhook configurado no painel Asaas + handler `event`/`payment` | ✅ handler existente |

### Mapeamento de status

| Status MP (`Pagamento.status`) | Origem MP | Status Asaas (`event`) | Status local aluguel (`CobrancaAluguel.status`) |
|---|---|---|---|
| `aprovado` | `approved` | `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` | `CONFIRMED` / `RECEIVED` |
| `pendente` | `pending` / `in_process` | `PAYMENT_CREATED` | `PENDING` |
| `rejeitado` | `rejected` | — | — |
| `cancelado` | `cancelled` | `PAYMENT_DELETED` | `CANCELLED` |
| `estornado`/`reembolsado` | `refunded` / `charged_back` | `PAYMENT_REFUNDED` | `REFUNDED` |
| — | — | `PAYMENT_OVERDUE` | `OVERDUE` |

> No Go, unificar os ENUMs de `Pagamento` (avulso) para o vocabulário Asaas OU manter o mapa `pagamentoService.mapearStatusMP` reescrito como `mapAsaasStatus`. Recomendado: adotar status Asaas como canônico e traduzir para PT-BR só na resposta da API.

### Campos do model `Pagamento` a renomear/remapear

| Campo atual (MP) | Ação na migração Asaas |
|---|---|
| `mp_preference_id` | → `asaas_payment_id` (ou novo `asaas_customer_id`) |
| `mp_payment_id` | → `asaas_payment_id` |
| `dados_mp` (JSONB) | → `dados_gateway` (JSONB) — payload bruto Asaas |
| `link_pagamento` (era `init_point`) | → `invoice_url` (Asaas `invoiceUrl`) |
| `comprovante_url` / `receipt_url` | → `invoice_url` / `transactionReceiptUrl` |
| `codigo_barras`, `linha_digitavel` | populáveis agora via `identificationField` (antes vazios) |
| `qr_code`, `qr_code_base64` | populáveis via `pixQrCode` (antes vazios) |
| `calculo_mp`, `juros_mp`, `valor_com_juros` | manter (juros calculados localmente) |

---

## Webhook Asaas (detalhado — `routes/asaasWebhook.js`)

**Eventos tratados** (campo `event` do body):

| Evento | Ação no sistema |
|---|---|
| `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED` | `CobrancaAluguel.status = CONFIRMED`, grava `data_pagamento`; marca `ClienteAluguel.pago=true`; adiciona ao `historico_pagamentos` (JSON); **gera recibo PDF** (`reciboService.gerarReciboPDF`) e grava `recibo_url`; envia WhatsApp de confirmação; **processa repasse PIX ao proprietário** (`repasseService.processarRepasse`) |
| `PAYMENT_OVERDUE` | `status=OVERDUE`, `pago=false`, WhatsApp de cobrança com `invoice_url` |
| `PAYMENT_CREATED` | `status=PENDING`, grava `invoice_url`/`bank_slip_url`/`billing_type` |
| `PAYMENT_REFUNDED` | `status=REFUNDED` |
| `PAYMENT_DELETED` | `status=CANCELLED` |
| default | log "evento não tratado" |

**Validação de assinatura/token**:
- Header esperado: `asaas-access-token`.
- Rota por tenant: compara com `tenant.asaas_webhook_token`. Se não bate → **401**.
- Rota legada: compara com `process.env.ASAAS_WEBHOOK_TOKEN`.
- Se `webhookToken` é null (não configurado) → **pula validação** (aceita tudo). ⚠️ No Go, exigir token sempre em produção.

**Idempotência** (implícita, precisa ser reforçada no Go):
- Busca `CobrancaAluguel` por `asaas_payment_id` (coluna `UNIQUE`).
- Se não existe e veio de `payment.subscription`, **cria** a cobrança (auto-provisiona cobranças recorrentes geradas pela assinatura Asaas).
- Se não encontra cobrança nem subscription → responde `200 {received:true}` sem efeito.
- **Não há tabela de deduplicação de eventos** — reprocessar `PAYMENT_CONFIRMED` re-executaria recibo/WhatsApp/repasse. O repasse é protegido por `RepasseProprietario` único por `cobranca_aluguel_id`; recibo/WhatsApp **não são idempotentes**. ➜ **Ação Go**: criar tabela `webhook_events(asaas_event_id UNIQUE, processed_at)` e checar antes de processar; Asaas envia `id` do evento.

**Resiliência**: qualquer erro interno responde **200** (evita retries do Asaas). No Go, manter 200 para erros de negócio, mas 401 para token inválido.

**Sincronização por cron** (`routes/cronJobs.js`, a cada 30 min): `sincronizarCobrancasAsaas` percorre `ClienteAluguel` com `asaas_subscription_id`, chama `listarCobrancasPorAssinatura` e faz upsert de `CobrancaAluguel` (fallback caso webhook falhe). Mapa `mapAsaasStatusCron`. **Portar como goroutine agendada.**

---

## Financeiro (receitas / despesas / comissões / fluxo / repasses)

### Fluxo de repasse ao proprietário (núcleo financeiro dos aluguéis)

`repasseService.processarRepasse(cobranca, cliente, enviarWhatsAppFn, apiKey)`:
1. Idempotência: se já existe `RepasseProprietario` para `cobranca_aluguel_id`, retorna o existente.
2. Cálculo:
   - `valor_aluguel = cobranca.valor || cliente.valor_aluguel`
   - `taxa = cliente.taxa_administracao` (default 10%)
   - `valor_taxa = round2(valor_aluguel * taxa/100)`
   - `valor_repasse = round2(valor_aluguel - valor_taxa)`
   - `comissao_corretor = round2(valor_aluguel * cliente.corretor_percentual/100)`
   - `mes_referencia = cobranca.data_vencimento[0:7]` (`YYYY-MM`)
3. Cria `RepasseProprietario` (`status=PENDENTE`, `transfer_status=PENDENTE`).
4. Se `cliente.proprietario_pix` vazio → `transfer_status=SEM_PIX`, aguarda repasse manual.
5. Senão: `transfer_status=PROCESSANDO` → `asaasService.realizarTransferenciaPix` → em sucesso `status=REALIZADO`, grava `asaas_transfer_id`, `data_repasse`; notifica proprietário via WhatsApp. Em erro → `transfer_status=FALHOU`, grava `transfer_error`.

`reenviarRepasse(repasseId, ...)`: retenta PIX para repasse `FALHOU`/`SEM_PIX` (bloqueia se já `REALIZADO`).

**Estados** `transfer_status`: `PENDENTE | PROCESSANDO | REALIZADO | FALHOU | SEM_PIX`. **Estados** `status`: `PENDENTE | REALIZADO`.

### Multa e juros (`reguaCobrancaService.calcularMultaJuros`)
Entrada: `valor`, `percentual_multa` (default 2%), `percentual_juros_mora` (default 1% a.m.), `diasAtraso`. Usado em `/api/clientealuguel/:id/multa-juros` sobre cobranças `OVERDUE`.

### CRUD financeiro
`receitas`/`despesas`/`comissoes`/`fluxocaixa` são CRUD simples (controllers finos que delegam ao model). ⚠️ **Bugs a corrigir no Go**:
- `list`/`dashboard`/`sum` **não filtram por `tenant_id`** — vazam dados entre tenants. No Go, **sempre** aplicar escopo de tenant.
- Models usam `underscored: false` (colunas camelCase: `contratoId`, `corretorId`, `referenciaId`, `referenciaTipo`) — **diferente** do padrão `underscored` do resto do projeto. Preservar nomes de coluna no GORM (`gorm:"column:contratoId"`).

---

## Billing SaaS (assinatura de planos por tenant)

**Estado atual**: `Subscription` é criada em `tenantService`/`planService`/`tenantRoutes` apenas como registro local (`status=trialing|active`), **sem cobrança real**. Os campos `gateway_subscription_id`, `gateway_customer_id`, `gateway`, `proximo_pagamento`, `tentativas_cobranca` existem mas **nunca são preenchidos**. Não há chamada a MP nem Asaas para o billing SaaS.

**Fluxo atual**:
- Onboarding (`tenantService.registrarTenant` / `tenantRoutes` POST): cria `Tenant` + `User` admin + `Subscription` (plano escolhido ou `free`). Trial se `plan.trial_dias > 0`.
- `planService.changePlan(tenantId, plan_id, ciclo)`: cancela assinatura ativa (`status=canceled`), cria nova; `valor = ciclo==='anual' ? preco_anual : preco_mensal`.
- Enforcement: middleware `checkSubscription` + `getPlanUsage` (rota `/api/plan-usage`) validam limites do plano (`max_clientes`, `max_usuarios`, `has_whatsapp`, etc.).

**A construir na migração (Asaas SaaS billing)**:
1. Ao contratar plano pago: `POST /customers` (dados do tenant/admin) → gravar em `gateway_customer_id`, `gateway='asaas'`.
2. `POST /subscriptions` `{customer, billingType, value: plan.preco_mensal|anual, cycle: MONTHLY|YEARLY, nextDueDate}` → gravar `gateway_subscription_id`.
3. Webhook Asaas SaaS (separado do webhook de aluguéis, ou discriminar por `subscription` id): em `PAYMENT_CONFIRMED` → `Subscription.status=active`, atualiza `proximo_pagamento`; em `PAYMENT_OVERDUE` → `past_due`, incrementa `tentativas_cobranca`; após N falhas → `suspended`.
4. `changePlan` deve refletir no Asaas (`PUT /subscriptions/:id` ou cancelar+criar).

**Tabelas SaaS**:

`plans`: `id, nome, slug(unique), descricao, preco_mensal, preco_anual, max_clientes, max_usuarios, max_imoveis, max_alugueis, has_whatsapp, has_pagamentos, has_ai_analysis, has_relatorios_avancados, has_multi_usuarios, has_api_access, has_suporte_prioritario, has_dominio_customizado, max_storage_mb, max_file_size_mb, features_extras(JSONB), ativo, ordem, trial_dias, created_at, updated_at`

`subscriptions`: `id, tenant_id(FK), plan_id(FK), status(ENUM trialing|active|past_due|canceled|suspended), ciclo(ENUM mensal|anual), data_inicio, data_fim, data_fim_trial, valor, gateway_subscription_id, gateway_customer_id, gateway, proximo_pagamento, tentativas_cobranca, cancelado_em, motivo_cancelamento, metadata(JSONB), created_at, updated_at`

Métodos de domínio a portar: `isActive()`, `isTrialing()`, `daysRemaining()`.

---

## Tabelas / colunas (referência de schema)

### `pagamentos` (model `Pagamento`) — subsistema MP → Asaas
`id, cliente_id(FK clientes), created_by(FK users), mp_preference_id, mp_payment_id, tipo(ENUM boleto|pix|cartao|universal, default universal), status(ENUM pendente|aprovado|rejeitado|cancelado|expirado|aguardando), titulo, descricao(TEXT), valor(STRING formatado), valor_numerico(DECIMAL 10,2), parcelas(INT default 1), valor_parcela(STRING), valor_parcela_numerico, whatsapp_enviado(BOOL), email_enviado(BOOL), data_envio_whatsapp, data_envio_email, data_vencimento, data_pagamento, link_pagamento(TEXT=init_point), link_curto, codigo_barras, linha_digitavel, qr_code(TEXT), qr_code_base64(TEXT), observacoes(TEXT), dados_mp(JSONB), comprovante_url(TEXT), valor_original, valor_original_numerico, juros_total, juros_total_numerico, taxa_juros(DECIMAL 5,2), calculo_mp(BOOL), parcela_atual(INT), pagamento_pai_id, is_parcelado(BOOL), data_envio_proxima_parcela, juros_mp(DECIMAL 10,2), valor_com_juros(DECIMAL 10,2), link_unico(STRING unique), tenant_id(FK), created_at, updated_at`
> Nota: model tem `receipt_url`/`comprovante_url` referenciados no service — confirmar coluna real na migração.

### `cobranca_aluguels` (model `CobrancaAluguel`) — Asaas (FICA)
`id, cliente_aluguel_id(FK), asaas_payment_id(STRING unique), valor(DECIMAL 10,2), data_vencimento(DATEONLY), data_pagamento(DATEONLY), status(STRING default PENDING), billing_type(STRING default UNDEFINED), invoice_url, bank_slip_url, pix_qr_code(TEXT), tipo(STRING default recorrente), descricao, recibo_url, created_at, updated_at` (`underscored`)

### `cliente_aluguels` (model `ClienteAluguel`) — campos financeiros/Asaas relevantes
`asaas_customer_id, asaas_subscription_id, asaas_subscription_status, historico_pagamentos(JSON), pago(BOOL), valor_aluguel, dia_vencimento, data_inicio_contrato, data_fim_contrato, indice_reajuste(default IGPM), percentual_multa(DECIMAL 5,2 default 2), percentual_juros_mora(default 1), proprietario_nome, proprietario_telefone, proprietario_pix, taxa_administracao(DECIMAL 5,2 default 10), corretor_percentual(DECIMAL 5,2 default 0), corretor_nome, corretor_pix, tenant_id, ...` (+ dados pessoais/fiador/score)

### `repasse_proprietarios` (model `RepasseProprietario`)
`id, cliente_aluguel_id, cobranca_aluguel_id, valor_aluguel(DECIMAL 10,2), taxa_administracao_percentual(DECIMAL 5,2), valor_taxa, valor_repasse, corretor_percentual, comissao_corretor, mes_referencia(STRING YYYY-MM), status(default PENDENTE), data_repasse(DATEONLY), observacao, asaas_transfer_id, transfer_status(PENDENTE|PROCESSANDO|REALIZADO|FALHOU|SEM_PIX), transfer_error(TEXT), created_at, updated_at` (`underscored`)

### `receitas` / `despesas` / `comissoes` / `fluxo_caixa` (⚠️ `underscored:false`, colunas camelCase)
- `receitas`: `id, tipo, valor(DECIMAL 12,2), descricao, data(DATEONLY), contratoId, tenant_id, createdAt, updatedAt`
- `despesas`: + `corretorId`
- `comissoes`: `id, valor(DECIMAL 12,2), percentual(DECIMAL 5,2), data, contratoId, corretorId, tenant_id`
- `fluxo_caixa`: `id, data, tipo, valor(DECIMAL 12,2), descricao, referenciaId, referenciaTipo, tenant_id`

### `tenants` — colunas Asaas
`asaas_api_key(STRING), asaas_webhook_token(STRING)` (+ demais campos do tenant)

---

## Remoção do Mercado Pago (checklist)

**Arquivos a remover/reescrever:**
- [ ] `services/mercadoPagoService.js` — **DELETAR** (549 linhas). Reescrever chamadas para `asaasService`/novo `asaas client` Go.
- [ ] `config/mercadoPago.js` — **DELETAR** (usa `MP_ACCESS_TOKEN`).
- [ ] `jobs/enviarParcelas.js` — **DELETAR ou reescrever** (cron de parcelas via `criarPreferenciaComJuros`). Se parcelamento continuar, portar para Asaas `installmentCount`.
- [ ] `routes/pagamentos.js` — reescrever: rota `POST /webhook` (MP) → remover/substituir por webhook Asaas; `POST /boleto|/pix|/universal` → Asaas `/payments`; `GET /mercadopago/config` e `/mercadopago/test` → **remover**; `GET /:id` e `POST /verificar-status` → trocar `Payment.get` MP por `asaasService.buscarCobranca`.
- [ ] `services/pagamentoService.js` — remover `require('./mercadoPagoService')`, `mapearStatusMP`, e o bloco em `obterPagamento` que busca receipt no MP.
- [ ] `controllers/pagamentoController.js` — remover `getMercadoPagoConfig`, `testMercadoPago`, `require('../services/mercadoPagoService')` e `mercadoPagoService.enviarEmail` (não existe no service — bug latente).

**Model / DB:**
- [ ] Renomear colunas `mp_preference_id`, `mp_payment_id`, `dados_mp`, `calculo_mp`, `juros_mp` → equivalentes gateway-agnósticas/Asaas (migração).
- [ ] `Subscription.gateway` comment "(Asaas/MercadoPago)" → só Asaas.

**CORS / origins (`server.js`):**
- [ ] Remover `mercadoPagoOrigins` (linhas ~63-66): `https://www.mercadopago.com.br`, `https://api.mercadopago.com`, `https://sandbox.mercadopago.com.br`.
- [ ] Remover concatenação `.concat(mercadoPagoOrigins)` e o spread `...mercadoPagoOrigins` no array `allowedOrigins` (usado no `cors` do Express e do Socket.io).
- [ ] Asaas usa webhook server-to-server (não precisa de origin CORS de navegador); não adicionar origins Asaas.

**Dependências (`package.json`):**
- [ ] Remover `"mercadopago": "^2.7.0"`.
- [ ] Manter `"axios"` (usado pelo `asaasService`). No Go, usar `net/http` ou `resty`.

**Variáveis de ambiente a remover:** `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY`, `MP_ACCESS_TOKEN`.
**Variáveis Asaas a garantir:** `ASAAS_API_KEY`, `ASAAS_ENVIRONMENT` (`sandbox|production`), `ASAAS_WEBHOOK_TOKEN` (global) — além das chaves por tenant em `tenants.asaas_api_key`/`asaas_webhook_token`.

**Frontend (fora do escopo deste doc, mas sinalizar):** o checkout MP (`init_point`/página `/pagamento/sucesso|erro|pendente`) e config `publicKey` precisam trocar para a fatura Asaas (`invoiceUrl`) / PIX QR Code.

---

## Gotchas

1. **Dois webhooks distintos**: `/api/pagamentos/webhook` (MP, avulso) e `/api/asaas/webhook[/:tenantSlug]` (Asaas, aluguéis). Só o segundo tem toda a lógica de recibo/repasse. Ao migrar avulsos para Asaas, **unificar** num handler que discrimine por `payment.subscription` (aluguel) vs cobrança avulsa (cliente).
2. **`valor` é STRING formatada** em `Pagamento` (ex: `"2.000,00"`); usar `valor_numerico` (DECIMAL) para cálculos. Já é um gotcha conhecido do `Cliente.valor_renda`. No Go, usar `decimal`/centavos e formatar só na saída.
3. **Idempotência de webhook ausente** para recibo/WhatsApp — reprocessamento duplica PDF e mensagens. Criar tabela de eventos processados no Go.
4. **Validação de token do webhook é opcional** (pulada se token null). Tornar obrigatória em produção.
5. **`asaasService` é multi-tenant com fallback global**: `getApi(apiKey)` usa chave do tenant ou `.env`. A instância `asaasApi` (Proxy) resolve lazy só a chave global — funções que a usam (`criarCliente`, `criarAssinatura`, `criarCobrancaAvulsa`, etc.) **ignoram a chave do tenant**; só `realizarTransferenciaPix`, `buscarSaldo`, `testarConexao` aceitam `apiKey`. ➜ No Go, **passar sempre a apiKey do tenant** em todas as chamadas.
6. **Financeiro CRUD vaza tenant**: `list`/`sum`/`dashboard` sem `WHERE tenant_id`. Corrigir no Go (escopo obrigatório).
7. **Models financeiros usam `underscored:false`** (colunas camelCase). Divergente do resto. Mapear colunas explicitamente no GORM.
8. **`/clientealuguel/:id/multa-juros`** está sem auth (fora do prefixo `/repasses` do middleware inline). Definir política no Go.
9. **Repasse depende de `proprietario_pix`**; sem chave → `SEM_PIX` (repasse manual). Tipo de chave detectado por `detectarTipoChavePix` (CPF/CNPJ/EMAIL/PHONE/EVP).
10. **`corretor_percentual` é % sobre o aluguel, dentro da taxa de administração** — comissão do corretor sai da taxa da imobiliária, não é adicional.
11. **BASE_URL Asaas difere por ambiente**: prod `https://api.asaas.com/v3`, sandbox `https://sandbox.asaas.com/api/v3`. Header de auth: `access_token: <key>` (não Bearer).
12. **SaaS billing não cobra nada hoje** — implementar do zero no Go se billing pago for requisito; campos `gateway_*` já existem.
13. **`pagamentoController.enviarEmail`** chama `mercadoPagoService.enviarEmail` que **não existe** no service (bug morto) — não replicar.
14. **Recibo via Puppeteer** (`reciboService`) — pesado/headless Chrome. No Go, avaliar `chromedp`, `gofpdf`/`maroto`, ou serviço externo de HTML→PDF.

---

## Layout Go proposto

```
internal/
├── modules/
│   ├── pagamentos/                 # cobranças avulsas de clientes (era Mercado Pago → Asaas)
│   │   ├── handler.go              # rotas /api/pagamentos (Gin)
│   │   ├── service.go              # criar boleto/pix/universal via asaas client; CRUD; status
│   │   ├── repository.go           # GORM: Pagamento
│   │   ├── model.go                # struct Pagamento (mapear colunas mp_* → asaas_*)
│   │   └── dto.go                  # requests/responses
│   │
│   └── financeiro/
│       ├── receitas/               # CRUD (handler/service/repo/model) + escopo tenant
│       ├── despesas/               # CRUD (+ corretorId)
│       ├── comissoes/              # CRUD (+ percentual)
│       ├── fluxocaixa/             # CRUD + dashboard() com filtro tenant
│       └── repasses/               # RepasseProprietario
│           ├── handler.go          # /api/repasses[, /gerar, /:id/transferir, /:id/confirmar, /resumo]
│           ├── service.go          # processarRepasse / reenviarRepasse (transfer PIX Asaas)
│           ├── repository.go
│           └── model.go
│
├── integrations/
│   └── asaas/
│       ├── client.go               # HTTP client v3; header access_token; base URL por env; timeout 15s; getClient(apiKey) por tenant
│       ├── customers.go            # POST/GET /customers
│       ├── payments.go             # POST/GET /payments; /pixQrCode; /identificationField; list by subscription/customer
│       ├── subscriptions.go        # POST/PUT/DELETE /subscriptions
│       ├── transfers.go            # POST /transfers (repasse PIX) + detectarTipoChavePix
│       ├── finance.go              # GET /finance/getCurrentBalance
│       ├── types.go                # structs de request/response Asaas
│       └── webhook/
│           ├── handler.go          # POST /api/asaas/webhook[/:tenantSlug]; valida asaas-access-token; idempotência
│           ├── events.go           # switch PAYMENT_CONFIRMED/RECEIVED/OVERDUE/CREATED/REFUNDED/DELETED
│           └── dedup.go            # tabela webhook_events (asaas_event_id unique)
│
├── billing/                        # SaaS (Subscription + Plan) — a construir com Asaas
│   ├── plan/                       # CRUD planos (superadmin)
│   ├── subscription/               # criar/alterar/cancelar; sync gateway_* via Asaas
│   └── webhook.go                  # (ou reuso do asaas/webhook discriminando por subscription)
│
├── services/
│   ├── recibo/                     # gerarReciboPDF (chromedp/maroto) → uploads/recibos
│   └── cobranca/                   # calcularMultaJuros, régua de cobrança
│
└── jobs/                           # cron (robfig/cron)
    ├── sync_cobrancas_asaas.go     # a cada 30min (era cronJobs.sincronizarCobrancasAsaas)
    └── regua_cobranca.go           # a cada 1h
```

**Middleware Gin** (equivalentes): `AuthenticateToken` (JWT+Token table), `ResolveTenant` (injeta `tenantId` + `tenant.asaas_api_key`), `CheckSubscription`, `RequireAdmin`. Aplicar por grupo de rotas replicando a matriz de auth das tabelas acima (lembrar: pagamentos tem rotas públicas **antes** do `router.use(authenticateToken)`; repasses só protege `/repasses*`).

**Cliente Asaas por tenant**: `asaas.NewClient(apiKey, env)` construído a partir de `tenant.asaas_api_key` no middleware e passado via context — **nunca** cair no fallback global fora de dev.
</content>
</invoke>
