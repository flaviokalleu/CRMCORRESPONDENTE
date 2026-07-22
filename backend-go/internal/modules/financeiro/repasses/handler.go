package repasses

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Register monta as rotas autenticadas em `rg` (deve já estar sob
// Required+ResolveTenant no router). RegisterPublic monta a rota SEM auth
// (gotcha 03-spec §8: `/clientealuguel/:id/multa-juros` fica fora do prefixo
// `/repasses`, logo fora do middleware).
func (h *Handler) Register(rg *gin.RouterGroup) {
	rg.GET("", h.list)
	rg.POST("/gerar", h.gerar)
	rg.POST("/:id/transferir", h.transferir)
	rg.PUT("/:id/confirmar", h.confirmar)
	rg.GET("/resumo", h.resumo)
}

// RegisterPublic monta `/clientealuguel/:id/multa-juros` SEM auth, replicando
// o comportamento (não necessariamente desejável) do Node — ver 03-spec gotcha §8.
func (h *Handler) RegisterPublic(rg *gin.RouterGroup) {
	rg.GET("/clientealuguel/:id/multa-juros", h.multaJuros)
}

func tenantIDFromUser(c *gin.Context) *uint {
	if u, ok := auth.UserFrom(c); ok {
		return u.TenantID
	}
	return nil
}

func (h *Handler) list(c *gin.Context) {
	var q ListQuery
	_ = c.ShouldBindQuery(&q)
	rows, err := h.svc.List(c.Request.Context(), ListFilter{
		MesReferencia: q.Mes, Status: q.Status, TransferStatus: q.TransferStatus,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rows)
}

func (h *Handler) gerar(c *gin.Context) {
	var req GerarRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := h.svc.GerarMes(c.Request.Context(), tenantIDFromUser(c), req.Mes, req.EnviarPix)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) transferir(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	r, err := h.svc.Transferir(c.Request.Context(), tenantIDFromUser(c), uint(id))
	if err != nil {
		if errors.Is(err, ErrRepasseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "PIX enviado", "repasse": r})
}

func (h *Handler) confirmar(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	var req ConfirmarRequest
	_ = c.ShouldBindJSON(&req)
	r, err := h.svc.Confirmar(c.Request.Context(), uint(id), req.Observacao)
	if err != nil {
		if errors.Is(err, ErrRepasseNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, r)
}

func (h *Handler) resumo(c *gin.Context) {
	var q ResumoQuery
	if err := c.ShouldBindQuery(&q); err != nil || q.Mes == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "mes é obrigatório"})
		return
	}
	resp, err := h.svc.Resumo(c.Request.Context(), q.Mes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) multaJuros(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	items, err := h.svc.MultaJuros(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}
