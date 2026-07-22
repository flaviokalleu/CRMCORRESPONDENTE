# Wiring — 03 Pagamentos/Financeiro (Asaas)

Este documento cobre apenas o que foi implementado neste escopo: `internal/integrations/asaas`,
`internal/modules/pagamentos`, `internal/modules/financeiro/*`, e os models novos em
`internal/models`. Nenhum arquivo fora deste escopo foi alterado (main.go, router.go, go.mod
permanecem intocados).

## 1. Dependências novas (rodar `go get`)

Nenhuma. Todo o pacote `asaas` usa apenas `net/http`/`encoding/json` da stdlib. Os módulos
`pagamentos`/`financeiro` usam apenas `gin-gonic/gin` e `gorm.io/gorm`, já presentes no projeto.

Se preferir usar um client HTTP com retry/circuit-breaker mais robusto no futuro (`resty`,
`go-retryablehttp`), isso é opcional — não foi necessário para a v1.

## 2. Variáveis de ambiente novas

| Variável | Obrigatória | Default | Uso |
|---|---|---|---|
| `ASAAS_API_KEY` | Sim (fallback global) | — | Chave usada quando o tenant não tem `asaas_api_key` próprio |
| `ASAAS_ENVIRONMENT` | Não | `sandbox` | `sandbox` ou `production` — define a base URL da API Asaas |
| `ASAAS_WEBHOOK_TOKEN` | Recomendado em produção | — | Token do webhook legado (`POST /api/asaas/webhook`); webhooks por tenant usam `tenant.asaas_webhook_token` |
| `MAX_PARCELAS` | Não | `12` | Config exposta em `GET /api/pagamentos/config` |
| `BOLETO_DAYS_TO_EXPIRE` | Não | `3` | idem |
| `PIX_EXPIRE_MINUTES` | Não | `30` | idem — usado para calcular vencimento do PIX avulso |
| `NODE_ENV` | Já existe | `development` | Reaproveitada para decidir se o webhook exige token obrigatoriamente (`production`) |

Remover (não usadas neste código): `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY`, `MP_ACCESS_TOKEN`.

## 3. Migrações de banco necessárias (não incluídas neste escopo — só Go)

Novas tabelas/colunas que os models esperam e que precisam de migration (golang-migrate ou
equivalente já usado no projeto):

- `webhook_events` (nova tabela): `id, provider, event_id, payload jsonb, processed_at, created_at`,
  unique composto `(provider, event_id)`.
- `pagamentos`: renomear/adicionar colunas conforme `internal/models/pagamento.go` —
  `asaas_customer_id`, `asaas_payment_id` (substituem `mp_preference_id`/`mp_payment_id`),
  `dados_gateway` (substitui `dados_mp`), `invoice_url` (substitui `link_pagamento`/`init_point`),
  `transaction_receipt_url`.
- `repasse_proprietarios`: já existente no Node (`underscored`), sem mudança de schema — só o
  model Go precisa bater 1:1 (conferir `tenant_id` presente na tabela real).
- `receitas`/`despesas`/`comissoes`/`fluxo_caixa`: sem mudança de schema, `underscored:false`
  preservado via `gorm:"column:..."` explícito (ver comentários nos models).

## 4. Wiring de rotas no router (snippet — aplicar em `internal/server/router.go`)

O router atual (`internal/server/router.go`) não foi tocado. Este é o snippet que outro
agente/você deve aplicar lá, seguindo o padrão já existente (`authHandler`, `middleware.ResolveTenant`):

```go
import (
    "crmimob/internal/integrations/asaas/webhook"
    "crmimob/internal/modules/financeiro/comissoes"
    "crmimob/internal/modules/financeiro/despesas"
    "crmimob/internal/modules/financeiro/fluxocaixa"
    "crmimob/internal/modules/financeiro/receitas"
    "crmimob/internal/modules/financeiro/repasses"
    "crmimob/internal/modules/pagamentos"
)

// --- Webhook Asaas (público, mount /api) ---
asaasWebhookHandler := webhook.NewHandler(db)
asaasWebhookHandler.Register(api) // POST /asaas/webhook/:tenantSlug, /asaas/webhook, GET /asaas/teste

// --- Pagamentos avulsos (mount /api/pagamentos; auth por-rota dentro do Register) ---
pagamentosRepo := pagamentos.NewRepository(db)
pagamentosSvc := pagamentos.NewService(pagamentosRepo)
pagamentosHandler := pagamentos.NewHandler(pagamentosSvc, authHandler.Required())
pagamentosGroup := api.Group("/pagamentos")
pagamentosHandler.Register(pagamentosGroup, middleware.ResolveTenant(db))

// --- Financeiro CRUD (todos exigem Required + ResolveTenant) ---
financeiroAuth := []gin.HandlerFunc{authHandler.Required(), middleware.ResolveTenant(db)}

receitasHandler := receitas.NewHandler(receitas.NewRepository(db))
receitasGroup := api.Group("/receitas", financeiroAuth...)
receitasHandler.Register(receitasGroup)

despesasHandler := despesas.NewHandler(despesas.NewRepository(db))
despesasGroup := api.Group("/despesas", financeiroAuth...)
despesasHandler.Register(despesasGroup)

comissoesHandler := comissoes.NewHandler(comissoes.NewRepository(db))
comissoesGroup := api.Group("/comissoes", financeiroAuth...)
comissoesHandler.Register(comissoesGroup)

fluxoRepo := fluxocaixa.NewRepository(db)
fluxoSvc := fluxocaixa.NewService(fluxoRepo, receitas.NewRepository(db), despesas.NewRepository(db))
fluxocaixaHandler := fluxocaixa.NewHandler(fluxoRepo, fluxoSvc)
fluxocaixaGroup := api.Group("/fluxocaixa", financeiroAuth...)
fluxocaixaHandler.Register(fluxocaixaGroup)

// --- Repasses (só /repasses* tem auth+tenant — replicar gotcha do Node) ---
repassesSvc := repasses.NewService(repasses.NewRepository(db), db)
repassesHandler := repasses.NewHandler(repassesSvc)
repassesGroup := api.Group("/repasses", financeiroAuth...)
repassesHandler.Register(repassesGroup)
repassesHandler.RegisterPublic(api) // GET /api/clientealuguel/:id/multa-juros — SEM auth (gotcha §8)
```

## 5. Pontos de atenção / decisões tomadas

1. **Cliente (avulso) e ClienteAluguel/CobrancaAluguel (aluguéis) não têm model Go neste
   escopo** — pertencem a outros módulos (`clientes`, `alugueis`), fora do meu mandato. Para não
   bloquear a implementação, `modules/pagamentos` e `modules/financeiro/repasses` fazem leituras
   pontuais somente-leitura via `db.WithContext(ctx).Table("clientes"|"cliente_aluguels"|"cobranca_aluguels")`
   com filtro manual de tenant (`tenant.From(ctx)`), documentado nos comentários de
   `repository.go` de cada módulo. **Quando os módulos `clientes` e `alugueis` existirem**, o
   ideal é substituir essas projeções por chamadas aos repositories reais deles.
2. **`internal/integrations/asaas/webhook.RentalHook`** é um ponto de extensão (`var` exportada)
   para o módulo de aluguéis conectar a lógica completa do webhook Asaas de aluguéis (recibo PDF,
   `CobrancaAluguel.status`, repasse automático, WhatsApp) — hoje só loga quando um evento não
   corresponde a um `Pagamento` avulso conhecido. Ver `internal/integrations/asaas/webhook/events.go`.
3. **Recibo PDF (Puppeteer no Node)** não foi implementado — fora de escopo (`services/recibo`
   não está na lista de pacotes autorizados). Ficou como TODO para quem tratar o módulo de aluguéis.
4. **Billing SaaS** (`internal/billing`) não existe ainda no repositório neste momento — conforme
   instrução, não foi criado por mim (é de outro agente). Se ao ler isso `internal/billing` ainda
   não existir, o wiring de assinatura de plano via Asaas subscriptions continua como TODO.
5. **Cartão de crédito parcelado**: `asaas.CreatePaymentRequest` já suporta
   `installmentCount`/`installmentValue`/`creditCardToken`/`creditCard`, mas `modules/pagamentos`
   não expõe uma rota `/cartao` (não estava na tabela de endpoints original do Node como rota
   própria — o Node não implementava). Adicionar quando houver requisito de produto.
6. **`GET /api/clientealuguel/:id/multa-juros` fica sem autenticação** (replicando o gotcha do
   Node — 03-spec §8) e, por não ter tenant no contexto, a leitura de `cliente_aluguels` não é
   filtrada por tenant. Se isso for indesejado, mover a rota para dentro do grupo autenticado no
   wiring acima (mover a chamada de `RegisterPublic` para usar `repassesGroup` em vez de `api`).
