package notas

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// RegisterRoutes monta /api/notas. O grupo deve ser protegido por auth e
// tenant scope no router principal.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/notas")
	{
		g.POST("", h.Create)
		g.GET("/:id", h.Get)
		g.PUT("/:id/concluir", h.Concluir)
		g.DELETE("/:id", h.Delete)
		g.GET("/clientes/:id/notas", h.ByCliente)
	}
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}
	n, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		respondErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"nota": n,
		// usuario_responsavel/cliente_nome/whatsapp_enviado/debug_info: dependem
		// de integração WhatsApp fora do escopo desta tarefa.
		"whatsapp_enviado": false,
	})
}

func (h *Handler) Get(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	n, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Nota não encontrada"})
		return
	}
	c.JSON(http.StatusOK, n)
}

func (h *Handler) Concluir(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	n, err := h.svc.Concluir(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Nota não encontrada"})
		return
	}
	c.JSON(http.StatusOK, n)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Nota não encontrada"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) ByCliente(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	list, err := h.svc.ByCliente(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar notas"})
		return
	}
	c.JSON(http.StatusOK, list)
}

func parseID(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(id), nil
}

func respondErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrClienteNaoEncontrado):
		c.JSON(http.StatusNotFound, gin.H{"error": "Cliente não encontrado"})
	case errors.Is(err, ErrUsuarioNaoEncontrado):
		c.JSON(http.StatusBadRequest, gin.H{"error": "criado_por_id inválido"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro interno"})
	}
}
