package clientes

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
)

// bindAvaliacao concentra o preâmbulo repetido de POST e PUT: quem é o ator,
// qual o cliente, e o corpo já validado.
func bindAvaliacao(c *gin.Context) (uint, AvaliacaoInput, bool) {
	var in AvaliacaoInput
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return 0, in, false
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Dados da avaliação inválidos"})
		return 0, in, false
	}
	if err := in.Validar(); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Resultado, código da proposta e código da avaliação são obrigatórios"})
		return 0, in, false
	}
	return id, in, true
}

// CriarAvaliacao — POST /clientes/:id/avaliacoes.
func (h *Handler) CriarAvaliacao(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, in, ok := bindAvaliacao(c)
	if !ok {
		return
	}
	a, err := h.svc.CriarAvaliacao(c.Request.Context(), id, in, actor)
	if err != nil {
		respondAvaliacaoErr(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Avaliação registrada com sucesso", "avaliacao": a})
}

// AtualizarAvaliacao — PUT /clientes/:id/avaliacoes/:avaliacaoId.
func (h *Handler) AtualizarAvaliacao(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, in, ok := bindAvaliacao(c)
	if !ok {
		return
	}
	avaliacaoID, err := strconv.ParseUint(c.Param("avaliacaoId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id da avaliação inválido"})
		return
	}
	a, err := h.svc.AtualizarAvaliacao(c.Request.Context(), id, uint(avaliacaoID), in, actor)
	if err != nil {
		respondAvaliacaoErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Avaliação atualizada com sucesso", "avaliacao": a})
}

// ListarAvaliacoes — GET /clientes/:id/avaliacoes.
func (h *Handler) ListarAvaliacoes(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	lista, err := h.svc.ListarAvaliacoes(c.Request.Context(), id, actor)
	if err != nil {
		respondAvaliacaoErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"avaliacoes": lista})
}

// respondAvaliacaoErr reaproveita o mapeamento do módulo, mas devolve 422 para
// dados inválidos — as rotas de avaliação distinguem "requisição malformada"
// (400) de "campos que não formam uma avaliação" (422). Usa errors.Is em vez
// de comparação direta porque o restante do módulo assim faz (handler.go:656)
// e um erro embrulhado não pode quebrar esse mapeamento silenciosamente.
func respondAvaliacaoErr(c *gin.Context, err error) {
	if errors.Is(err, ErrDadosInvalidos) {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Dados da avaliação inválidos"})
		return
	}
	respondClienteErr(c, err)
}
