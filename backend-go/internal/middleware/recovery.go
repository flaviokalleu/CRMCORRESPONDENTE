package middleware

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Recovery captura panics e responde 500 sem derrubar o servidor.
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				slog.Error("panic recuperado", "error", r, "path", c.Request.URL.Path)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Erro interno do servidor"})
			}
		}()
		c.Next()
	}
}

// RequestLogger loga cada request de forma estruturada (substitui pino).
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		slog.Info("request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
		)
	}
}
