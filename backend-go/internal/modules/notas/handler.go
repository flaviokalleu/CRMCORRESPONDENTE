package notas

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
)

// podeAlterar: editar/excluir nota é do autor, do administrador ou do
// correspondente (antes só a tela restringia; pela API qualquer um apagava).
// A nota já vem filtrada pela empresa (escopo automático de tenant).
func (h *Handler) podeAlterar(c *gin.Context, id uint) bool {
	n, err := h.svc.Get(c.Request.Context(), id)
	if err != nil || n == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Nota não encontrada"})
		return false
	}
	u, ok := auth.UserFrom(c)
	if ok && (u.IsAdministrador || u.IsCorrespondente || u.IsSuperAdmin || (n.CriadoPorID != nil && *n.CriadoPorID == u.ID)) {
		return true
	}
	c.JSON(http.StatusForbidden, gin.H{"error": "Só quem escreveu a nota, o administrador ou o correspondente pode alterá-la."})
	return false
}

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
		g.PUT("/:id", h.Editar)
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

// Editar — PUT /notas/:id  body { texto }.
func (h *Handler) Editar(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	if !h.podeAlterar(c, uint(id)) {
		return
	}
	var body struct {
		Texto string `json:"texto"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": ErrTextoInvalido.Error(), "campo": "texto"})
		return
	}
	n, err := h.svc.Editar(c.Request.Context(), id, body.Texto)
	if err != nil {
		if errors.Is(err, ErrNaoEncontrada) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Nota não encontrada"})
			return
		}
		respondErr(c, err)
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
	if !h.podeAlterar(c, uint(id)) {
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
	case errors.Is(err, ErrTextoInvalido):
		c.JSON(http.StatusBadRequest, gin.H{"error": ErrTextoInvalido.Error(), "campo": "texto"})
	case errors.Is(err, ErrUsuarioNaoEncontrado):
		c.JSON(http.StatusBadRequest, gin.H{"error": "criado_por_id inválido"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro interno"})
	}
}
