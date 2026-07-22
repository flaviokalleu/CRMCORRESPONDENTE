package middleware

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/models"
	"crmimob/internal/tenant"
)

// ResolveTenant é o equivalente ao resolveTenant do Node (tenantMiddleware.js).
// Deve rodar DEPOIS de auth.Required. Resolve o tenant efetivo, valida que está
// ativo e injeta o Scope no context do request — os callbacks GORM leem daí.
//
// Correção deliberada de segurança: o override via X-Tenant-Id é restrito a
// is_super_admin (o Node deixava admin comum trocar de tenant — gotcha 01-spec §7.10).
func ResolveTenant(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := auth.UserFrom(c)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
			return
		}

		scope := tenant.Scope{IsSuperAdmin: user.IsSuperAdmin}

		if user.IsSuperAdmin {
			// Super admin: usa X-Tenant-Id se presente, senão acesso global (nil).
			if h := c.GetHeader("X-Tenant-Id"); h != "" {
				if id, err := strconv.ParseUint(h, 10, 64); err == nil {
					tid := uint(id)
					scope.TenantID = &tid
				}
			} else {
				scope.TenantID = user.TenantID // pode ser nil → global
			}
		} else {
			// Usuário comum: exige tenant próprio e que ele esteja ativo.
			if user.TenantID == nil {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Usuário sem organização"})
				return
			}
			var t models.Tenant
			if err := db.WithContext(c.Request.Context()).First(&t, *user.TenantID).Error; err != nil {
				c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Organização não encontrada"})
				return
			}
			if !t.Ativo {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Organização inativa"})
				return
			}
			scope.TenantID = user.TenantID
		}

		ctx := tenant.With(c.Request.Context(), scope)
		c.Request = c.Request.WithContext(ctx)
		if scope.TenantID != nil {
			c.Set("tenant_id", *scope.TenantID)
		}
		c.Set("is_super_admin", scope.IsSuperAdmin)
		c.Next()
	}
}
