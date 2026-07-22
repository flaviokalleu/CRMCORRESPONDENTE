# Wiring — 06 Dashboards, Relatórios, Vendas, Laudos e Configurações

> Este documento descreve como ligar os módulos implementados neste cluster ao
> `internal/server/router.go` (não editado por este agente — ver instruções).
> Escrito após a implementação; nenhum `go build`/`go vet`/`go mod tidy` foi
> executado — validar a compilação antes de mesclar.

## Pacotes Go externos novos importados

Nenhum. Todos os módulos usam apenas o que já está em `go.mod`
(`gin-gonic/gin`, `gorm.io/gorm`, `gorm.io/datatypes`) e a biblioteca padrão
(`html/template`, `encoding/json`, `mime/multipart`, `os`, `math`, etc.).

**Desvio deliberado do spec**: o spec (§gotcha 14) recomenda `shopspring/decimal`
para os cálculos de simulação de financiamento e valores monetários. Esse
agente está proibido de rodar `go get`/`go mod tidy`, então
`internal/modules/simulacoes/service.go` usa `float64` com arredondamento
explícito (`round2`/`round4`), replicando o comportamento observável do
`simulacaoRoutes.js` original (que também usava `Number`/`float` em JS, não
`decimal.js`). Se `shopspring/decimal` for adicionado ao projeto depois, migrar
`simulacoes/service.go` para usá-lo é um follow-up de precisão, não uma
correção de bug.

## Dependências pendentes de outros módulos

1. **PDF de relatório** (`internal/modules/relatorios/pdf.go`): declarada uma
   interface LOCAL `PDFRenderer` com `RenderHTML(ctx, html) ([]byte, error)` e
   um stub que devolve `ErrPDFNotImplemented`. **Não usa** o
   `internal/integrations/pdf.Service` que já existe no repositório, porque
   aquele pacote cobre um caso de uso diferente (merge/split/rasterização de
   documentos de cliente — CPF, RG, extratos — conforme
   `docs/migration/02-clientes-imoveis-uploads.md §5.5`), sem nenhum método de
   "renderizar HTML para PDF". Ao implementar a geração real (chromedp contra
   Chromium headless, ou um serviço gotenberg), duas opções:
   - (a) implementar `relatorios.PDFRenderer` como um novo client próprio; ou
   - (b) estender `internal/integrations/pdf.Service` com um método
     `RenderHTML` e fazer `relatorios` depender dele — recomendado, para não
     ter duas libs de PDF na base.
   `GET /api/report/relatorio/download` devolve `503` com
   `{"error": "Geração de PDF indisponível nesta fase da migração"}` enquanto
   isso não for implementado. HTML e JSON funcionam normalmente.

2. **Gemini (recomendações de IA)** (`internal/modules/relatorios/ai.go`):
   `Recomendacoes(a Analytics)` sempre usa o fallback estático hoje. Há um
   `TODO` explícito para a chamada real à API Gemini, que deve ler a chave
   **exclusivamente** de `GEMINI_API_KEY` (env) — o Node tinha essa chave
   hardcoded como fallback no código-fonte; **não replicar isso**.

3. **Notificações + Socket.io** (`internal/modules/visitas/notifier.go` e
   `internal/modules/propostas/notifier.go`): cada pacote declara uma
   interface local `Notifier` (`NotifyUser(ctx, userID, event, payload)`) com
   um `NoopNotifier` padrão. O modelo `Notificacao` e o hub de WebSocket
   pertencem ao domínio realtime (`docs/migration/05-whatsapp-realtime-jobs.md`
   — outro agente). Quando esse módulo existir, criar um adaptador que
   implemente `visitas.Notifier`/`propostas.Notifier` delegando para o hub
   real, e injetar no `NewHandler` no lugar do `NoopNotifier`.

4. **Tenant settings** (`internal/modules/configuracoes/tenant_handler.go`):
   no momento da escrita, `internal/modules/tenants/` existe como diretório
   reservado mas **vazio**. Como o spec pede tenant-settings neste cluster e
   ninguém mais o cobria, implementei `GET/PUT /tenant-settings/settings`,
   `POST /settings/logo`, `GET/PUT /settings/asaas`, `POST /settings/asaas/testar`
   aqui. **Se o agente responsável por `internal/modules/tenants/` também
   implementar esse contrato**, reconciliar removendo a duplicata (manter
   preferencialmente a versão em `tenants/`, que é o dono canônico do
   `models.Tenant`).

5. **`/api/super-admin/metrics`**: já implementado em
   `internal/modules/superadmin` (`Handler.Metrics`, `Register`). **Não
   duplicado** neste cluster — apesar de a tabela do spec listar essa rota
   como "dashboard-like", a implementação já existe e cobre o contrato.

6. **`GET /api/chamados/resumo`** (spec: público, "a corrigir"): pertence ao
   domínio de chamados/manutenção, que **não está** na lista de pacotes que
   este agente tem permissão de escrever
   (`internal/modules/{dashboards,relatorios,simulacoes,visitas,propostas,laudos,configuracoes}`).
   **Ação pendente para o dono desse domínio**: adicionar `auth.Required()` +
   `middleware.ResolveTenant(db)` a essa rota quando implementada — hoje seria
   mais um endpoint público vazando dados agregados, igual ao gotcha já
   corrigido nos relatórios.

## Modelos e tabelas novas (migrations pendentes)

Este agente só escreveu os `.go` de model — as migrations SQL (golang-migrate)
para as tabelas abaixo são responsabilidade de quem gerencia
`backend-go/migrations/` (fora do escopo deste agente):

- `simulacoes`, `visitas`, `propostas`: já existiam no schema original (mesmas
  colunas do Node) — nenhuma migration nova necessária além do que já existe.
- `laudos`: precisa de **`ALTER TABLE laudos ADD COLUMN tenant_id INTEGER NOT
  NULL REFERENCES tenants(id)`** (+ índice) — o model Node não tinha essa
  coluna (gotcha §8 do spec). Sem essa migration, `internal/models/laudo.go`
  não bate com o schema real.
- `system_configs`: já existia (model órfão no Node) — nenhuma migration nova,
  mas confirmar que a tabela tem exatamente as colunas do
  `internal/models/system_config.go` (`nome_sistema, cor_primaria,
  cor_secundaria, cor_texto, logo_url, tema_escuro, created_at, updated_at`).

## Snippet de wiring em `internal/server/router.go`

Não editado por este agente (fora da lista de arquivos permitidos). O trecho
abaixo é o que deve ser colado no `server.New(...)`, seguindo o padrão já
existente (`authHandler`, `protected := api.Group("")` etc.):

```go
import (
    "crmimob/internal/modules/dashboards"
    "crmimob/internal/modules/relatorios"
    "crmimob/internal/modules/simulacoes"
    "crmimob/internal/modules/visitas"
    "crmimob/internal/modules/propostas"
    "crmimob/internal/modules/laudos"
    "crmimob/internal/modules/configuracoes"
)

// ---- Dependências deste cluster ----
dashCache := dashboards.NewCache()
dashSvc := dashboards.NewService(db, dashCache)
dashHandler := dashboards.NewHandler(dashSvc)

relatoriosRepo := relatorios.NewRepository(db)
relatoriosHandler := relatorios.NewHandler(relatoriosRepo, relatorios.NewPDFRenderer())

simulacoesRepo := simulacoes.NewRepository(db)
simulacoesHandler := simulacoes.NewHandler(simulacoesRepo)

visitasRepo := visitas.NewRepository(db)
visitasHandler := visitas.NewHandler(visitasRepo, nil) // nil => visitas.NoopNotifier{}; trocar quando o hub realtime existir

propostasRepo := propostas.NewRepository(db)
propostasHandler := propostas.NewHandler(propostasRepo, nil) // idem, propostas.NoopNotifier{}

laudosRepo := laudos.NewRepository(db)
laudosHandler := laudos.NewHandler(laudosRepo)

systemConfigHandler := configuracoes.NewSystemHandler(db)
tenantSettingsHandler := configuracoes.NewTenantHandler(db)

// ---- Grupo protegido único (corrige o duplo-middleware do Node, gotcha §4) ----
protected := api.Group("")
protected.Use(authHandler.Required(), middleware.ResolveTenant(db))
{
    dashboards.Register(protected.Group("/dashboard"), dashHandler)

    // CORREÇÃO DE SEGURANÇA DELIBERADA: /api/report/* era público no Node.
    relatorios.Register(protected.Group("/report"), relatoriosHandler)

    simulacoes.Register(protected.Group("/simulacoes"), simulacoesHandler)
    visitas.Register(protected.Group("/visitas"), visitasHandler)
    propostas.Register(protected.Group("/propostas"), propostasHandler)
    laudos.Register(protected.Group("/laudos"), laudosHandler)

    configuracoes.RegisterSystem(protected, systemConfigHandler) // GET/PUT /api/configurations
    configuracoes.RegisterTenantSettings(protected.Group("/tenant-settings"), tenantSettingsHandler)
}
```

Notas sobre o snippet:

- Todas as rotas deste cluster passam por `authHandler.Required()` +
  `middleware.ResolveTenant(db)` — inclusive `relatorios` e `dashboards`, que
  no Node eram, respectivamente, públicas e sem filtro de tenant (correções
  deliberadas exigidas pelo prompt).
- `dashboards.Register` já inclui o alias de compatibilidade para o path
  duplicado legado (`/dashboard/dashboard/aguardando-aprovacao`) além do path
  limpo (`/dashboard/aguardando-aprovacao`).
- `laudos.Register` preserva a ordem de rotas do spec (`/relatorios/estatisticas`
  antes de `/:id`) — Gin resolve por especificidade de segmentos, mas a ordem
  de registro foi mantida por segurança/clareza.
- `visitas.NewHandler`/`propostas.NewHandler` aceitam `nil` como segundo
  argumento em dev (caem no `NoopNotifier`); substituir pela implementação real
  assim que o hub de notificações/realtime existir.

## Resumo de correções de segurança aplicadas neste cluster

1. `/api/report/*`: agora exige auth + tenant (era público).
2. Dashboards: agora filtram por `tenant_id` em toda query (Model-based via
   callback GORM; Raw SQL via `scopeSQL()` manual — ver comentário em
   `dashboards/service.go`).
3. Simulações/Visitas/Propostas: listagens agora incluem `tenant_id` via
   callback GORM (antes só filtravam por `user_id` em alguns casos).
4. Laudos: modelo ganhou `tenant_id` (obrigatório) — requer migration (ver
   acima).
5. Duplo middleware do dashboard: unificado em `authHandler.Required()` +
   `middleware.ResolveTenant(db)` uma única vez no grupo `protected`.
6. Path duplicado do dashboard: path limpo
   `/api/dashboard/aguardando-aprovacao` + alias legado mantido.
7. Chave Gemini: nunca hardcoded — lida de `GEMINI_API_KEY` (hoje não
   utilizada; fallback estático sempre ativo).
8. Cache do dashboard: chave agora inclui `tenant_id` (ou `"global"` para
   super admin sem tenant selecionado), corrigindo o vazamento potencial entre
   tenants do cache in-process do Node.
