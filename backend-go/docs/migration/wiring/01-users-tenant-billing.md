# Wiring — Users, Corretores, Correspondentes, Tenants, Billing, Superadmin

> Este documento NÃO foi aplicado a `internal/server/router.go` (fora do escopo desta tarefa).
> Descreve como outro processo deve montar as rotas.

## 1. Dependência nova (rodar `go get`)

```
go get github.com/disintegration/imaging@latest
```

Usada em `internal/modules/correspondentes/service.go` para redimensionar (fit 800x800) a
foto do correspondente, substituindo o `sharp` do Node. **Desvio deliberado**: não existe
encoder WebP puro-Go sem cgo, então a imagem é salva como **JPEG q85** (`correspondente_{id}.jpg`)
em vez de `.webp`. Documentado também no comentário do arquivo.

Nenhuma outra dependência nova foi adicionada — todo o resto usa apenas `gorm`, `gin`,
`golang-jwt`, `golang.org/x/crypto/bcrypt` e a stdlib (`net/http`, `mime/multipart`, `os`, etc.),
todos já presentes no `go.mod`.

## 2. Construção das dependências (em `server.New` ou equivalente)

```go
// auth já existe:
authRepo := auth.NewRepository(db)
authSvc  := auth.NewService(cfg)
authHandler := auth.NewHandler(authRepo, authSvc)

// users
usersRepo := users.NewRepository(db)
usersSvc  := users.NewService(usersRepo)
usersHandler := users.NewHandler(usersSvc)

// corretores
corretoresRepo := corretores.NewRepository(db)
corretoresSvc  := corretores.NewService(corretoresRepo)
corretoresHandler := corretores.NewHandler(corretoresSvc)

// correspondentes
correspondentesRepo := correspondentes.NewRepository(db)
correspondentesSvc  := correspondentes.NewService(correspondentesRepo)
correspondentesHandler := correspondentes.NewHandler(correspondentesSvc)

// billing
billingRepo := billing.NewRepository(db)
billingSvc  := billing.NewService(billingRepo)
planHandler := billing.NewPlanHandler(billingSvc)
subscriptionHandler := billing.NewSubscriptionHandler(billingSvc)
storageSvc := billing.NewStorageService(db, billingRepo)
storageHandler := billing.NewStorageHandler(storageSvc, func(id uint) (*models.Tenant, error) {
	var t models.Tenant
	if err := db.First(&t, id).Error; err != nil {
		return nil, err
	}
	return &t, nil
})
planUsageHandler := billing.NewPlanUsageHandler(billingRepo)

// tenants (depende de billing + auth)
tenantsRepo := tenants.NewRepository(db)
tenantsSvc  := tenants.NewService(tenantsRepo, billingSvc, authSvc, authRepo)
tenantsHandler := tenants.NewHandler(tenantsSvc)

// superadmin
superadminRepo := superadmin.NewRepository(db)
superadminSvc  := superadmin.NewService(superadminRepo)
superadminHandler := superadmin.NewHandler(superadminSvc)
```

## 3. Montagem das rotas (espelhando `01-spec` §8)

```go
api := r.Group("/api")

// ---- /api/tenant (onboarding público) ----
tenantGroup := api.Group("/tenant")
tenantsHandler.RegisterPublic(tenantGroup) // POST /register, GET /plans, GET /check-slug/:slug

tenantGroupAuth := api.Group("/tenant")
tenantGroupAuth.Use(authHandler.Required(), middleware.ResolveTenant(db))
tenantsHandler.RegisterAuthenticated(tenantGroupAuth) // POST /change-plan

// ---- /api/tenant-settings ----
settingsGroup := api.Group("/tenant-settings")
settingsGroup.Use(authHandler.Required(), middleware.ResolveTenant(db))
tenantsHandler.RegisterSettings(settingsGroup)

// ---- /api/super-admin (auth + tenant + RequireSuperAdmin) ----
superAdminGroup := api.Group("/super-admin")
superAdminGroup.Use(authHandler.Required(), middleware.ResolveTenant(db), middleware.RequireSuperAdmin())
superadminHandler.Register(superAdminGroup)          // /tenants*, /metrics
planHandler.Register(superAdminGroup)                // /plans (list/create/update)
subscriptionHandler.RegisterSuperAdmin(superAdminGroup) // /subscriptions, /subscriptions/:tenantId/change-plan

// ---- /api/plan-usage, /api/storage-usage, /api/storage-recalculate ----
billingGroup := api.Group("")
billingGroup.Use(authHandler.Required(), middleware.ResolveTenant(db))
billingGroupWithSub := billingGroup.Group("")
billingGroupWithSub.Use(middleware.RequireActiveSubscription(db))
planUsageHandler.Register(billingGroupWithSub) // GET /api/plan-usage
storageHandler.Register(billingGroup)          // GET /storage-usage, POST /storage-recalculate

// ---- /api/user ----
userGroup := api.Group("/user")
userGroup.Use(authHandler.Required(), middleware.ResolveTenant(db))
usersHandler.Register(userGroup)

// ---- /api/corretor (PROTEGIDO — correção de segurança deliberada) ----
corretorGroup := api.Group("/corretor")
corretorGroup.Use(authHandler.Required(), middleware.ResolveTenant(db))
corretoresHandler.Register(corretorGroup)

// ---- /api/correspondente (PROTEGIDO — correção de segurança deliberada) ----
correspondenteGroup := api.Group("/correspondente")
correspondenteGroup.Use(authHandler.Required(), middleware.ResolveTenant(db))
correspondentesHandler.Register(correspondenteGroup)
```

### Exemplo de uso dos feature/limit gates em outros clusters (negócio)

```go
clientesGroup := api.Group("/clientes")
clientesGroup.Use(authHandler.Required(), middleware.ResolveTenant(db))
clientesGroup.POST("", middleware.RequireLimit(db, "clientes"), clientesHandler.Create)
whatsappGroup := api.Group("/whatsapp")
whatsappGroup.Use(authHandler.Required(), middleware.ResolveTenant(db), middleware.RequireFeature(db, "has_whatsapp"))
```

## 4. Notas importantes

- `middleware.RequireActiveSubscription` e os handlers de billing usam as MESMAS chaves de
  contexto Gin (`"plan"` / `"subscription"`) — duplicadas como constantes locais em
  `billing/planusage_handler.go` (`ctxPlanKey`/`ctxSubscriptionKey`) para **evitar import
  cycle** (`middleware` já importa `modules/billing` para o `PlanResolver`; `billing` não pode
  importar `middleware` de volta). Se algum dia essas chaves forem renomeadas em
  `middleware/subscription.go` (`CtxPlan`/`CtxSubscription`), atualizar as constantes espelho
  em `billing/planusage_handler.go` also.
- `corretores`, `correspondentes`: rotas de criação/edição/remoção que o Node deixava
  **públicas** foram montadas atrás de `auth.Required()+ResolveTenant` de propósito (correção
  de segurança — ver comentários nos respectivos `handler.go`).
- `GET /api/listadecorretores` e `/api/correspondente/debug/all` (Node) **não foram portadas**
  — eram rotas de debug/vazamento de senha, removidas deliberadamente.
- Nenhum socket.io/WS foi emitido (`usuario-atualizado` etc.) — não há infraestrutura de
  socket neste módulo Go ainda; se for adicionada por outro cluster, os handlers de
  `users`/`corretores`/`correspondentes` são o ponto de extensão natural.
