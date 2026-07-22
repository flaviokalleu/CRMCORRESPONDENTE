package billing

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PlanHandler expõe o CRUD de planos. Montar atrás de
// auth+ResolveTenant+RequireSuperAdmin (ver 01-spec §2.3, /api/super-admin/plans).
type PlanHandler struct{ svc *Service }

func NewPlanHandler(svc *Service) *PlanHandler { return &PlanHandler{svc: svc} }

func (h *PlanHandler) Register(r *gin.RouterGroup) {
	r.GET("/plans", h.List)
	r.POST("/plans", h.Create)
	r.PUT("/plans/:id", h.Update)
}

func (h *PlanHandler) List(c *gin.Context) {
	list, err := h.svc.ListPlans(c.Request.Context(), false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar planos"})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *PlanHandler) Create(c *gin.Context) {
	var req PlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	p, err := h.svc.CreatePlan(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar plano"})
		return
	}
	c.JSON(http.StatusCreated, p)
}

func (h *PlanHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	var req PlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	p, err := h.svc.UpdatePlan(c.Request.Context(), uint(id), req)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Plano não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar plano"})
		return
	}
	c.JSON(http.StatusOK, p)
}
