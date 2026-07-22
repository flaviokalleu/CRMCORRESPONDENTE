package vistorias

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Register monta as rotas de vistorias.
//
// ⚠ Decisão consciente (04-spec Gotcha 2): no Node este router é montado SEM
// nenhuma autenticação. Recomendamos exigir auth+tenant no Go (o chamador
// decide isso ao montar o grupo — ver wiring doc). A ordem das rotas
// preserva a resolução do Node: `/vistorias/cliente/:id` e
// `/vistorias/:id/comparativo` usam segmentos literais que o Gin
// resolve antes do padrão genérico `/vistorias/:id` (04-spec Gotcha 14) —
// por isso são registradas primeiro. Gin exige o MESMO nome de wildcard em
// todas as rotas de um mesmo nível da árvore — por isso ":id" (não
// ":clienteId") é usado aqui, embora semanticamente identifique o cliente.
func (h *Handler) Register(r *gin.RouterGroup) {
	r.POST("/vistorias", h.Create)
	r.GET("/vistorias/cliente/:id", h.ListByCliente)
	r.GET("/vistorias/:id/comparativo", h.Comparativo)
	r.GET("/vistorias/:id", h.Get)
	r.PUT("/vistorias/:id", h.Update)
	r.POST("/vistorias/:id/fotos", h.AddFotos)
	r.POST("/vistorias/:id/gerar-pdf", h.GerarPDF)
}

func parseID(c *gin.Context, name string) (uint, bool) {
	id, err := strconv.ParseUint(c.Param(name), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return 0, false
	}
	return uint(id), true
}

func (h *Handler) Create(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	v, err := h.svc.Create(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, v)
}

func (h *Handler) ListByCliente(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.svc.ListByCliente(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar vistorias"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	v, err := h.svc.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Vistoria não encontrada"})
		return
	}
	c.JSON(http.StatusOK, v)
}

func (h *Handler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	v, err := h.svc.Update(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Vistoria não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, v)
}

func (h *Handler) AddFotos(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req FotoRequest
	_ = c.ShouldBind(&req)
	v, err := h.svc.AddFotos(c, id, req.Descricao, req.Comodo)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Vistoria não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, v)
}

func (h *Handler) GerarPDF(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	url, err := h.svc.GerarPDF(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Vistoria não encontrada"})
			return
		}
		if errors.Is(err, ErrPDFEngineNotConfigured) {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Geração de PDF indisponível (motor não configurado)"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Laudo gerado", "pdf_url": url})
}

func (h *Handler) Comparativo(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.svc.Comparativo(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao montar comparativo"})
		return
	}
	c.JSON(http.StatusOK, out)
}
