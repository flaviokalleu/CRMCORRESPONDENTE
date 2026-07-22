package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
)

// RequireSuperAdmin replica requireSuperAdmin do Node: exige
// user.IsSuperAdmin, 403 caso contrário. Deve rodar depois de
// auth.Required() (e tipicamente depois de ResolveTenant). Ver 01-spec §2.3.
func RequireSuperAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := auth.UserFrom(c)
		if !ok || !user.IsSuperAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Acesso restrito a super administradores"})
			return
		}
		c.Next()
	}
}
