package tenants

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/middleware"
	"crmimob/internal/modules/users"
)

// Handler expõe /api/tenant (onboarding público) e /api/tenant-settings
// (self-service autenticado). Ver 01-spec §2.2 e §2.4 / doc de wiring.
type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// RegisterPublic monta as rotas sem autenticação de /api/tenant.
func (h *Handler) RegisterPublic(r *gin.RouterGroup) {
	r.POST("/register", middleware.RateLimit(5, 15*time.Minute), h.Register)
	r.GET("/plans", h.Plans)
	r.GET("/check-slug/:slug", h.CheckSlug)
}

// RegisterAuthenticated monta /api/tenant/change-plan — deve receber o grupo
// já protegido por auth.Required() + middleware.ResolveTenant (ver wiring).
func (h *Handler) RegisterAuthenticated(r *gin.RouterGroup) {
	r.POST("/change-plan", h.ChangePlanSelf)
}

// RegisterSettings monta /api/tenant-settings — o grupo já deve estar
// protegido por auth.Required() + middleware.ResolveTenant (ver wiring).
func (h *Handler) RegisterSettings(r *gin.RouterGroup) {
	r.GET("/settings", h.GetSettings)
	r.PUT("/settings", h.UpdateSettings)
	r.POST("/settings/logo", h.UploadLogo)
	r.GET("/settings/asaas", h.GetAsaas)
	r.PUT("/settings/asaas", h.UpdateAsaas)
	r.POST("/settings/asaas/testar", h.TestAsaas)
}

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	tenant, admin, sub, access, refresh, err := h.svc.Register(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidSlug), errors.Is(err, ErrWeakPassword):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, ErrSlugTaken), errors.Is(err, ErrEmailTaken):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		case errors.Is(err, ErrPlanNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar organização"})
		}
		return
	}

	c.JSON(http.StatusCreated, RegisterResponse{
		Message: "Organização criada com sucesso", Token: access, RefreshToken: refresh,
		Tenant: tenant, User: users.ToResponse(admin), Subscription: sub,
	})
}

func (h *Handler) Plans(c *gin.Context) {
	list, err := h.svc.ListPublicPlans(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar planos"})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *Handler) CheckSlug(c *gin.Context) {
	available, err := h.svc.CheckSlugAvailable(c.Request.Context(), c.Param("slug"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao checar slug"})
		return
	}
	c.JSON(http.StatusOK, CheckSlugResponse{Available: available})
}

// ChangePlanSelf: só is_administrador do próprio tenant (ver 01-spec §2.2).
func (h *Handler) ChangePlanSelf(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok || !user.IsAdministrador {
		c.JSON(http.StatusForbidden, gin.H{"error": "Apenas administradores podem trocar de plano"})
		return
	}
	if user.TenantID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Usuário sem organização"})
		return
	}
	var req ChangePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "planId é obrigatório"})
		return
	}
	plan, err := h.svc.ChangePlanSelf(c.Request.Context(), *user.TenantID, req.PlanID)
	if err != nil {
		if errors.Is(err, ErrPlanNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Plano não encontrado"})
			return
		}
		if errors.Is(err, ErrNoSubscription) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Organização sem assinatura"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao trocar de plano"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Plano atualizado", "plan": plan})
}

func currentTenantID(c *gin.Context) (uint, bool) {
	user, ok := auth.UserFrom(c)
	if !ok || user.TenantID == nil {
		return 0, false
	}
	return *user.TenantID, true
}

func (h *Handler) GetSettings(c *gin.Context) {
	tenantID, ok := currentTenantID(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Usuário sem organização"})
		return
	}
	t, err := h.svc.GetSettings(c.Request.Context(), tenantID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Organização não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar configurações"})
		return
	}
	c.JSON(http.StatusOK, ToSettingsResponse(t))
}

// UpdateSettings: admin ou super_admin (403 senão) — ver 01-spec §2.4.
func (h *Handler) UpdateSettings(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok || !(user.IsAdministrador || user.IsSuperAdmin) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Apenas administradores podem alterar configurações"})
		return
	}
	tenantID, ok := currentTenantID(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Usuário sem organização"})
		return
	}
	var req UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}
	t, err := h.svc.UpdateSettings(c.Request.Context(), tenantID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar configurações"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Configurações atualizadas", "tenant": ToSettingsResponse(t)})
}

// UploadLogo: admin ou super_admin; multipart `logo` até 5MB.
func (h *Handler) UploadLogo(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok || !(user.IsAdministrador || user.IsSuperAdmin) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Apenas administradores podem alterar o logo"})
		return
	}
	tenantID, ok := currentTenantID(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Usuário sem organização"})
		return
	}
	fh, err := c.FormFile("logo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Arquivo 'logo' é obrigatório"})
		return
	}
	if fh.Size > 5*1024*1024 {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "Logo excede 5MB"})
		return
	}
	path, err := saveLogo(tenantID, fh)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar logo"})
		return
	}
	if err := h.svc.UpdateLogo(c.Request.Context(), tenantID, path); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar logo"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Logo atualizado", "logo": path})
}

func (h *Handler) GetAsaas(c *gin.Context) {
	tenantID, ok := currentTenantID(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Usuário sem organização"})
		return
	}
	resp, err := h.svc.GetAsaasSettings(c.Request.Context(), tenantID, webhookBaseURL(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar configurações Asaas"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) UpdateAsaas(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok || !(user.IsAdministrador || user.IsSuperAdmin) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Apenas administradores podem alterar a integração Asaas"})
		return
	}
	tenantID, ok := currentTenantID(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Usuário sem organização"})
		return
	}
	var req UpdateAsaasRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}
	testado, msg, err := h.svc.UpdateAsaasSettings(c.Request.Context(), tenantID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar configurações Asaas"})
		return
	}
	resp := gin.H{"message": "Configurações Asaas atualizadas"}
	if testado {
		resp["teste_conexao"] = msg
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) TestAsaas(c *gin.Context) {
	tenantID, ok := currentTenantID(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Usuário sem organização"})
		return
	}
	var req TestAsaasRequest
	_ = c.ShouldBindJSON(&req)

	apiKey := ""
	if req.AsaasAPIKey != nil && *req.AsaasAPIKey != "" {
		apiKey = *req.AsaasAPIKey
	} else {
		t, err := h.svc.GetSettings(c.Request.Context(), tenantID)
		if err != nil || t.AsaasAPIKey == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Nenhuma chave Asaas configurada"})
			return
		}
		apiKey = *t.AsaasAPIKey
	}
	c.JSON(http.StatusOK, gin.H{"resultado": TestAsaasConnection(apiKey)})
}

func webhookBaseURL(c *gin.Context) string {
	scheme := "https"
	if c.Request.TLS == nil {
		scheme = "http"
	}
	return scheme + "://" + c.Request.Host
}
