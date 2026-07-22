package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// CORS replica a política do Node: allowlist em produção, liberado em dev.
func CORS(allowed []string, production bool) gin.HandlerFunc {
	set := make(map[string]bool, len(allowed))
	for _, o := range allowed {
		set[o] = true
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if !production {
			if origin != "" {
				c.Header("Access-Control-Allow-Origin", origin)
			}
		} else if set[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Tenant-Id")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
