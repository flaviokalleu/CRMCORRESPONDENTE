package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/models"
	"crmimob/internal/modules/billing"
)

// resourceTable mapeia o nome do recurso do gate para a tabela que precisa
// ser contada e o campo de limite efetivo — mesmo mapa do checkLimit do Node
// (clientes/usuarios/imoveis/alugueis). Ver 01-spec §6.2.
var resourceTable = map[string]string{
	"clientes": "clientes",
	"usuarios": "users",
	"imoveis":  "imoveis",
	"alugueis": "alugueis",
}

var resourceLimitField = map[string]string{
	"clientes": "clientes",
	"usuarios": "usuarios",
	"imoveis":  "imoveis",
	"alugueis": "alugueis",
}

// tenantAndPlan resolve o *models.Tenant e o *models.Plan efetivo (via
// assinatura active/trialing mais recente) para o tenant do usuário logado.
// Devolve plan=nil se não houver assinatura (equivalente a "sem plano").
func tenantAndPlan(c *gin.Context, db *gorm.DB) (*models.User, *models.Tenant, *models.Plan, bool) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
		return nil, nil, nil, false
	}
	if user.IsSuperAdmin {
		return user, nil, nil, true
	}
	if user.TenantID == nil {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Usuário sem organização"})
		return nil, nil, nil, false
	}

	ctx := c.Request.Context()
	var tenant models.Tenant
	if err := db.WithContext(ctx).First(&tenant, *user.TenantID).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Organização não encontrada"})
		return nil, nil, nil, false
	}

	// Reaproveita o plano já resolvido por RequireActiveSubscription, se disponível.
	if v, exists := c.Get(CtxPlan); exists {
		if p, ok := v.(*models.Plan); ok {
			return user, &tenant, p, true
		}
	}

	var sub models.Subscription
	err := db.WithContext(ctx).
		Where("tenant_id = ? AND status IN ?", *user.TenantID, []string{"active", "trialing"}).
		Order("created_at DESC").First(&sub).Error
	if err != nil {
		return user, &tenant, nil, true // sem assinatura → plan nil, quem chama decide o 402
	}
	var plan models.Plan
	if err := db.WithContext(ctx).First(&plan, sub.PlanID).Error; err != nil {
		return user, &tenant, nil, true
	}
	return user, &tenant, &plan, true
}

// RequireFeature(feature) replica checkFeature do Node: super admin bypass;
// sem plano → 402 NO_PLAN; feature desabilitada → 403 FEATURE_NOT_AVAILABLE.
// Códigos e status preservados propositalmente (contrato do frontend).
func RequireFeature(db *gorm.DB, feature string) gin.HandlerFunc {
	resolver := billing.NewPlanResolver()
	return func(c *gin.Context) {
		user, tenant, plan, ok := tenantAndPlan(c, db)
		if !ok {
			return
		}
		if user.IsSuperAdmin {
			c.Next()
			return
		}
		if plan == nil {
			c.AbortWithStatusJSON(http.StatusPaymentRequired, gin.H{
				"error": "Nenhum plano ativo", "code": "NO_PLAN",
			})
			return
		}
		if !resolver.IsFeatureEnabled(tenant, plan, feature) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":              "Recurso não disponível no seu plano",
				"code":               "FEATURE_NOT_AVAILABLE",
				"feature":            feature,
				"plano_atual":        plan.Nome,
				"upgrade_necessario": true,
			})
			return
		}
		c.Next()
	}
}

// RequireLimit(resource) replica checkLimit do Node: super admin bypass; sem
// plano → 402 NO_PLAN; 0=ilimitado passa direto; conta linhas do tenant na
// tabela do recurso; >=limite → 403 LIMIT_REACHED. Fail-open: erro no count
// deixa passar (mesmo comportamento tolerante do Node, ver 01-spec §6.2/gotcha §7.8).
func RequireLimit(db *gorm.DB, resource string) gin.HandlerFunc {
	resolver := billing.NewPlanResolver()
	table, tableOK := resourceTable[resource]
	field, fieldOK := resourceLimitField[resource]

	return func(c *gin.Context) {
		if !tableOK || !fieldOK {
			c.Next() // recurso desconhecido: no-op (erro de configuração, não do request)
			return
		}

		user, tenant, plan, ok := tenantAndPlan(c, db)
		if !ok {
			return
		}
		if user.IsSuperAdmin {
			c.Next()
			return
		}
		if plan == nil {
			c.AbortWithStatusJSON(http.StatusPaymentRequired, gin.H{
				"error": "Nenhum plano ativo", "code": "NO_PLAN",
			})
			return
		}

		maxAllowed := resolver.EffectiveLimit(tenant, plan, field)
		if maxAllowed == 0 {
			c.Next() // 0 = ilimitado
			return
		}

		var count int64
		if err := db.WithContext(c.Request.Context()).Table(table).Where("tenant_id = ?", tenant.ID).Count(&count).Error; err != nil {
			c.Next() // fail-open
			return
		}
		if count >= int64(maxAllowed) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "Limite do plano atingido",
				"code":    "LIMIT_REACHED",
				"limite":  maxAllowed,
				"atual":   count,
				"recurso": resource,
			})
			return
		}
		c.Set("resourceUsage", gin.H{"atual": count, "limite": maxAllowed})
		c.Next()
	}
}

// RequireStorageLimit deve rodar ANTES do parse do multipart (equivalente a
// checkStorageLimit, pré-upload). Super bypass; sem tenant→passa;
// max=0→ilimitado passa; storage_used_bytes>=limite→413
// STORAGE_LIMIT_REACHED; Content-Length>limite de arquivo→413 FILE_TOO_LARGE.
// Fail-open em erro. Ver 01-spec §6.3.
func RequireStorageLimit(db *gorm.DB) gin.HandlerFunc {
	resolver := billing.NewPlanResolver()
	return func(c *gin.Context) {
		user, ok := auth.UserFrom(c)
		if !ok || user.IsSuperAdmin || user.TenantID == nil {
			c.Next()
			return
		}

		ctx := c.Request.Context()
		var tenant models.Tenant
		if err := db.WithContext(ctx).First(&tenant, *user.TenantID).Error; err != nil {
			c.Next() // fail-open
			return
		}

		var plan *models.Plan
		var sub models.Subscription
		if err := db.WithContext(ctx).
			Where("tenant_id = ? AND status IN ?", tenant.ID, []string{"active", "trialing"}).
			Order("created_at DESC").First(&sub).Error; err == nil {
			var p models.Plan
			if db.WithContext(ctx).First(&p, sub.PlanID).Error == nil {
				plan = &p
			}
		}

		maxStorageMB := resolver.EffectiveLimit(&tenant, plan, "storage_mb")
		if maxStorageMB > 0 {
			limitBytes := int64(maxStorageMB) * 1024 * 1024
			if tenant.StorageUsedBytes >= limitBytes {
				c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{
					"error": "Limite de armazenamento atingido", "code": "STORAGE_LIMIT_REACHED",
				})
				return
			}
		}

		maxFileMB := resolver.EffectiveLimit(&tenant, plan, "file_size_mb")
		if maxFileMB > 0 && c.Request.ContentLength > int64(maxFileMB)*1024*1024 {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "Arquivo excede o tamanho máximo permitido", "code": "FILE_TOO_LARGE",
			})
			return
		}
		c.Next()
	}
}
