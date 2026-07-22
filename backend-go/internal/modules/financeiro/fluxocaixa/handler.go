// Package fluxocaixa implementa o CRUD + dashboard de `routes/fluxocaixa.js`
// — mount `/api/fluxocaixa` (authenticateToken + resolveTenant, 03-spec §4).
package fluxocaixa

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Handler struct {
	repo *Repository
	svc  *Service
}

func NewHandler(repo *Repository, svc *Service) *Handler { return &Handler{repo: repo, svc: svc} }

func (h *Handler) Register(rg *gin.RouterGroup) {
	rg.GET("/dashboard", h.dashboard) // registrado antes de /:id para não colidir
	rg.POST("/", h.create)
	rg.GET("/", h.list)
	rg.GET("/:id", h.get)
	rg.PUT("/:id", h.update)
	rg.DELETE("/:id", h.delete)
}

func (h *Handler) dashboard(c *gin.Context) {
	resp, err := h.svc.Dashboard(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) create(c *gin.Context) {
	var req UpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	m := &models.FluxoCaixa{
		Data: req.Data, Tipo: req.Tipo, Valor: req.Valor, Descricao: req.Descricao,
		ReferenciaID: req.ReferenciaID, ReferenciaTipo: req.ReferenciaTipo,
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	if err := h.repo.Create(c.Request.Context(), m); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, m)
}

func (h *Handler) list(c *gin.Context) {
	rows, err := h.repo.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rows)
}

func (h *Handler) get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	m, err := h.repo.FindByID(c.Request.Context(), uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Lançamento não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, m)
}

func (h *Handler) update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	if _, err := h.repo.FindByID(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lançamento não encontrado"})
		return
	}
	var req UpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	updates := map[string]any{
		"data": req.Data, "tipo": req.Tipo, "valor": req.Valor, "descricao": req.Descricao,
		"referenciaId": req.ReferenciaID, "referenciaTipo": req.ReferenciaTipo, "updatedAt": time.Now(),
	}
	if err := h.repo.Update(c.Request.Context(), uint(id), updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	m, _ := h.repo.FindByID(c.Request.Context(), uint(id))
	c.JSON(http.StatusOK, m)
}

func (h *Handler) delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	if _, err := h.repo.FindByID(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lançamento não encontrado"})
		return
	}
	if err := h.repo.Delete(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
