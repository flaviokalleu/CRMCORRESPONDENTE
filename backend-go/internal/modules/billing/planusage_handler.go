package billing

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
	"crmimob/internal/models"
)

// Chaves de contexto Gin — DEVEM ter o mesmo valor de string usado por
// internal/middleware/subscription.go (CtxPlan/CtxSubscription). Duplicadas
// aqui (em vez de importar o pacote middleware) para evitar import cycle
// (middleware/feature_gate.go importa este pacote billing). Ver doc de wiring.
const (
	ctxPlanKey         = "plan"
	ctxSubscriptionKey = "subscription"
)

// PlanUsageHandler expõe GET /api/plan-usage. Montar atrás de
// auth.Required()+ResolveTenant+RequireActiveSubscription (que popula
// plan/subscription no contexto Gin — ver 01-spec §6.2).
type PlanUsageHandler struct {
	repo     *Repository
	resolver *PlanResolver
}

func NewPlanUsageHandler(repo *Repository) *PlanUsageHandler {
	return &PlanUsageHandler{repo: repo, resolver: NewPlanResolver()}
}

func (h *PlanUsageHandler) Register(r *gin.RouterGroup) {
	r.GET("/plan-usage", h.Get)
}

func (h *PlanUsageHandler) Get(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
		return
	}

	planVal, hasPlan := c.Get(ctxPlanKey)
	subVal, hasSub := c.Get(ctxSubscriptionKey)

	// Admin/super sem plano resolvido → "Ilimitado" em tudo (ver 01-spec §6.2).
	if (user.IsSuperAdmin || user.IsAdministrador) && (!hasPlan || !hasSub) {
		c.JSON(http.StatusOK, unlimitedUsage())
		return
	}
	if user.TenantID == nil || !hasPlan || !hasSub {
		c.JSON(http.StatusOK, unlimitedUsage())
		return
	}
	plan := planVal.(*models.Plan)
	sub := subVal.(*models.Subscription)

	ctx := c.Request.Context()
	tenantID := *user.TenantID
	var tenant models.Tenant
	// tenant já validado pelo ResolveTenant; buscamos de novo aqui só para os
	// overrides (*int/*bool) usados pelo PlanResolver.
	_ = h.repo.db.WithContext(ctx).First(&tenant, tenantID).Error

	uso := gin.H{
		"clientes": usageEntry(h.repo.CountForTable(ctx, "clientes", tenantID), h.resolver.EffectiveLimit(&tenant, plan, "clientes")),
		"usuarios": usageEntry(h.repo.CountForTable(ctx, "users", tenantID), h.resolver.EffectiveLimit(&tenant, plan, "usuarios")),
		"imoveis":  usageEntry(h.repo.CountForTable(ctx, "imoveis", tenantID), h.resolver.EffectiveLimit(&tenant, plan, "imoveis")),
		"alugueis": usageEntry(h.repo.CountForTable(ctx, "alugueis", tenantID), h.resolver.EffectiveLimit(&tenant, plan, "alugueis")),
	}

	features := gin.H{}
	for _, f := range []string{
		"has_whatsapp", "has_pagamentos", "has_ai_analysis", "has_relatorios_avancados",
		"has_multi_usuarios", "has_api_access", "has_suporte_prioritario", "has_dominio_customizado",
	} {
		features[f] = h.resolver.IsFeatureEnabled(&tenant, plan, f)
	}

	c.JSON(http.StatusOK, gin.H{
		"plano":                 plan.Nome,
		"uso":                   uso,
		"features":              features,
		"modulos_customizados":  tenant.UseCustomModules,
		"subscription": gin.H{
			"status": sub.Status, "ciclo": sub.Ciclo, "dias_restantes": sub.DaysRemaining(),
		},
	})
}

func usageEntry(atual int64, limite int) gin.H {
	if limite == 0 {
		return gin.H{"atual": atual, "limite": "Ilimitado"}
	}
	return gin.H{"atual": atual, "limite": limite}
}

func unlimitedUsage() gin.H {
	features := gin.H{}
	for _, f := range []string{
		"has_whatsapp", "has_pagamentos", "has_ai_analysis", "has_relatorios_avancados",
		"has_multi_usuarios", "has_api_access", "has_suporte_prioritario", "has_dominio_customizado",
	} {
		features[f] = true
	}
	return gin.H{
		"plano": "Ilimitado",
		"uso": gin.H{
			"clientes": gin.H{"atual": 0, "limite": "Ilimitado"},
			"usuarios": gin.H{"atual": 0, "limite": "Ilimitado"},
			"imoveis":  gin.H{"atual": 0, "limite": "Ilimitado"},
			"alugueis": gin.H{"atual": 0, "limite": "Ilimitado"},
		},
		"features":             features,
		"modulos_customizados": true,
		"subscription":         nil,
	}
}
