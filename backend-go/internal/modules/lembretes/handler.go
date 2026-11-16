package lembretes

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Escreva o que precisa ser feito e escolha o dia."})
		return
	}
	req.Titulo = strings.TrimSpace(req.Titulo)
	if req.Titulo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Escreva o que precisa ser feito.", "campo": "titulo"})
		return
	}
	if utf8.RuneCountInString(req.Titulo) > 255 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "O título pode ter no máximo 255 caracteres.", "campo": "titulo"})
		return
	}
	t, ok := parseData(req.Data)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data inválida. Escolha o dia no calendário.", "campo": "data"})
		return
	}
	l, err := h.svc.Create(c.Request.Context(), CreateInput{Titulo: req.Titulo, Descricao: req.Descricao, Data: t})
	if err != nil {
		if errors.Is(err, ErrDuplicado) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Já existe uma tarefa com este título neste dia."})
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

// UpdateStatus: PUT /api/lembretes/:id. Aceita `status` (marcar feita /
// reabrir) e, para editar, `titulo`, `descricao` e `data` — todos opcionais.
// Antes só havia status: a tela não tinha como corrigir uma tarefa.
func (h *Handler) UpdateStatus(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	var req struct {
		Status    *string `json:"status"`
		Titulo    *string `json:"titulo"`
		Descricao *string `json:"descricao"`
		Data      *string `json:"data"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}
	in := UpdateInput{Status: req.Status, Titulo: req.Titulo, Descricao: req.Descricao}
	if req.Titulo != nil {
		t := strings.TrimSpace(*req.Titulo)
		if t == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Escreva o que precisa ser feito.", "campo": "titulo"})
			return
		}
		if utf8.RuneCountInString(t) > 255 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "O título pode ter no máximo 255 caracteres.", "campo": "titulo"})
			return
		}
		in.Titulo = &t
	}
	if req.Data != nil {
		t, ok := parseData(*req.Data)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data inválida. Escolha o dia no calendário.", "campo": "data"})
			return
		}
		in.Data = &t
	}
	l, err := h.svc.Update(c.Request.Context(), id, in)
	if err != nil {
		if errors.Is(err, ErrDuplicado) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Já existe uma tarefa com este título neste dia."})
			return
		}
		if errors.Is(err, ErrNaoEncontrado) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Lembrete não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar lembrete"})
		return
	}
	c.JSON(http.StatusOK, l)
}

// parseData aceita RFC3339 ou só a data (AAAA-MM-DD), com ano plausível.
func parseData(s string) (time.Time, bool) {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		t, err = time.Parse("2006-01-02", s)
		if err != nil {
			return time.Time{}, false
		}
	}
	if t.Year() < 2000 || t.Year() > 2100 {
		return time.Time{}, false
	}
	return t, true
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
