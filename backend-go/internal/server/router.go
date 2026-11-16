package server

import (
	"context"
	"log/slog"
	"unicode/utf8"

	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/blob"
	"crmimob/internal/config"
	"crmimob/internal/integrations/asaas/webhook"
	"crmimob/internal/integrations/email"
	"crmimob/internal/integrations/storage"
	"crmimob/internal/integrations/whatsapp"
	"crmimob/internal/jobs"
	"crmimob/internal/middleware"
	"crmimob/internal/models"
	"crmimob/internal/modules/acessos"
	"crmimob/internal/modules/alugueis"
	"crmimob/internal/modules/assinatura"
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
	"crmimob/internal/modules/propostas"
	"crmimob/internal/modules/proprietarios"
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
	// Armazenamento dos documentos: disco em desenvolvimento, S3/MinIO quando
	// STORAGE_DRIVER=s3. Falhar aqui é melhor que subir uma API que aceita
	// upload e perde o arquivo.
	blobStore, errBlob := blob.DoAmbiente(context.Background(), clientes.UploadsRoot(), slog.Default())
	if errBlob != nil {
		panic("storage de arquivos indisponível: " + errBlob.Error())
	}

	if cfg.IsProduction() {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	// Não confiar em X-Forwarded-For enviado diretamente pelo visitante.
	// Em produção, informar apenas os IPs/CIDRs do proxy da infraestrutura.
	proxies := []string{}
	for _, proxy := range strings.Split(os.Getenv("TRUSTED_PROXIES"), ",") {
		if proxy = strings.TrimSpace(proxy); proxy != "" {
			proxies = append(proxies, proxy)
		}
	}
	if err := r.SetTrustedProxies(proxies); err != nil {
		panic("TRUSTED_PROXIES contém um IP ou CIDR inválido")
	}
	r.Use(middleware.Recovery())
	r.Use(middleware.RequestLogger())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.CORS(cfg.FrontendURLs, cfg.IsProduction()))

	// ---- Fundação: auth ----
	authRepo := auth.NewRepository(db)
	authSvc := auth.NewService(cfg)
	authHandler := auth.NewHandler(authRepo, authSvc)
	// Cada login certo vira uma linha em `acessos` (tela /acessos). SQL cru:
	// no login ainda não há tenant no contexto, então o tenant vai explícito,
	// e action_type ('login') não existe no model Acesso.
	authHandler.AoEntrar = func(ctx context.Context, u *models.User, ip, ua string) {
		dev := acessos.ParseDeviceType(ua)
		if err := db.WithContext(ctx).Exec(`INSERT INTO acessos (ip, user_agent, device_type, page, "timestamp", user_id, tenant_id, action_type)
			VALUES (?, ?, ?, '/login', now(), ?, ?, 'login')`, ip, truncar(ua, 255), dev, u.ID, u.TenantID).Error; err != nil {
			slog.Warn("acessos: login não registrado", "user", u.ID, "error", err)
		}
	}
	// O link do e-mail de redefinição aponta para a primeira FRONTEND_URL.
	resetBaseURL := "http://localhost:3000"
	if len(cfg.FrontendURLs) > 0 {
		resetBaseURL = cfg.FrontendURLs[0]
	}
	authHandler.WithPasswordReset(email.New(email.LoadConfigFromEnv()), resetBaseURL)

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

	// Fotos de imóveis são conteúdo PÚBLICO da vitrine — servidas estaticamente
	// (sem auth). NÃO servir /uploads inteiro: documentos de cliente ficam sob
	// rotas autenticadas (ver clientes.VerifyDocument). Só imoveis/, tenants/ e
	// usuario/.
	//
	// usuario/ guarda a foto de perfil (users.photo, gravada por
	// users.savePhoto como usuario_{id}.{ext}). Entra aqui pelo mesmo motivo que
	// tenants/: é identidade visual que aparece em toda tela, e buscá-la por
	// rota autenticada exigiria um fetch por avatar em cada linha da lista.
	// Consequência aceita: o nome do arquivo é previsível, então quem souber um
	// id consegue a foto daquele usuário sem estar logado. Se isso passar a ser
	// um problema, o caminho é servir por rota autenticada com nome opaco — não
	// remover esta linha e deixar o avatar quebrado.
	// Documentos de cliente NÃO passam por aqui: eles vivem no blobStore e são
	// entregues por rota autenticada, com checagem de tenant. As três pastas
	// abaixo continuam no disco (imagens de imóvel, logo do tenant, avatar) e
	// dependem do volume montado no contêiner.
	uploadsBase := clientes.UploadsRoot()
	api.Static("/uploads/imoveis", filepath.Join(uploadsBase, "imoveis"))
	api.Static("/uploads/tenants", filepath.Join(uploadsBase, "tenants"))
	api.Static("/uploads/usuario", filepath.Join(uploadsBase, "usuario"))

	authGroup := api.Group("/auth")
	// LOGIN_RATE_LIMIT: tentativas de login por IP a cada 15 min (padrão 10).
	limiteLogin := 10
	if v, err := strconv.Atoi(os.Getenv("LOGIN_RATE_LIMIT")); err == nil && v > 0 {
		limiteLogin = v
	}
	authGroup.POST("/login", middleware.RateLimit(limiteLogin, 15*time.Minute), middleware.BodyLimit(1<<20), authHandler.Login)
	authGroup.POST("/refresh-token", middleware.BodyLimit(1<<20), authHandler.Refresh)
	authGroup.POST("/forgot-password", middleware.RateLimit(5, 15*time.Minute), middleware.BodyLimit(1<<16), authHandler.ForgotPassword)
	authGroup.POST("/reset-password", middleware.RateLimit(10, 15*time.Minute), middleware.BodyLimit(1<<16), authHandler.ResetPassword)
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

	// Assinatura SaaS (plataforma cobra a imobiliária). `liberada` barra com
	// 402 toda rota da imobiliária quando o acesso está suspenso; ficam de fora
	// login, assinatura, configurações da empresa e o painel master.
	assinaturaSvc := assinatura.NewService(db, email.New(email.LoadConfigFromEnv()), resetBaseURL)
	assinaturaSvc.Iniciar(context.Background())
	assinaturaHandler := assinatura.NewHandler(assinaturaSvc, db)
	liberada := assinatura.ExigirLiberada(assinaturaSvc)
	// `plano` aplica limites (clientes, usuários, imóveis, aluguéis) e recursos
	// pagos às rotas — tabela em middleware/regras_do_plano.go.
	plano := middleware.RegrasDoPlano(db)
	tenantsSvc.AoCadastrar = func(ctx context.Context, tenantID uint) {
		if _, err := assinaturaSvc.GarantirFaturaDeRenovacao(ctx, tenantID); err != nil {
			slog.Error("assinatura: fatura do cadastro não criada", "tenant", tenantID, "error", err)
		}
	}
	assinaturaHandler.RegisterWebhook(api)
	assinaturaHandler.Register(api.Group("/assinatura", authed(), tenantScoped))

	superadminHandler := superadmin.NewHandler(superadmin.NewService(superadmin.NewRepository(db)))

	tenantGroup := api.Group("/tenant")
	tenantGroup.Use(middleware.BodyLimit(1 << 20))
	tenantsHandler.RegisterPublic(tenantGroup)

	tenantGroupAuth := api.Group("/tenant")
	tenantGroupAuth.Use(authed(), tenantScoped)
	tenantGroupAuth.POST("/change-plan", assinaturaHandler.TrocarPlano)

	settingsGroup := api.Group("/tenant-settings")
	settingsGroup.Use(authed(), tenantScoped)
	tenantsHandler.RegisterSettings(settingsGroup)

	superAdminGroup := api.Group("/super-admin")
	superAdminGroup.Use(authed(), tenantScoped, middleware.RequireSuperAdmin(), assinatura.EscopoGlobal())
	superadminHandler.Register(superAdminGroup)
	planHandler.Register(superAdminGroup)
	subscriptionHandler.RegisterSuperAdmin(superAdminGroup)
	assinaturaHandler.RegisterMaster(superAdminGroup)
	assinaturaHandler.RegisterPainel(superAdminGroup)

	billingGroup := api.Group("")
	billingGroup.Use(authed(), tenantScoped)
	billingGroupWithSub := billingGroup.Group("")
	billingGroupWithSub.Use(middleware.RequireActiveSubscription(db))
	planUsageHandler.Register(billingGroupWithSub)
	storageHandler.Register(billingGroup)

	userGroup := api.Group("/user")
	userGroup.Use(authed(), tenantScoped, liberada, plano)
	usersHandler.Register(userGroup)

	corretorGroup := api.Group("/corretor")
	corretorGroup.Use(authed(), tenantScoped, liberada, plano)
	corretoresHandler.Register(corretorGroup)

	correspondenteGroup := api.Group("/correspondente")
	correspondenteGroup.Use(authed(), tenantScoped, liberada, plano)
	correspondentesHandler.Register(correspondenteGroup)

	// ================= Cluster 02 — Clientes/Imóveis/Uploads =================

	storageSvc := storage.NewService(db)

	locations.NewHandler(db).RegisterRoutes(api)

	acessosHandler := acessos.NewHandler(acessos.NewService(acessos.NewRepository(db)))

	lembretesHandler := lembretes.NewHandler(lembretes.NewService(lembretes.NewRepository(db)))

	notasHandler := notas.NewHandler(notas.NewService(notas.NewRepository(db)))

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
	// Contato da imobiliária da vitrine (nome e WhatsApp), lido de "Minha empresa".
	publicGroup.GET("/empresa", func(c *gin.Context) {
		var t models.Tenant
		if err := db.WithContext(c.Request.Context()).First(&t, publicTenantID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Empresa não encontrada"})
			return
		}
		whatsapp := ""
		if t.Telefone != nil {
			d := strings.Map(func(r rune) rune {
				if r >= '0' && r <= '9' {
					return r
				}
				return -1
			}, *t.Telefone)
			if len(d) == 10 || len(d) == 11 {
				d = "55" + d
			}
			if len(d) >= 12 {
				whatsapp = d
			}
		}
		c.Header("Cache-Control", "public, max-age=300")
		c.JSON(http.StatusOK, gin.H{"nome": t.Nome, "whatsapp": whatsapp, "logo": t.Logo})
	})

	cluster02 := api.Group("")
	cluster02.Use(authed(), tenantScoped, liberada, plano)
	{
		acessosHandler.RegisterRoutes(cluster02)
		lembretesHandler.RegisterRoutes(cluster02)
		notasHandler.RegisterRoutes(cluster02)
		imoveisHandler.RegisterRoutes(cluster02)

		clientesRepo := clientes.NewRepository(db)
		clientesSvc := clientes.NewService(clientesRepo)
		clientesDocsSvc := clientes.NewDocumentosService(db, storageSvc, blobStore)
		clientesHandler := clientes.NewHandler(clientesSvc, storageSvc, clientesDocsSvc)
		clientesHandler.RegisterListaClientesRoutes(cluster02)
		clientesHandler.RegisterRoutes(cluster02) // catch-all — por último
	}

	// ================= Cluster 03 — Pagamentos/Financeiro/Asaas =================

	asaasWebhookHandler := webhook.NewHandler(db)
	asaasWebhookHandler.Register(api)

	pagamentosSvc := pagamentos.NewService(pagamentos.NewRepository(db))
	pagamentosHandler := pagamentos.NewHandler(pagamentosSvc, authHandler.Required())
	pagamentosGroup := api.Group("/pagamentos")
	pagamentosHandler.Register(pagamentosGroup, tenantScoped, liberada, plano)

	// Receitas, despesas, fluxo de caixa, comissões e repasses expõem o resultado
	// financeiro da empresa inteira, então o grupo é restrito a administrador —
	// autenticado + mesmo tenant não basta aqui.
	financeiroAuth := []gin.HandlerFunc{authed(), tenantScoped, liberada, middleware.RequireAdministrador()}

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
	chamadosHandler.RegisterPortal(api)

	cluster04 := api.Group("")
	cluster04.Use(authed(), tenantScoped, liberada, plano)
	{
		alugueisHandler.Register(cluster04)
		contratosHandler.Register(cluster04)
		proprietariosHandler.Register(cluster04)
		vistoriasHandler.Register(cluster04)
		chamadosHandler.RegisterAdmin(cluster04)
		reguaHandler.Register(cluster04)
	}

	// ================= Cluster 05 — WhatsApp/Realtime =================

	if deps.WhatsApp != nil && deps.WhatsAppRepo != nil {
		modwhatsapp.NewHandler(deps.WhatsApp, deps.WhatsAppRepo, db, authSvc).Register(api,
			assinatura.ExigirLiberadaDoTenant(assinaturaSvc, modwhatsapp.TenantDoPedido),
			middleware.RequireFeatureDoTenant(db, "has_whatsapp", modwhatsapp.TenantDoPedido))
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
	cluster06.Use(authed(), tenantScoped, liberada, plano)
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
	api.GET("/protected/protected", authed(), tenantScoped, liberada, func(c *gin.Context) {
		u, _ := auth.UserFrom(c)
		c.JSON(http.StatusOK, gin.H{"message": "autenticado", "user_id": u.ID, "tenant_id": u.TenantID})
	})

	return r
}

// jobsDeps é referenciado por main.go — mantido aqui apenas para não obrigar
// outro import cíclico; ver internal/jobs.Deps para o contrato real.
var _ = jobs.Deps{}

// truncar corta s em n bytes sem partir caractere UTF-8 (colunas varchar(255)).
func truncar(s string, n int) string {
	if len(s) <= n {
		return s
	}
	for n > 0 && !utf8.RuneStart(s[n]) {
		n--
	}
	return s[:n]
}
