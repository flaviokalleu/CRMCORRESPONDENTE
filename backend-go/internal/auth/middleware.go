package auth

import (
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"crmimob/internal/models"
)

// Chaves de contexto Gin.
const (
	CtxUser   = "user"
	CtxClaims = "claims"
)

// Required é o middleware de autenticação unificado. Faz a DUPLA verificação do
// Node: (1) registro presente em `tokens` e não expirado; (2) assinatura JWT
// válida; (3) usuário existe. Ver 01-spec §4.2.
func (h *Handler) Required() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := bearer(c)
		if raw == "" {
			c.AbortWithStatusJSON(401, gin.H{"error": "Token não fornecido"})
			return
		}

		ctx := c.Request.Context()

		rec, err := h.repo.FindTokenByAccess(ctx, raw)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "Token expirado ou inválido"})
			return
		}
		if time.Now().After(rec.ExpiresAt) {
			c.AbortWithStatusJSON(401, gin.H{"error": "Token expirado ou inválido"})
			return
		}

		claims, err := h.svc.ParseAccess(raw)
		if err != nil {
			c.AbortWithStatusJSON(403, gin.H{"error": "Token inválido"})
			return
		}

		user, err := h.repo.FindUserByID(ctx, claims.UserID)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "Usuário não encontrado"})
			return
		}

		c.Set(CtxUser, user)
		c.Set(CtxClaims, claims)
		c.Next()
	}
}

func bearer(c *gin.Context) string {
	h := c.GetHeader("Authorization")
	if h == "" {
		return ""
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

// UserFrom recupera o *models.User autenticado do contexto Gin.
func UserFrom(c *gin.Context) (*models.User, bool) {
	v, ok := c.Get(CtxUser)
	if !ok {
		return nil, false
	}
	u, ok := v.(*models.User)
	return u, ok
}
