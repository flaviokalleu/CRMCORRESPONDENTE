package chamados

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"crmimob/internal/modules/portalinquilino"
)

type Handler struct {
	svc  *Service
	auth *portalinquilino.AuthService // autenticação do portal p/ rotas /portal/chamados
}

func NewHandler(svc *Service, portalAuth *portalinquilino.AuthService) *Handler {
	return &Handler{svc: svc, auth: portalAuth}
}

// Register monta as rotas de chamados.
//
// ⚠ Decisão consciente (04-spec Gotcha 2): no Node as rotas admin
// (`/chamados`, `/chamados/:id`, `/chamados/resumo`) são montadas SEM
// nenhuma autenticação. Recomendamos exigir auth+tenant de usuário do
// sistema no Go — o chamador decide isso ao montar o grupo admin (ver
// wiring doc). As rotas `/portal/*` exigem SEMPRE o AuthInquilino deste
// handler (não é opcional).
func (h *Handler) Register(r *gin.RouterGroup) {
	portal := r.Group("/portal")
	portal.Use(h.auth.Required())
	{
		portal.POST("/chamados", h.Abrir)
		portal.GET("/chamados", h.ListMeusChamados)
	}

	r.GET("/chamados", h.ListAdmin)
	r.PUT("/chamados/:id", h.Atualizar)
	r.GET("/chamados/resumo", h.ResumoHandler)
}

func (h *Handler) Abrir(c *gin.Context) {
	claims, ok := portalinquilino.ClaimsFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
		return
	}
	var req AbrirRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ch, err := h.svc.Abrir(c.Request.Context(), claims.ClienteAluguelID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, ch)
}

func (h *Handler) ListMeusChamados(c *gin.Context) {
	claims, ok := portalinquilino.ClaimsFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Não autenticado"})
		return
	}
	out, err := h.svc.ListMeusChamados(c.Request.Context(), claims.ClienteAluguelID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar chamados"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) ListAdmin(c *gin.Context) {
	f := ListFiltro{Status: c.Query("status"), Prioridade: c.Query("prioridade")}
	out, err := h.svc.ListAdmin(c.Request.Context(), f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar chamados"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) Atualizar(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	var req AtualizarRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ch, err := h.svc.Atualizar(c.Request.Context(), uint(id), req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Chamado não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ch)
}

func (h *Handler) ResumoHandler(c *gin.Context) {
	out, err := h.svc.Resumo(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar resumo"})
		return
	}
	c.JSON(http.StatusOK, out)
}
