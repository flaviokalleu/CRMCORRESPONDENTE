package auth

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Handler agrupa as rotas de autenticação (/api/auth).
type Handler struct {
	repo *Repository
	svc  *Service
}

func NewHandler(repo *Repository, svc *Service) *Handler {
	return &Handler{repo: repo, svc: svc}
}

// Register monta as rotas de auth no grupo. Auth é por-rota (não global).
func (h *Handler) Register(r *gin.RouterGroup) {
	r.POST("/login", h.Login)
	r.POST("/refresh-token", h.Refresh)
	r.POST("/logout", h.Required(), h.Logout)
	r.POST("/validate-token", h.Required(), h.Validate)
	r.GET("/me", h.Required(), h.Me)
}

// Login: valida credenciais, aplica 1-sessão-por-usuário e devolve o par de tokens.
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email e senha são obrigatórios"})
		return
	}

	ctx := c.Request.Context()
	user, err := h.repo.FindUserByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciais inválidas"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro interno de autenticação"})
		return
	}

	if !CheckPassword(user.Password, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciais inválidas"})
		return
	}

	access, err := h.svc.GenerateAccess(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar token"})
		return
	}
	refresh, err := h.svc.GenerateRefresh(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar token"})
		return
	}

	role := user.Role()
	tok := &models.Token{
		Token:        access,
		RefreshToken: &refresh,
		UserID:       user.ID,
		UserType:     &role,
		Email:        user.Email,
		ExpiresAt:    time.Now().Add(AccessTTL),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	if err := h.repo.ReplaceUserSession(ctx, tok); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao registrar sessão"})
		return
	}

	c.JSON(http.StatusOK, LoginResponse{Token: access, RefreshToken: refresh, User: userPayload(user)})
}

// Refresh: valida o refresh token (registro + assinatura) e emite novo access.
func (h *Handler) Refresh(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "refreshToken é obrigatório"})
		return
	}

	ctx := c.Request.Context()
	rec, err := h.repo.FindTokenByRefresh(ctx, req.RefreshToken)
	if err != nil || time.Now().After(rec.ExpiresAt) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Refresh token expirado ou inválido"})
		return
	}

	claims, err := h.svc.ParseRefresh(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Refresh token inválido"})
		return
	}

	user, err := h.repo.FindUserByID(ctx, claims.UserID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuário não encontrado"})
		return
	}

	access, err := h.svc.GenerateAccess(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar token"})
		return
	}
	if err := h.repo.TouchAccess(ctx, req.RefreshToken, access); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar sessão"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": access})
}

// Logout: remove o registro do access token atual.
func (h *Handler) Logout(c *gin.Context) {
	if raw := bearer(c); raw != "" {
		_ = h.repo.DeleteByAccess(c.Request.Context(), raw)
	}
	c.JSON(http.StatusOK, gin.H{"message": "Logout efetuado"})
}

// Validate: smoke-test de token válido.
func (h *Handler) Validate(c *gin.Context) {
	user, _ := UserFrom(c)
	c.JSON(http.StatusOK, gin.H{"valid": true, "user": gin.H{
		"id": user.ID, "email": user.Email, "role": user.Role(),
	}})
}

// Me: perfil do usuário autenticado (sem password).
func (h *Handler) Me(c *gin.Context) {
	user, _ := UserFrom(c)
	c.JSON(http.StatusOK, gin.H{
		"user":           userPayload(user),
		"role":           user.Role(),
		"tenant_id":      user.TenantID,
		"is_super_admin": user.IsSuperAdmin,
	})
}
