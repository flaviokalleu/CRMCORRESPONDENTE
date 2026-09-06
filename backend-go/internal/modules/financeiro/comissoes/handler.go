// Package comissoes implementa o CRUD de `routes/comissoes.js` — mount
// `/api/comissoes` (authenticateToken + resolveTenant, ver 03-spec §4).
package comissoes

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/models"
)

type Handler struct{ repo *Repository }

func NewHandler(repo *Repository) *Handler { return &Handler{repo: repo} }

func (h *Handler) Register(rg *gin.RouterGroup) {
	rg.POST("", h.create)
	rg.POST("/", h.create)
	rg.GET("", h.list)
	rg.GET("/", h.list)
	rg.GET("/:id", h.get)
	rg.PUT("/:id", h.update)
	rg.DELETE("/:id", h.delete)
}

// Comissões é o único endpoint do financeiro que não é exclusivo de
// administrador: o corretor precisa enxergar o que ele mesmo tem a receber.
// Admin (e super admin) vê e edita tudo; corretor lê apenas as próprias e não
// escreve; quem não é nem um nem outro leva 403.
func podeGerenciar(u *models.User) bool { return u.IsAdministrador || u.IsSuperAdmin }

// ator devolve o usuário autenticado, já abortando a requisição se não houver.
func ator(c *gin.Context) (*models.User, bool) {
	u, ok := auth.UserFrom(c)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
		return nil, false
	}
	return u, true
}

// exigeGerencia corta a requisição para quem não pode escrever comissão.
func exigeGerencia(c *gin.Context) bool {
	u, ok := ator(c)
	if !ok {
		return false
	}
	if !podeGerenciar(u) {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Apenas administradores podem alterar comissões"})
		return false
	}
	return true
}

func (h *Handler) create(c *gin.Context) {
	if !exigeGerencia(c) {
		return
	}
	var req UpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	m := &models.Comissao{
		Valor: req.Valor, Percentual: req.Percentual, Data: req.Data,
		ContratoID: req.ContratoID, CorretorID: req.CorretorID,
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	if err := h.repo.Create(c.Request.Context(), m); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, m)
}

func (h *Handler) list(c *gin.Context) {
	u, ok := ator(c)
	if !ok {
		return
	}

	var rows []models.Comissao
	var err error
	switch {
	case podeGerenciar(u):
		rows, err = h.repo.List(c.Request.Context())
	case u.IsCorretor:
		rows, err = h.repo.ListByCorretor(c.Request.Context(), u.ID)
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para ver comissões"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rows)
}

func (h *Handler) get(c *gin.Context) {
	u, ok := ator(c)
	if !ok {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	m, err := h.repo.FindByID(c.Request.Context(), uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Comissão não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if !podeGerenciar(u) && (m.CorretorID == nil || *m.CorretorID != u.ID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para ver esta comissão"})
		return
	}
	c.JSON(http.StatusOK, m)
}

func (h *Handler) update(c *gin.Context) {
	if !exigeGerencia(c) {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	if _, err := h.repo.FindByID(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comissão não encontrada"})
		return
	}
	var req UpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updates := map[string]any{
		"valor": req.Valor, "percentual": req.Percentual, "data": req.Data,
		"contratoId": req.ContratoID, "corretorId": req.CorretorID, "updatedAt": time.Now(),
	}
	if err := h.repo.Update(c.Request.Context(), uint(id), updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	m, _ := h.repo.FindByID(c.Request.Context(), uint(id))
	c.JSON(http.StatusOK, m)
}

func (h *Handler) delete(c *gin.Context) {
	if !exigeGerencia(c) {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	if _, err := h.repo.FindByID(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comissão não encontrada"})
		return
	}
	if err := h.repo.Delete(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
