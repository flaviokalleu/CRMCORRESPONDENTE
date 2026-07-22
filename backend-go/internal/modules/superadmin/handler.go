package superadmin

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/modules/users"
)

// Handler expõe /api/super-admin/tenants,/users,/metrics. Montar SEMPRE atrás
// de auth.Required()+middleware.ResolveTenant+middleware.RequireSuperAdmin
// (ver 01-spec §2.3 e doc de wiring). Plans/Subscriptions ficam no módulo
// billing (PlanHandler/SubscriptionHandler), montados no mesmo grupo.
type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) Register(r *gin.RouterGroup) {
	r.GET("/tenants", h.ListTenants)
	r.GET("/tenants/:id", h.GetTenant)
	r.POST("/tenants", h.CreateTenant)
	r.PUT("/tenants/:id", h.UpdateTenant)
	r.GET("/tenants/:id/modules", h.GetModules)
	r.PATCH("/tenants/:id/toggle-status", h.ToggleStatus)
	r.POST("/tenants/:id/impersonate", h.Impersonate)
	r.GET("/tenants/:id/users", h.ListUsers)
	r.GET("/metrics", h.Metrics)
}

func (h *Handler) ListTenants(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.Query("search")
	var ativo *bool
	if v := c.Query("ativo"); v != "" {
		b := v == "true"
		ativo = &b
	}
	resp, err := h.svc.ListTenants(c.Request.Context(), page, limit, search, ativo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar organizações"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) GetTenant(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	detail, err := h.svc.GetTenantDetail(c.Request.Context(), uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Organização não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar organização"})
		return
	}
	c.JSON(http.StatusOK, detail)
}

func (h *Handler) CreateTenant(c *gin.Context) {
	var req CreateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	t, err := h.svc.CreateTenant(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrWeakPassword):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, ErrSlugTaken), errors.Is(err, ErrEmailTaken):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar organização"})
		}
		return
	}
	c.JSON(http.StatusCreated, t)
}

func (h *Handler) UpdateTenant(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	var req UpdateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	detail, err := h.svc.UpdateTenant(c.Request.Context(), uint(id), req)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Organização não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar organização"})
		return
	}
	c.JSON(http.StatusOK, detail)
}

func (h *Handler) GetModules(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	resp, err := h.svc.GetModules(c.Request.Context(), uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Organização não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao resolver módulos"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) ToggleStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	ativo, err := h.svc.ToggleStatus(c.Request.Context(), uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Organização não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao alterar status"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Status alterado", "ativo": ativo})
}

func (h *Handler) Impersonate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	resp, err := h.svc.Impersonate(c.Request.Context(), uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Organização não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao impersonar"})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) ListUsers(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	list, err := h.svc.ListUsers(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar usuários"})
		return
	}
	c.JSON(http.StatusOK, users.ToResponseList(list))
}

func (h *Handler) Metrics(c *gin.Context) {
	c.JSON(http.StatusOK, h.svc.Metrics(c.Request.Context()))
}
