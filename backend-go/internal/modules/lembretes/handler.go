package lembretes

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// RegisterRoutes monta /api/lembretes. O grupo deve ser protegido por auth e
// tenant scope no router principal.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/lembretes")
	{
		g.POST("", h.Create)
		g.GET("", h.List)
		g.GET("/:id", h.Get)
		g.PUT("/:id", h.UpdateStatus)
		g.DELETE("/:id", h.Delete)
	}
}

type createRequest struct {
	Titulo    string  `json:"titulo" binding:"required"`
	Descricao *string `json:"descricao"`
	Data      string  `json:"data" binding:"required"`
}

func (h *Handler) Create(c *gin.Context) {
	var req createRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "titulo e data são obrigatórios"})
		return
	}
	t, err := time.Parse(time.RFC3339, req.Data)
	if err != nil {
		t, err = time.Parse("2006-01-02", req.Data)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "data inválida"})
			return
		}
	}
	l, err := h.svc.Create(c.Request.Context(), CreateInput{Titulo: req.Titulo, Descricao: req.Descricao, Data: t})
	if err != nil {
		if errors.Is(err, ErrDuplicado) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Já existe um lembrete com este título nesta data"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar lembrete"})
		return
	}
	c.JSON(http.StatusCreated, l)
}

func (h *Handler) List(c *gin.Context) {
	list, err := h.svc.All(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar lembretes"})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *Handler) Get(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	l, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lembrete não encontrado"})
		return
	}
	c.JSON(http.StatusOK, l)
}

func (h *Handler) UpdateStatus(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status é obrigatório"})
		return
	}
	l, err := h.svc.UpdateStatus(c.Request.Context(), id, req.Status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lembrete não encontrado"})
		return
	}
	c.JSON(http.StatusOK, l)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lembrete não encontrado"})
		return
	}
	c.Status(http.StatusNoContent)
}

func parseID(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(id), nil
}
