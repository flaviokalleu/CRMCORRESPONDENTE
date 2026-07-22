# Wiring — Clientes, Imóveis, Uploads/Storage/PDF, Cadastros Auxiliares

> Complementa `docs/migration/02-clientes-imoveis-uploads.md`. Este documento é
> só sobre **como plugar** o código escrito nesta tarefa no `main.go`/router —
> nenhum arquivo de `internal/server` ou `main.go` foi tocado (fora do escopo).

## 1. Dependências novas (go.mod)

**Nenhuma.** Tudo foi escrito usando apenas o que já está em `go.mod`
(`gin`, `gorm`, `gorm.io/datatypes`, stdlib — `archive/zip`, `mime/multipart`,
`regexp`, `encoding/json`, etc.). Não é necessário rodar `go get`.

Pendências conscientes para fases futuras (NÃO adicionadas agora, conforme
instrução de escopo — ver comentários `NOTA DE ESCOPO` no código):

| Pacote sugerido | Onde vai entrar | Por quê ainda não |
|---|---|---|
| `github.com/pdfcpu/pdfcpu` | `internal/integrations/pdf` | Substituir o stub `ErrNotImplemented` por merge/split/contagem de páginas real. |
| `github.com/h2non/bimg` ou `github.com/disintegration/imaging` | `internal/integrations/pdf` (conversão imagem→PDF) e `internal/modules/imoveis` (webp) | Mesma razão — hoje `imoveis` salva as imagens originais sem converter para webp. |
| `github.com/gen2brain/go-fitz` | `internal/integrations/pdf` | Rasterização PDF→imagem (fluxo CTPS/RG/CPF). |
| lib de geoip (equivalente a `geoip-lite`) | `internal/modules/acessos` | Hoje `Acesso.Geo*` ficam `nil` — só IP/device/user_id são preenchidos. |

## 2. Arquivos criados

```
internal/models/cliente.go
internal/models/imovel.go
internal/models/nota.go
internal/models/lembrete.go
internal/models/acesso.go

internal/modules/clientes/{dto,repository,service,documents,handler,routes,listaclientes_handler}.go
internal/modules/imoveis/{dto,repository,service,handler}.go
internal/modules/notas/{dto,repository,service,handler}.go
internal/modules/lembretes/{repository,service,handler}.go
internal/modules/acessos/{repository,service,handler}.go
internal/modules/locations/{model,handler}.go

internal/integrations/storage/{service,limits}.go
internal/integrations/pdf/{service,sanitize}.go
```

> `listadeclientes` (spec §2.2) foi implementado **dentro** do pacote
> `clientes` (`listaclientes_handler.go`), não como módulo próprio — o escopo
> desta tarefa restringia novos pacotes a
> `internal/modules/{clientes,imoveis,notas,lembretes,acessos,locations}/` e
> `listadeclientes.js` é só uma superfície de rota alternativa sobre o mesmo
> model `Cliente`.

## 3. Registrando as rotas no router

Preservar a ordem de montagem do spec §7.1 (rotas específicas antes do grupo
catch-all de clientes). Sugestão de bloco para `internal/server/router.go`
(fora do escopo desta tarefa — quem tocar o router decide onde encaixar):

```go
import (
    "crmimob/internal/integrations/pdf"
    "crmimob/internal/integrations/storage"
    "crmimob/internal/modules/acessos"
    "crmimob/internal/modules/clientes"
    "crmimob/internal/modules/imoveis"
    "crmimob/internal/modules/lembretes"
    "crmimob/internal/modules/locations"
    "crmimob/internal/modules/notas"
)

// --- integrações compartilhadas ---
storageSvc := storage.NewService(db)
pdfSvc := pdf.NewClient() // stub — trocar quando pdfcpu/bimg/go-fitz entrarem

// --- locations (públicas, sem tenant — /api/estados, /api/municipios/:id) ---
locations.NewHandler(db).RegisterRoutes(api)

// --- acessos (sem auth no mount hoje — decisão de segurança documentada) ---
acessosSvc := acessos.NewService(acessos.NewRepository(db))
acessos.NewHandler(acessosSvc).RegisterRoutes(api)

// --- lembretes (sem auth no mount hoje) ---
lembretesSvc := lembretes.NewService(lembretes.NewRepository(db))
lembretes.NewHandler(lembretesSvc).RegisterRoutes(api)

// --- notas (recomendado proteger; hoje sem auth no mount — ver spec §6.6) ---
notasSvc := notas.NewService(notas.NewRepository(db))
notas.NewHandler(notasSvc).RegisterRoutes(api)

// --- grupos protegidos (auth + tenant) ---
protected := api.Group("")
protected.Use(authHandler.Required(), middleware.ResolveTenant(db))
{
    // imoveis
    imoveisSvc := imoveis.NewService(imoveis.NewRepository(db))
    imoveis.NewHandler(imoveisSvc).RegisterRoutes(protected)

    // clientes + listadeclientes (mesmo Handler, dois grupos de rota)
    clientesRepo := clientes.NewRepository(db)
    clientesSvc := clientes.NewService(clientesRepo)
    clientesHandler := clientes.NewHandler(clientesSvc, storageSvc, pdfSvc)

    clientesHandler.RegisterListaClientesRoutes(protected) // /listadeclientes*

    // storage-usage / storage-recalculate (inline, como no Node) — usar storageSvc
    protected.GET("/storage-usage", func(c *gin.Context) { /* storageSvc.GetStorageInfo(...) */ })

    // /clientes* — REGISTRAR POR ÚLTIMO dentro deste grupo (catch-all §6.7)
    clientesHandler.RegisterRoutes(protected)
}
```

## 4. Decisões/divergências assumidas nesta tarefa

- `notas`, `lembretes`, `acessos`, `locations`: mantidos **sem auth** no
  `RegisterRoutes` (replicam o comportamento atual do Node — ver spec §6.6).
  Quem plugar no router decide se envolve em `protected.Use(...)` — o handler
  não impõe isso.
- `imoveis` e `clientes`/`listadeclientes`: assumem que o grupo passado em
  `RegisterRoutes(rg)` já tem `Required()+ResolveTenant(db)` aplicados.
- Upload de imagens de imóveis e conversão de documentos de cliente para PDF
  mesclado **não fazem a conversão real** ainda (salvam o arquivo bruto) — ver
  comentários `NOTA DE ESCOPO` em `imoveis/handler.go` e
  `clientes/documents.go`. Os pontos de integração com
  `internal/integrations/pdf` já estão isolados (via `pdf.Service`) para
  trocar sem reescrever os handlers.
- `internal/integrations/storage`: `IncrementStorage`/`DecrementStorage` são
  atômicos via `UpdateColumn + gorm.Expr`. `GetStorageInfo` resolve limite via
  cascata tenant-override → plano da subscription ativa → default (500MB/10MB).
  `RecalculateStorage` (varredura de `uploads/`) não foi implementado — não
  estava na lista de métodos pedida nesta tarefa.
- Modelo `Nota`: incluí `Nova *bool` e `Destinatario *string` (spec §4.2 marca
  como "confirmar colunas reais"). Se a migration real não tiver essas
  colunas, ajustar para `gorm:"-"` ou remover.
