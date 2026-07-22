package server

import (
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/config"
	"crmimob/internal/integrations/asaas/webhook"
	"crmimob/internal/integrations/pdf"
	"crmimob/internal/integrations/storage"
	"crmimob/internal/integrations/whatsapp"
	"crmimob/internal/jobs"
	"crmimob/internal/middleware"
	"crmimob/internal/models"
	"crmimob/internal/modules/acessos"
	"crmimob/internal/modules/alugueis"
	"crmimob/internal/modules/billing"
	"crmimob/internal/modules/chamados"
	"crmimob/internal/modules/clientes"
	"crmimob/internal/modules/configuracoes"
	"crmimob/internal/modules/contratos"
	"crmimob/internal/modules/correspondentes"
	"crmimob/internal/modules/corretores"
	"crmimob/internal/modules/dashboards"
	"crmimob/internal/modules/financeiro/comissoes"
	"crmimob/internal/modules/financeiro/despesas"
	"crmimob/internal/modules/financeiro/fluxocaixa"
	"crmimob/internal/modules/financeiro/receitas"
	"crmimob/internal/modules/financeiro/repasses"
	"crmimob/internal/modules/imoveis"
	"crmimob/internal/modules/laudos"
	"crmimob/internal/modules/lembretes"
	"crmimob/internal/modules/locations"
	"crmimob/internal/modules/notas"
	"crmimob/internal/modules/pagamentos"
	"crmimob/internal/modules/portalinquilino"
	"crmimob/internal/modules/proprietarios"
	"crmimob/internal/modules/propostas"
	"crmimob/internal/modules/reguacobranca"
	"crmimob/internal/modules/relatorios"
	"crmimob/internal/modules/simulacoes"
	"crmimob/internal/modules/superadmin"
	"crmimob/internal/modules/tenants"
	"crmimob/internal/modules/users"
	"crmimob/internal/modules/visitas"
	"crmimob/internal/modules/vistorias"
	modwhatsapp "crmimob/internal/modules/whatsapp"
	"crmimob/internal/ws"
)

// Deps agrupa as instâncias de infraestrutura que main.go monta e que o
// router precisa (WhatsApp manager, hub de WebSocket, scheduler). Passar nil
// é seguro — os módulos correspondentes ficam com funcionalidade reduzida
// (equivalente a "não configurado"), nunca panica.
type Deps struct {
	WhatsApp     *whatsapp.Manager
	WhatsAppRepo *whatsapp.SessionRepo
	Hub          *ws.Hub
}

// New monta o *gin.Engine completo: fundação (auth, tenant, health) + os 6
// clusters de negócio migrados. Ver docs/migration/wiring/*.md para o mapa
// completo de decisões por cluster.
func New(cfg *config.Config, db *gorm.DB, deps Deps) *gin.Engine {
	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(middleware.Recovery())
	r.Use(middleware.RequestLogger())
	r.Use(middleware.CORS(cfg.FrontendURLs, cfg.IsProduction()))

	// ---- Fundação: auth ----
	authRepo := auth.NewRepository(db)
	authSvc := auth.NewService(cfg)
	authHandler := auth.NewHandler(authRepo, authSvc)

	r.GET("/api/health", func(c *gin.Context) {
		sqlDB, err := db.DB()
		if err == nil {
			err = sqlDB.Ping()
		}
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unhealthy", "timestamp": time.Now().UTC()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok", "timestamp": time.Now().UTC()})
	})

	api := r.Group("/api")

	authGroup := api.Group("/auth")
	authGroup.POST("/login", middleware.RateLimit(10, 15*time.Minute), authHandler.Login)
	authGroup.POST("/refresh-token", authHandler.Refresh)
	authGroup.POST("/logout", authHandler.Required(), authHandler.Logout)
	authGroup.POST("/validate-token", authHandler.Required(), authHandler.Validate)
	authGroup.GET("/me", authHandler.Required(), authHandler.Me)
	authGroup.GET("/check-auth", authHandler.Required(), authHandler.CheckAuth)

	authed := func() gin.HandlerFunc { return authHandler.Required() }
	tenantScoped := middleware.ResolveTenant(db)

	// ================= Cluster 01 — Users/Tenant/Billing/Superadmin =================

	usersHandler := users.NewHandler(users.NewService(users.NewRepository(db)))
	corretoresHandler := corretores.NewHandler(corretores.NewService(corretores.NewRepository(db)))
	correspondentesHandler := correspondentes.NewHandler(correspondentes.NewService(correspondentes.NewRepository(db)))

	billingRepo := billing.NewRepository(db)
	billingSvc := billing.NewService(billingRepo)
	planHandler := billing.NewPlanHandler(billingSvc)
	subscriptionHandler := billing.NewSubscriptionHandler(billingSvc)
	storageSvcBilling := billing.NewStorageService(db, billingRepo)
	storageHandler := billing.NewStorageHandler(storageSvcBilling, func(id uint) (*models.Tenant, error) {
		var t models.Tenant
		if err := db.First(&t, id).Error; err != nil {
			return nil, err
		}
		return &t, nil
	})
	planUsageHandler := billing.NewPlanUsageHandler(billingRepo)

	tenantsRepo := tenants.NewRepository(db)
	tenantsSvc := tenants.NewService(tenantsRepo, billingSvc, authSvc, authRepo)
	tenantsHandler := tenants.NewHandler(tenantsSvc)

	superadminHandler := superadmin.NewHandler(superadmin.NewService(superadmin.NewRepository(db)))

	tenantGroup := api.Group("/tenant")
	tenantsHandler.RegisterPublic(tenantGroup)

	tenantGroupAuth := api.Group("/tenant")
	tenantGroupAuth.Use(authed(), tenantScoped)
	tenantsHandler.RegisterAuthenticated(tenantGroupAuth)

	settingsGroup := api.Group("/tenant-settings")
	settingsGroup.Use(authed(), tenantScoped)
	tenantsHandler.RegisterSettings(settingsGroup)

	superAdminGroup := api.Group("/super-admin")
	superAdminGroup.Use(authed(), tenantScoped, middleware.RequireSuperAdmin())
	superadminHandler.Register(superAdminGroup)
	planHandler.Register(superAdminGroup)
	subscriptionHandler.RegisterSuperAdmin(superAdminGroup)

	billingGroup := api.Group("")
	billingGroup.Use(authed(), tenantScoped)
	billingGroupWithSub := billingGroup.Group("")
	billingGroupWithSub.Use(middleware.RequireActiveSubscription(db))
	planUsageHandler.Register(billingGroupWithSub)
	storageHandler.Register(billingGroup)

	userGroup := api.Group("/user")
	userGroup.Use(authed(), tenantScoped)
	usersHandler.Register(userGroup)

	corretorGroup := api.Group("/corretor")
	corretorGroup.Use(authed(), tenantScoped)
	corretoresHandler.Register(corretorGroup)

	correspondenteGroup := api.Group("/correspondente")
	correspondenteGroup.Use(authed(), tenantScoped)
	correspondentesHandler.Register(correspondenteGroup)

	// ================= Cluster 02 — Clientes/Imóveis/Uploads =================

	storageSvc := storage.NewService(db)
	pdfSvc := pdf.NewClient()

	locations.NewHandler(db).RegisterRoutes(api)

	acessosHandler := acessos.NewHandler(acessos.NewService(acessos.NewRepository(db)))
	acessosHandler.RegisterRoutes(api)

	lembretesHandler := lembretes.NewHandler(lembretes.NewService(lembretes.NewRepository(db)))
	lembretesHandler.RegisterRoutes(api)

	notasHandler := notas.NewHandler(notas.NewService(notas.NewRepository(db)))
	notasHandler.RegisterRoutes(api)

	imoveisHandler := imoveis.NewHandler(imoveis.NewService(imoveis.NewRepository(db)))

	// Vitrine pública (SEO) — sem auth, escopada a um tenant fixo via env
	// PUBLIC_TENANT_ID (default 1). Ver middleware.PublicTenantScope.
	publicTenantID := uint(1)
	if v := os.Getenv("PUBLIC_TENANT_ID"); v != "" {
		if parsed, err := strconv.ParseUint(v, 10, 64); err == nil {
			publicTenantID = uint(parsed)
		}
	}
	publicGroup := api.Group("/public")
	publicGroup.Use(middleware.PublicTenantScope(publicTenantID))
	imoveisHandler.RegisterPublicRoutes(publicGroup)

	cluster02 := api.Group("")
	cluster02.Use(authed(), tenantScoped)
	{
		imoveisHandler.RegisterRoutes(cluster02)

		clientesRepo := clientes.NewRepository(db)
		clientesSvc := clientes.NewService(clientesRepo)
		clientesHandler := clientes.NewHandler(clientesSvc, storageSvc, pdfSvc)
		clientesHandler.RegisterListaClientesRoutes(cluster02)
		clientesHandler.RegisterRoutes(cluster02) // catch-all — por último
	}

	// ================= Cluster 03 — Pagamentos/Financeiro/Asaas =================

	asaasWebhookHandler := webhook.NewHandler(db)
	asaasWebhookHandler.Register(api)

	pagamentosSvc := pagamentos.NewService(pagamentos.NewRepository(db))
	pagamentosHandler := pagamentos.NewHandler(pagamentosSvc, authHandler.Required())
	pagamentosGroup := api.Group("/pagamentos")
	pagamentosHandler.Register(pagamentosGroup, tenantScoped)

	financeiroAuth := []gin.HandlerFunc{authed(), tenantScoped}

	receitasHandler := receitas.NewHandler(receitas.NewRepository(db))
	receitasHandler.Register(api.Group("/receitas", financeiroAuth...))

	despesasHandler := despesas.NewHandler(despesas.NewRepository(db))
	despesasHandler.Register(api.Group("/despesas", financeiroAuth...))

	comissoesHandler := comissoes.NewHandler(comissoes.NewRepository(db))
	comissoesHandler.Register(api.Group("/comissoes", financeiroAuth...))

	fluxoRepo := fluxocaixa.NewRepository(db)
	fluxoSvc := fluxocaixa.NewService(fluxoRepo, receitas.NewRepository(db), despesas.NewRepository(db))
	fluxocaixaHandler := fluxocaixa.NewHandler(fluxoRepo, fluxoSvc)
	fluxocaixaHandler.Register(api.Group("/fluxocaixa", financeiroAuth...))

	repassesSvc := repasses.NewService(repasses.NewRepository(db), db)
	repassesHandler := repasses.NewHandler(repassesSvc)
	repassesHandler.Register(api.Group("/repasses", financeiroAuth...))
	// RegisterPublic (GET /api/clientealuguel/:id/multa-juros sem auth) foi INTENCIONALMENTE
	// omitido: o cluster 04 (aluguéis) já registra essa mesma rota, consolidada e protegida
	// por auth+tenant, dentro de cluster04 abaixo — manter as duas causava panic de rota
	// duplicada no Gin, e a versão pública replicava um gotcha de segurança do Node.

	// ================= Cluster 04 — Aluguéis =================

	alugueisRepo := alugueis.NewRepository(db)
	alugueisSvc := alugueis.NewService(alugueisRepo, deps.Hub)
	inquilinoSvc := alugueis.NewInquilinoService(alugueisRepo, alugueis.NoopAsaasClient{})
	alugueisHandler := alugueis.NewHandler(alugueisSvc, inquilinoSvc, alugueisRepo)

	contratosRepo := contratos.NewRepository(db)
	contratosSvc := contratos.NewService(contratosRepo, contratos.NoopPDFEngine{})
	contratosHandler := contratos.NewHandler(contratosSvc)

	proprietariosHandler := proprietarios.NewHandler(proprietarios.NewService(proprietarios.NewRepository(db)))

	vistoriasRepo := vistorias.NewRepository(db)
	vistoriasSvc := vistorias.NewService(vistoriasRepo, vistorias.NoopPDFEngine{})
	vistoriasHandler := vistorias.NewHandler(vistoriasSvc)

	portalAuth := portalinquilino.NewAuthService(cfg.JWTSecret)
	portalRepo := portalinquilino.NewRepository(db)
	portalSvc := portalinquilino.NewService(portalRepo, portalAuth)
	portalHandler := portalinquilino.NewHandler(portalSvc, portalAuth)

	chamadosSvc := chamados.NewService(chamados.NewRepository(db), chamados.NoopWhatsAppSender{}, os.Getenv("DEFAULT_PHONE_NUMBER"))
	chamadosHandler := chamados.NewHandler(chamadosSvc, portalAuth)

	reguaSvc := reguacobranca.NewService(reguacobranca.NewRepository(db), reguacobranca.NoopWhatsAppSender{})
	reguaHandler := reguacobranca.NewHandler(reguaSvc)

	portalHandler.Register(api) // topo — JWT próprio, sem auth+tenant global

	cluster04 := api.Group("")
	cluster04.Use(authed(), tenantScoped)
	{
		alugueisHandler.Register(cluster04)
		contratosHandler.Register(cluster04)
		proprietariosHandler.Register(cluster04)
		vistoriasHandler.Register(cluster04)
		chamadosHandler.Register(cluster04) // rotas /portal/chamados usam portalAuth internamente
		reguaHandler.Register(cluster04)
	}

	// ================= Cluster 05 — WhatsApp/Realtime =================

	if deps.WhatsApp != nil && deps.WhatsAppRepo != nil {
		modwhatsapp.NewHandler(deps.WhatsApp, deps.WhatsAppRepo, db, authSvc).Register(api)
	}
	if deps.Hub != nil {
		ws.NewHandler(deps.Hub, authSvc, cfg.FrontendURLs).Register(api)
	}

	// ================= Cluster 06 — Dashboards/Vendas/Config =================

	dashHandler := dashboards.NewHandler(dashboards.NewService(db, dashboards.NewCache()))
	relatoriosHandler := relatorios.NewHandler(relatorios.NewRepository(db), relatorios.NewPDFRenderer())
	simulacoesHandler := simulacoes.NewHandler(simulacoes.NewRepository(db))
	visitasHandler := visitas.NewHandler(visitas.NewRepository(db), nil)
	propostasHandler := propostas.NewHandler(propostas.NewRepository(db), nil)
	laudosHandler := laudos.NewHandler(laudos.NewRepository(db))
	systemConfigHandler := configuracoes.NewSystemHandler(db)

	cluster06 := api.Group("")
	cluster06.Use(authed(), tenantScoped)
	{
		dashboards.Register(cluster06.Group("/dashboard"), dashHandler)
		relatorios.Register(cluster06.Group("/report"), relatoriosHandler)
		simulacoes.Register(cluster06.Group("/simulacoes"), simulacoesHandler)
		visitas.Register(cluster06.Group("/visitas"), visitasHandler)
		propostas.Register(cluster06.Group("/propostas"), propostasHandler)
		laudos.Register(cluster06.Group("/laudos"), laudosHandler)
		configuracoes.RegisterSystem(cluster06, systemConfigHandler)
		// tenant-settings já coberto pelo cluster 01 (tenants.RegisterSettings) — não duplicar.
	}

	// ---- Smoke-test de auth (mantido da fundação) ----
	api.GET("/protected/protected", authed(), tenantScoped, func(c *gin.Context) {
		u, _ := auth.UserFrom(c)
		c.JSON(http.StatusOK, gin.H{"message": "autenticado", "user_id": u.ID, "tenant_id": u.TenantID})
	})

	return r
}

// jobsDeps é referenciado por main.go — mantido aqui apenas para não obrigar
// outro import cíclico; ver internal/jobs.Deps para o contrato real.
var _ = jobs.Deps{}
