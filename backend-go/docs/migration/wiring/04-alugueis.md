# Wiring — 04 Aluguéis (Locação)

Módulos implementados (todos em `internal/modules/`): `alugueis`, `contratos`,
`proprietarios`, `repasses`, `vistorias`, `chamados`, `portalinquilino`,
`reguacobranca`. Models em `internal/models/{aluguel,cliente_aluguel,
cobranca_aluguel,regua_cobranca,proprietario,vistoria_aluguel,
chamado_manutencao}.go`. `repasse_proprietario.go` já existia (criado em
paralelo pelo agente do cluster financeiro) e foi reaproveitado sem alterações.

## Pacotes externos novos

Nenhum. Todo o código usa apenas dependências já presentes em `go.mod`
(`gin`, `golang-jwt/jwt/v5`, `gorm`, `gorm.io/datatypes`) + biblioteca padrão
(`archive/zip`, `encoding/json`, `mime/multipart`, `os`, `path/filepath`,
etc.). Isso foi uma restrição deliberada da tarefa (não rodar `go get`).

Consequência prática — dois pontos do spec original dependiam de libs que
**não estão** em go.mod hoje e portanto foram implementados como **stubs
injetáveis** (interfaces), não como integrações reais:

- **PDF (Puppeteer → Go)**: `contratos.PDFEngine` e `vistorias.PDFEngine`
  (`HTMLToPDF(html string) ([]byte, error)`). Implementação padrão
  `NoopPDFEngine` sempre devolve `ErrPDFEngineNotConfigured`. O texto do
  contrato e o HTML do laudo são gerados normalmente (sem dependência
  externa) — só a rasterização para PDF depende do motor real. Quando alguém
  escolher a lib (chromedp/wkhtmltopdf/gotenberg — sugestão do spec,
  04-spec Gotcha 9), rodar `go get`, implementar a interface e injetar via
  `contratos.NewService(repo, meuEngine)` / `vistorias.NewService(repo, meuEngine)`.
- **Decimais monetários**: usados `float64` (não `shopspring/decimal`, que
  também não está em go.mod). Todos os cálculos usam `math.Round(v*100)/100`
  para 2 casas — igual ao `Math.round(x*100)/100` do Node.

## Dependências pendentes de outros módulos/agentes

### `internal/integrations/asaas` (em construção por outro agente)
Ainda não existe nenhum arquivo lá. Este cluster define **interfaces locais**
para inversão de dependência — a implementação real deve satisfazê-las
estruturalmente (Go duck typing, sem import direto):

- `alugueis.AsaasClient` (`internal/modules/alugueis/asaas.go`) — cliente/
  assinatura/cobrança avulsa/transferência PIX/listagem de cobranças. Stub
  padrão: `alugueis.NoopAsaasClient{}` (todo método devolve
  `ErrAsaasNotImplemented`). Usado por `InquilinoService` (criação de
  inquilino, sincronização, cobrança avulsa).
- `contratos.AsaasUpdater` (`internal/modules/contratos/service.go`) —
  apenas `AtualizarAssinatura(apiKey, subscriptionID, novoValor)`, usado por
  `AplicarReajuste`. Hoje o handler chama com `nil` (reajuste funciona, só
  não propaga o valor para o Asaas).
- `repasses.PixTransferrer` (`internal/modules/repasses/service.go`) —
  `RealizarTransferenciaPix(apiKey, valor, chavePix, descricao) (transferID, error)`.
  Hoje o handler chama `GerarRepasses`/`ReenviarRepasse` com `transferrer=nil`
  → todo repasse sem essa integração cai em `SEM_PIX` (comportamento seguro,
  já previsto pelo Node quando faltava PIX).

**Wiring futuro**: quando `internal/integrations/asaas` expuser um client
concreto (ex.: `asaas.Client`), criar um pequeno adapter (ou fazer o client
satisfazer as 3 interfaces diretamente) e passar a instância real nos
`NewService(...)`/chamadas de handler em vez de `nil`/`Noop*`.

### `internal/integrations/whatsapp` (em construção por outro agente)
Ainda não existe nenhum arquivo lá. Interfaces locais definidas:

- `chamados.WhatsAppSender` (`internal/modules/chamados/whatsapp.go`) —
  notifica admin (novo chamado) e inquilino (chamado resolvido).
- `reguacobranca.WhatsAppSender` (`internal/modules/reguacobranca/whatsapp.go`)
  — envia as 5 mensagens da régua (D-5/D-1/D+1/D+7/D+15).

Ambas têm o mesmo método `SendMessage(tenantID uint, telefone, mensagem string) error`
(igual ao pedido na tarefa) e stub `NoopWhatsAppSender` retornando
`errors.New("...not implemented")`. **Corrige o bug latente do Node**
(04-spec Gotcha 8): lá o cron passava uma função solta onde o service
esperava um objeto `.sendMessage()`, então o envio nunca disparava de fato
(só o registro em `ReguaCobranca` era gravado). Aqui o contrato é uma
interface única — quando o whatsmeow estiver pronto, basta implementar
`SendMessage` e injetar via `NewService(repo, meuSender, ...)`.

### `internal/integrations/storage`
Já existe (`storage.Service` — limites de quota, incremento/decremento de
`storage_used_bytes`). O upload de fotos/documentos deste cluster
(`alugueis`, `contratos`) hoje grava direto em disco
(`internal/modules/alugueis/files.go`, pasta local `uploads/...`) **sem**
chamar `storage.Service.IncrementStorage`. Pendente de integração — não é
exigido pelo spec deste cluster, mas os demais clusters (clientes/imóveis)
já usam esse serviço; para paridade de quota, plugar
`storage.NewService(db)` nos handlers de upload.

### IA (Gemini) para score do inquilino
`alugueis.ScoreEngine` (`internal/modules/alugueis/cobranca_service.go`) é a
interface para o cálculo assistido por IA. Sem implementação conectada, o
handler de `POST /clientealuguel/:id/score` chama `CalcularScore(ctx, id, nil)`
→ usa somente a heurística local (`calcularScoreLocal`, fallback idêntico ao
do Node). Quando houver um cliente Gemini, implementar
`CalcularScoreComIA(ScoreMetricas) (*ScoreDetalhes, error)` e passar a
instância no lugar de `nil`.

### `internal/jobs` (scheduler/cron) — não criado
O spec pede cron jobs (régua de hora em hora, sync Asaas 30min, score diário
6h, reajuste diário 7h, relatório mensal). Esses jobs **não foram
implementados** (fora do escopo desta tarefa — `internal/jobs` não está na
lista de diretórios autorizados). Os serviços já expõem os métodos que um
scheduler chamaria:
- `reguacobranca.Service.ProcessarTodos(ctx, time.Now())` (+ `IsHorarioComercial`)
- `alugueis.InquilinoService.CalcularScore(ctx, id, engine)` (score diário —
  precisa de um loop sobre todos os inquilinos, hoje só exposto por id)
- `alugueis.InquilinoService.SincronizarAsaas(ctx, id, apiKey)` (sync)
- `contratos.Service.AplicarReajuste` / `CalcularReajuste` (verificação de
  reajuste — precisa de um loop + alerta 30 dias antes, não implementado)

Um endpoint manual de disparo foi adicionado só para a régua
(`POST /api/regua-cobranca/processar`, `internal/modules/reguacobranca/handler.go`)
para permitir operar/depurar sem esperar o `internal/jobs` real.

## Decisões conscientes sobre autenticação (04-spec Gotcha 2)

O spec documenta várias rotas do Node **sem nenhuma autenticação** por
herança de mount (`dashboardAluguel`, `vistoriaRoutes`, rotas admin de
`chamadoRoutes`, `contratoAluguel.js`, e
`GET /clientealuguel/:id/multa-juros`). Este cluster **recomenda** exigir
`auth.Required()+middleware.ResolveTenant(db)` em todos os grupos exceto:
- `portalinquilino` (JWT próprio, sem tenant — é a exceção estrutural do
  cluster, preservada de propósito).
- Rotas `/asaas/webhook*` (fora deste escopo — webhook, valida token Asaas).

A rota `GET /clientealuguel/:id/multa-juros` foi **consolidada dentro do
módulo `alugueis`** (junto do resto do CRUD de inquilino) em vez de replicar
o router `repasseRoutes.js` original — mesma responsabilidade de domínio,
elimina a ambiguidade de auth do Node (lá ficava sem auth por acidente de
middleware condicional).

## Snippet de wiring (router)

`internal/server/router.go` ainda não registra nenhum módulo de negócio (só
`/api/health` e `/api/auth/*`) — meramente ilustrativo, a integração real cabe
a quem monta o servidor:

```go
// dependências
db := database... // *gorm.DB já com tenant.RegisterCallbacks aplicado
hub := ws.NewHub()

alugueisRepo := alugueis.NewRepository(db)
alugueisSvc := alugueis.NewService(alugueisRepo, hub)
inquilinoSvc := alugueis.NewInquilinoService(alugueisRepo, alugueis.NoopAsaasClient{})
alugueisHandler := alugueis.NewHandler(alugueisSvc, inquilinoSvc, alugueisRepo)

contratosRepo := contratos.NewRepository(db)
contratosSvc := contratos.NewService(contratosRepo, contratos.NoopPDFEngine{})
contratosHandler := contratos.NewHandler(contratosSvc)

proprietariosRepo := proprietarios.NewRepository(db)
proprietariosSvc := proprietarios.NewService(proprietariosRepo)
proprietariosHandler := proprietarios.NewHandler(proprietariosSvc)

repassesRepo := repasses.NewRepository(db)
repassesSvc := repasses.NewService(repassesRepo)
repassesHandler := repasses.NewHandler(repassesSvc)

vistoriasRepo := vistorias.NewRepository(db)
vistoriasSvc := vistorias.NewService(vistoriasRepo, vistorias.NoopPDFEngine{})
vistoriasHandler := vistorias.NewHandler(vistoriasSvc)

portalAuth := portalinquilino.NewAuthService(cfg.JWTSecret) // NUNCA usar fallback (Gotcha 13)
portalRepo := portalinquilino.NewRepository(db)
portalSvc := portalinquilino.NewService(portalRepo, portalAuth)
portalHandler := portalinquilino.NewHandler(portalSvc, portalAuth)

chamadosRepo := chamados.NewRepository(db)
chamadosSvc := chamados.NewService(chamadosRepo, chamados.NoopWhatsAppSender{}, os.Getenv("DEFAULT_PHONE_NUMBER"))
chamadosHandler := chamados.NewHandler(chamadosSvc, portalAuth) // reusa o AuthService do portal

reguaRepo := reguacobranca.NewRepository(db)
reguaSvc := reguacobranca.NewService(reguaRepo, reguacobranca.NoopWhatsAppSender{})
reguaHandler := reguacobranca.NewHandler(reguaSvc)

// montagem — ordem replica 04-spec §Ordem de montagem (itens 1-2 no topo)
api := r.Group("/api")
portalHandler.Register(api) // topo — sem auth+tenant (JWT próprio)

protected := api.Group("")
protected.Use(authHandler.Required(), middleware.ResolveTenant(db))
{
    alugueisHandler.Register(protected)
    contratosHandler.Register(protected)   // recomendado: mover para dentro do auth (Gotcha 2)
    proprietariosHandler.Register(protected)
    repassesHandler.Register(protected)
    vistoriasHandler.Register(protected)   // recomendado: mover para dentro do auth (Gotcha 2)
    chamadosHandler.Register(protected)    // rotas /portal/chamados usam portalAuth.Required() internamente,
                                            // ignorando o auth+tenant do grupo pai (é o comportamento certo)
    reguaHandler.Register(protected)
}
```

## Reaproveitamento confirmado

- `internal/models/repasse_proprietario.go` — já existia (agente financeiro),
  reaproveitado sem alterações. Pequenas divergências de shape em relação ao
  spec (`Observacao`/`TransferError` são `string` em vez de `*string`,
  `CobrancaAluguelID` é `uint` com `uniqueIndex` em vez de `*uint`) foram
  aceitas como estão — `internal/modules/repasses` foi escrito para
  consumi-las tal qual.
