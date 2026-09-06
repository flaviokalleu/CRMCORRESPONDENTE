package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
)

// RequireAdministrador exige user.IsAdministrador, 403 caso contrário. Mesmo
// contrato do RequireSuperAdmin: roda depois de auth.Required() e de
// ResolveTenant. Super admin passa junto — ele já enxerga qualquer tenant, e
// barrá-lo aqui só criaria um buraco de suporte.
func RequireAdministrador() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := auth.UserFrom(c)
		if !ok || !(user.IsAdministrador || user.IsSuperAdmin) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Acesso restrito a administradores"})
			return
		}
		c.Next()
	}
}
