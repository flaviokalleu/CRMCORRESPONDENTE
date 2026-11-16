package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/models"
	"crmimob/internal/modules/billing"
)

// RegrasDoPlano liga os limites e recursos do plano às rotas, num lugar só:
// a chave é "MÉTODO /molde/da/rota" (c.FullPath()). Aplicar nos grupos da
// imobiliária depois de auth + tenant. Rota fora da tabela passa direto.
// Rota nova que cria um recurso limitado ou usa um recurso pago entra aqui.
func RegrasDoPlano(db *gorm.DB) gin.HandlerFunc {
	pagamentos := RequireFeature(db, "has_pagamentos")
	regras := map[string]gin.HandlerFunc{
		"POST /api/clientes":       RequireLimit(db, "clientes"),
		"POST /api/imoveis/":       RequireLimit(db, "imoveis"),
		"POST /api/alugueis":       RequireLimit(db, "alugueis"),
		"POST /api/corretor":       RequireLimit(db, "usuarios"),
		"POST /api/correspondente": RequireLimit(db, "usuarios"),

		"POST /api/pagamentos/boleto":                    pagamentos,
		"POST /api/pagamentos/pix":                       pagamentos,
		"POST /api/pagamentos/universal":                 pagamentos,
		"POST /api/clientealuguel/:id/cobranca-avulsa":   pagamentos,
		"POST /api/clientealuguel/:id/sincronizar-asaas": pagamentos,
	}
	return func(c *gin.Context) {
		if regra, ok := regras[c.Request.Method+" "+c.FullPath()]; ok {
			regra(c) // a regra chama c.Next() ou aborta
			return
		}
		c.Next()
	}
}

// RequireFeatureDoTenant é o RequireFeature para módulos que resolvem a
// empresa por conta própria (ex.: WhatsApp, sem auth.Required no grupo).
func RequireFeatureDoTenant(db *gorm.DB, feature string, resolver func(*gin.Context) (uint, bool, bool)) gin.HandlerFunc {
	planos := billing.NewPlanResolver()
	return func(c *gin.Context) {
		tid, superAdmin, ok := resolver(c)
		if !ok || superAdmin {
			c.Next()
			return
		}
		ctx := c.Request.Context()
		var t models.Tenant
		if err := db.WithContext(ctx).First(&t, tid).Error; err != nil {
			c.Next() // fail-open, como os demais gates
			return
		}
		var sub models.Subscription
		var p *models.Plan
		if db.WithContext(ctx).Where("tenant_id = ?", tid).Order("id DESC").First(&sub).Error == nil {
			var plan models.Plan
			if db.WithContext(ctx).First(&plan, sub.PlanID).Error == nil {
				p = &plan
			}
		}
		if !planos.IsFeatureEnabled(&t, p, feature) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "Este recurso não faz parte do seu plano. Veja os planos em Minha assinatura.",
				"code":    "FEATURE_NOT_AVAILABLE",
				"feature": feature,
			})
			return
		}
		c.Next()
	}
}
