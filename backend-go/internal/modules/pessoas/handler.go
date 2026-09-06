package pessoas

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Register monta as rotas de pessoas. Auth e tenant são responsabilidade de
// quem monta o grupo, como nos demais módulos. "/pessoas/buscar" é registrada
// antes de "/pessoas/:id" para deixar explícito que a rota estática deve
// vencer o parâmetro — o roteador do Gin já prioriza nós estáticos sobre
// wildcard na mesma posição, então a ordem de registro em si não altera o
// resultado, mas o teste de rota (handler_integration_test.go) confirma isso.
func (h *Handler) Register(r *gin.RouterGroup) {
	r.GET("/pessoas", h.List)
	r.GET("/pessoas/buscar", h.Buscar)
	r.GET("/pessoas/:id", h.Get)
	r.POST("/pessoas", h.Criar)
}

func (h *Handler) List(c *gin.Context) {
	out, err := h.svc.List(c.Request.Context(), c.Query("papel"), c.Query("busca"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar pessoas"})
		return
	}
	c.JSON(http.StatusOK, out)
}

// Buscar responde 200 com null quando não encontra — "não existe" é resposta
// normal no fluxo de cadastro, não erro.
func (h *Handler) Buscar(c *gin.Context) {
	cpf := c.Query("cpf")
	if cpf == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cpf é obrigatório"})
		return
	}
	out, err := h.svc.Buscar(c.Request.Context(), cpf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar pessoa"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	out, err := h.svc.BuscarPorID(c.Request.Context(), uint(id))
	if err != nil {
		if errors.Is(err, ErrNaoEncontrada) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Pessoa não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar pessoa"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) Criar(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	var req CriarRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "papel e nome são obrigatórios"})
		return
	}
	out, err := h.svc.Criar(c.Request.Context(), req, actor)
	if err != nil {
		switch {
		case errors.Is(err, ErrPapelInvalido):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Papel inválido"})
		case errors.Is(err, ErrNomeObrigatorio):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Nome é obrigatório"})
		case errors.Is(err, ErrPapelJaExiste):
			c.JSON(http.StatusConflict, gin.H{"error": "Essa pessoa já tem esse papel"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar pessoa"})
		}
		return
	}
	c.JSON(http.StatusCreated, out)
}
