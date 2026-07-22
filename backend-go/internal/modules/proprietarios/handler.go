package proprietarios

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Register monta as rotas de proprietários. No Node o router aplicava
// auth+tenant internamente (`router.use(authenticateToken, resolveTenant)`);
// aqui isso é responsabilidade de quem monta o grupo (ver wiring doc).
func (h *Handler) Register(r *gin.RouterGroup) {
	r.GET("/proprietarios", h.List)
	r.POST("/proprietarios", h.Create)
	r.DELETE("/proprietarios/:id", h.Delete)
}

func (h *Handler) List(c *gin.Context) {
	out, err := h.svc.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar proprietários"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name é obrigatório"})
		return
	}
	p, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar proprietário"})
		return
	}
	c.JSON(http.StatusCreated, p)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Proprietário não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao remover proprietário"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Proprietário removido"})
}
