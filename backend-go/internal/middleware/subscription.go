package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/models"
)

// Chaves de contexto Gin preenchidas por RequireActiveSubscription — os
// gates de feature_gate.go e o handler de /api/plan-usage leem daqui.
const (
	CtxSubscription = "subscription"
	CtxPlan         = "plan"
)

// RequireActiveSubscription replica checkSubscription (tenantMiddleware.js):
// super admin/admin fazem bypass; busca a subscription active/trialing mais
// recente do tenant; 402 SUBSCRIPTION_REQUIRED se não houver; 402
// SUBSCRIPTION_EXPIRED se existir mas não estiver ativa. Ver 01-spec §6.2.
//
// Deve rodar depois de auth.Required() + ResolveTenant.
func RequireActiveSubscription(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := auth.UserFrom(c)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
			return
		}
		if user.IsSuperAdmin || user.IsAdministrador {
			c.Next()
			return
		}
		if user.TenantID == nil {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Usuário sem organização", "code": "SUBSCRIPTION_REQUIRED"})
			return
		}

		ctx := c.Request.Context()
		var sub models.Subscription
		err := db.WithContext(ctx).
			Where("tenant_id = ? AND status IN ?", *user.TenantID, []string{"active", "trialing"}).
			Order("created_at DESC").First(&sub).Error
		if err != nil {
			c.AbortWithStatusJSON(http.StatusPaymentRequired, gin.H{
				"error": "Nenhuma assinatura ativa encontrada", "code": "SUBSCRIPTION_REQUIRED",
			})
			return
		}
		if !sub.IsActive() {
			c.AbortWithStatusJSON(http.StatusPaymentRequired, gin.H{
				"error": "Assinatura expirada", "code": "SUBSCRIPTION_EXPIRED",
			})
			return
		}

		var plan models.Plan
		if err := db.WithContext(ctx).First(&plan, sub.PlanID).Error; err == nil {
			c.Set(CtxPlan, &plan)
		}
		c.Set(CtxSubscription, &sub)
		c.Next()
	}
}
