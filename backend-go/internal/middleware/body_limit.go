package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// BodyLimit protege endpoints JSON públicos contra corpos arbitrariamente
// grandes. Rotas de upload usam limites próprios e não devem aplicar este
// middleware.
func BodyLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}
