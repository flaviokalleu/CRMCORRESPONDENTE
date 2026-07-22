# Wiring — WhatsApp, Realtime (WS), Jobs, Email

> Gerado pelo agente responsável por `internal/integrations/{whatsapp,email}`,
> `internal/modules/whatsapp`, `internal/ws`, `internal/jobs`. Código já escrito
> e SALVO; **não foi rodado** `go build`/`go vet`/`go mod tidy`/`go get` (fora do
> escopo deste agente). `main.go` e `go.mod` também não foram tocados — o
> snippet abaixo é só para quem for editar `main.go`.

## 1. Dependências novas a instalar (`go get`)

Rodar na raiz de `backend-go`:

```bash
go get go.mau.fi/whatsmeow@latest
go get github.com/gorilla/websocket@latest
go get github.com/robfig/cron/v3@latest
go get gopkg.in/gomail.v2@latest
go mod tidy
```

`go.mau.fi/whatsmeow` traz transitivamente `go.mau.fi/libsignal`,
`go.mau.fi/util`, `google.golang.org/protobuf` (já presente indiretamente) e o
driver de banco que ele usa por baixo (`github.com/jackc/pgx/v5` já está no
`go.mod` via `gorm.io/driver/postgres` — o `sqlstore` do whatsmeow com dialect
`"postgres"` deve reaproveitar o driver `database/sql` registrado como
`"postgres"`; se o `go build` reclamar de driver não registrado, importar em
branco `_ "github.com/jackc/pgx/v5/stdlib"` em `internal/integrations/whatsapp/store.go`
ou trocar o dialect para `"pgx"` conforme a versão do `sqlstore.New` instalada).

**Atenção de versão de API**: a assinatura de `sqlstore.New(...)` mudou entre
versões do whatsmeow (algumas pedem `context.Context` como 1º argumento,
outras não; `container.GetDevice`/`container.DeleteDevice` também variam
quanto a receber `ctx`). O código em `internal/integrations/whatsapp/store.go`
e `client.go` foi escrito assumindo a API mais recente (com `ctx` explícito).
Quem rodar `go mod tidy` deve compilar e ajustar esses pontos pontualmente se
a versão baixada divergir — são ajustes de assinatura, não de lógica.

Também verificar o nome exato do subpacote de eventos/proto:
`go.mau.fi/whatsmeow/types/events`, `go.mau.fi/whatsmeow/proto/waE2E`,
`go.mau.fi/whatsmeow/util/log` (logger `waLog.Stdout(...)` costuma ser o
construtor usual — usar `waLog.Stdout("Database", "INFO", true)` /
`waLog.Stdout("Client", "INFO", true)` ao instanciar em `main.go`).

## 2. Variáveis de ambiente novas

| Var | Uso | Default |
|---|---|---|
| `SMTP_HOST` | host do servidor SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | porta SMTP | `587` |
| `SMTP_USER` | usuário/login SMTP | — (vazio = modo simulado) |
| `SMTP_PASSWORD` | senha/app-password SMTP | — (vazio = modo simulado) |
| `SMTP_FROM_NAME` | nome do remetente | `Sistema CRM` |
| `SMTP_FROM_EMAIL` | e-mail do remetente (fallback = `SMTP_USER`) | — |
| `EMPRESA_NOME` | nome usado no template de e-mail | `CRM IMOB` |
| `DEFAULT_PHONE_NUMBER` | telefone padrão do relatório mensal (jobs) | — |

Nenhuma variável de WhatsApp nova é necessária — a conexão do sqlstore reusa
`DB_HOST/DB_PORT/DB_NAME/DB_USERNAME/DB_PASSWORD` já existentes.

## 3. Decisão de arquitetura: sqlstore do whatsmeow (não reaproveita `whatsapp_sessions` do Node)

Documentado em detalhe no topo de `internal/models/whatsapp_session.go`: as
credenciais Baileys (JSONB `data` com `BufferJSON`) NÃO são compatíveis com o
formato do whatsmeow. Adotamos o `sqlstore` nativo do whatsmeow como fonte de
verdade do pareamento (cria e gerencia suas próprias tabelas `whatsmeow_*` via
`container.Upgrade`/migração interna — não precisa de golang-migrate nem
GORM AutoMigrate para essas tabelas). A struct Go `models.WhatsappSession`
ficou reduzida a METADADOS (status, telefone, `device_jid` para reidratar o
client no boot) — sem coluna `data`. **Todo tenant migrado precisa reescanear
o QR Code uma vez** — não há caminho de dados que preserve a sessão.

Se a tabela `whatsapp_sessions` no Postgres ainda tiver o formato antigo
(coluna `data` JSONB), será necessária uma migração de schema (fora do escopo
deste agente) para: dropar `data`, adicionar `device_jid`, `session_id`,
`tenant_id`, `last_error` conforme a struct Go.

## 4. Snippet de inicialização em `main.go` (não aplicado — só documentado)

```go
package main

import (
    "context"
    "log"

    "crmimob/internal/config"
    "crmimob/internal/database"
    "crmimob/internal/integrations/email"
    "crmimob/internal/integrations/whatsapp"
    "crmimob/internal/jobs"
    modwhatsapp "crmimob/internal/modules/whatsapp"
    "crmimob/internal/server"
    "crmimob/internal/ws"

    waLog "go.mau.fi/whatsmeow/util/log"
)

func main() {
    cfg, err := config.Load()
    if err != nil {
        log.Fatal(err)
    }

    db, err := database.Connect(cfg)
    if err != nil {
        log.Fatal(err)
    }

    // ---- Realtime (substitui getSocketIO()) ----
    hub := ws.NewHub()

    // ---- WhatsApp (whatsmeow) ----
    ctx := context.Background()
    waLogger := waLog.Stdout("WhatsApp", "INFO", true)
    container, err := whatsapp.OpenContainer(ctx, cfg, waLogger)
    if err != nil {
        log.Fatal(err)
    }
    waRepo := whatsapp.NewSessionRepo(db)
    waMgr := whatsapp.NewManager(cfg, container, waRepo, hub, waLogger)
    waMgr.RestoreOnBoot(ctx) // equivalente ao setTimeout(5000) de auto-reconexão do Node

    // ---- Email ----
    mailer := email.New(email.LoadConfigFromEnv())

    // ---- Jobs / cron ----
    // Pagamentos/Lembretes/Regua/AsaasSync/Score/Reajuste/Relatorio/Backup:
    // implementações reais vêm de outros módulos (internal/modules/pagamentos,
    // financeiro, aluguel, clientes...) — passar nil enquanto não existirem;
    // cada job faz nil-check e loga "não configurado" em vez de falhar.
    sched := jobs.New(jobs.Deps{
        WhatsApp:           waMgr,  // *whatsmeow Manager satisfaz jobs.WhatsAppSender
        Email:              mailer, // *email.Client satisfaz jobs.EmailSender
        Pagamentos:         nil,    // TODO: internal/modules/pagamentos.Service
        Lembretes:          nil,    // TODO: internal/modules/clientes (ou agenda)
        Regua:              nil,    // TODO: internal/modules/aluguel
        AsaasSync:          nil,    // TODO: internal/modules/financeiro
        Score:              nil,    // TODO: internal/modules/aluguel
        Reajuste:           nil,    // TODO: internal/modules/aluguel
        Relatorio:          nil,    // TODO: internal/modules/financeiro
        Backup:             nil,    // TODO: internal/database ou pacote de infra
        DefaultPhoneNumber: os.Getenv("DEFAULT_PHONE_NUMBER"),
    })
    sched.Start()
    defer sched.Stop()

    // ---- HTTP router ----
    r := server.New(cfg, db) // fundação existente (auth, health, /protected)

    // Módulo WhatsApp HTTP (/api/whatsapp/*) — precisa do mesmo grupo "/api"
    // que server.New usa internamente; se server.New não expuser o grupo,
    // ajustar `internal/server/router.go` (fora do escopo deste agente) para
    // devolver o *gin.RouterGroup ou aceitar um hook de registro extra, ex.:
    //   api := r.Group("/api")
    //   modwhatsapp.NewHandler(waMgr, waRepo, db, authSvc).Register(api)
    //   wsHandler := ws.NewHandler(hub, authSvc, cfg.FrontendURLs)
    //   wsHandler.Register(api)

    r.Run(":" + cfg.Port)
}
```

**Ponto de atenção para quem for integrar**: `internal/server.New` hoje monta
tudo internamente e devolve só `*gin.Engine` (não expõe o `*gin.RouterGroup
/api` nem o `authSvc`/`authHandler` para fora). Para plugar
`modules/whatsapp.Handler` e `ws.Handler` sem duplicar a criação de
`auth.Service`, será necessário UM PEQUENO ajuste em `router.go` (fora do meu
escopo — não editei o arquivo): ou (a) `server.New` passa a aceitar uma lista
de "registradores" (`func(*gin.RouterGroup)`) para módulos externos, ou (b)
`server.New` devolve `(*gin.Engine, *auth.Service)` para o `main.go` montar o
grupo adicional por fora. Este agente construiu `modwhatsapp.NewHandler(...)` e
`ws.NewHandler(...)` já esperando por essa integração — só falta o fio em
`router.go`/`main.go`.

## 5. Arquivos criados neste escopo

- `internal/models/whatsapp_session.go`
- `internal/integrations/whatsapp/{client,events,messages,phone,reconnect,session_repo,store}.go`
- `internal/integrations/email/client.go`
- `internal/modules/whatsapp/{handler,middleware}.go`
- `internal/ws/{client,envelope,handler,hub}.go`
- `internal/jobs/{scheduler,interfaces,horario,lembretes,regua_cobranca,asaas_sync,score_reajuste,relatorio_mensal,parcelas,backup}.go`

## 6. Débitos técnicos conscientes (documentados no código)

1. Endpoints de notificação de negócio (`/notificarClienteCadastrado`,
   `/enviar-pagamento`, `/reenviar-pagamento/:id`, etc.) recebem os dados JÁ
   RESOLVIDOS no corpo da requisição (nome do cliente, telefone, link de
   pagamento) em vez de consultar `Cliente`/`Pagamento` diretamente — esses
   models pertencem a módulos implementados por outros agentes em paralelo.
   Quando existirem, o ideal é que ELES chamem `whatsapp.Manager.SendMessage`
   direto (sem HTTP interno), eliminando esses endpoints proxy.
2. `jobs.PagamentoService`, `LembreteVencimentoService`, `ReguaCobrancaService`,
   `AsaasSyncService`, `ScoreService`, `ReajusteService`,
   `RelatorioMensalService`, `BackupRunner` são interfaces vazias de
   implementação real — só o contrato. Todos os jobs fazem nil-check.
3. Vazamento cross-tenant do Node (`notificarCorrespondentes*` sem filtrar
   `tenant_id`) foi CORRIGIDO na versão Go (`internal/modules/whatsapp/handler.go`
   filtra por `tenant_id` sempre).
4. Handlers duplicados do Node (2 blocos de `notificarClienteCadastrado` etc.)
   foram implementados UMA VEZ SÓ aqui, sempre via runtime do tenant — o
   bloco "código morto" do Node não tem equivalente.
