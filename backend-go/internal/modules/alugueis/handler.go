package alugueis

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"crmimob/internal/tenant"
)

type Handler struct {
	svc          *Service
	inquilinoSvc *InquilinoService
	repo         *Repository
}

func NewHandler(svc *Service, inquilinoSvc *InquilinoService, repo *Repository) *Handler {
	return &Handler{svc: svc, inquilinoSvc: inquilinoSvc, repo: repo}
}

// Register monta as rotas de /alugueis, /clientealuguel e /alugueis-disponiveis.
// O chamador (router) já deve ter aplicado auth.Required()+middleware.ResolveTenant
// no grupo (ver wiring doc — 04-spec §Ordem de montagem, itens 4 e 6).
func (h *Handler) Register(r *gin.RouterGroup) {
	r.GET("/alugueis", h.ListAlugueis)
	r.POST("/alugueis", h.CreateAluguel)
	r.PUT("/alugueis/:id", h.UpdateAluguel)
	r.PUT("/alugueis/:id/alugado", h.ToggleAlugado)
	r.DELETE("/alugueis/:id", h.DeleteAluguel)
	r.GET("/alugueis/:id/download", h.DownloadFotos)
	r.POST("/alugueis/cleanup-temp", h.CleanupTemp)

	r.GET("/alugueis-disponiveis", h.ListAlugueisDisponiveis)

	r.POST("/clientealuguel", h.CreateInquilino)
	r.GET("/clientealuguel", h.ListInquilinos)
	r.GET("/clientealuguel/:id", h.GetInquilino)
	r.POST("/clientealuguel/:id/pagamento", h.AddPagamentoManual)
	r.DELETE("/clientealuguel/:id/pagamento/:pagamentoId", h.DeletePagamentoManual)
	r.PUT("/clientealuguel/:id", h.UpdateInquilino)
	r.DELETE("/clientealuguel/:id", h.DeleteInquilino)
	r.POST("/clientealuguel/:id/cobranca-avulsa", h.CriarCobrancaAvulsa)
	r.GET("/clientealuguel/:id/cobrancas", h.ListCobrancas)
	r.POST("/clientealuguel/:id/sincronizar-asaas", h.SincronizarAsaas)
	r.POST("/clientealuguel/:id/score", h.CalcularScore)
	r.GET("/clientealuguel/:id/multa-juros", h.MultaJuros)
}

func idParam(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return 0, false
	}
	return uint(id), true
}

func currentTenantID(c *gin.Context) *uint {
	scope, ok := tenant.From(c.Request.Context())
	if !ok {
		return nil
	}
	return scope.TenantID
}

func (h *Handler) asaasKey(c *gin.Context) string {
	tid := currentTenantID(c)
	if tid == nil {
		return ""
	}
	return h.repo.TenantAsaasAPIKey(c.Request.Context(), *tid)
}

// --- Aluguel (imóvel) ---

func (h *Handler) ListAlugueis(c *gin.Context) {
	out, err := h.svc.ListAlugueis(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar imóveis"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) ListAlugueisDisponiveis(c *gin.Context) {
	out, err := h.svc.ListAlugueisDisponiveis(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar imóveis disponíveis"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) CreateAluguel(c *gin.Context) {
	var req AluguelRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	a, err := h.svc.CreateAluguel(c, req, currentTenantID(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, a)
}

func (h *Handler) UpdateAluguel(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	var req AluguelRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	a, err := h.svc.UpdateAluguel(c, id, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Imóvel não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, a)
}

func (h *Handler) ToggleAlugado(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	a, err := h.svc.ToggleAlugado(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Imóvel não encontrado"})
		return
	}
	c.JSON(http.StatusOK, a)
}

func (h *Handler) DeleteAluguel(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	if err := h.svc.DeleteAluguel(c.Request.Context(), id); err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Imóvel não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao remover imóvel"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Imóvel removido"})
}

func (h *Handler) DownloadFotos(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", "attachment; filename=fotos.zip")
	if _, err := h.svc.DownloadFotosZip(c.Request.Context(), id, c.Writer); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Imóvel não encontrado"})
		return
	}
}

func (h *Handler) CleanupTemp(c *gin.Context) {
	n, err := h.svc.CleanupTemp()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao limpar temporários"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "removidos": n})
}

// --- ClienteAluguel (inquilino) ---

func (h *Handler) ListInquilinos(c *gin.Context) {
	out, err := h.inquilinoSvc.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar inquilinos"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) GetInquilino(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	out, err := h.inquilinoSvc.FindByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) CreateInquilino(c *gin.Context) {
	var req ClienteAluguelRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	out, err := h.inquilinoSvc.Create(c.Request.Context(), req, currentTenantID(c), h.asaasKey(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, out)
}

func (h *Handler) UpdateInquilino(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	var req ClienteAluguelRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	out, err := h.inquilinoSvc.Update(c.Request.Context(), id, req, h.asaasKey(c))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) DeleteInquilino(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	if err := h.inquilinoSvc.Delete(c.Request.Context(), id, h.asaasKey(c)); err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao remover inquilino"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) AddPagamentoManual(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	var req PagamentoManualRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	out, err := h.inquilinoSvc.AddPagamentoManual(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) DeletePagamentoManual(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	pagamentoID, err := strconv.ParseInt(c.Param("pagamentoId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pagamentoId inválido"})
		return
	}
	out, err := h.inquilinoSvc.DeletePagamentoManual(c.Request.Context(), id, pagamentoID)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		case errors.Is(err, ErrPagamentoNaoEncontrado):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) CriarCobrancaAvulsa(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	var req CobrancaAvulsaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	out, err := h.inquilinoSvc.CriarCobrancaAvulsa(c.Request.Context(), id, req, h.asaasKey(c))
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		case errors.Is(err, ErrAsaasCustomerRequired):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusCreated, out)
}

func (h *Handler) ListCobrancas(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	out, err := h.inquilinoSvc.ListCobrancas(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar cobranças"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) SincronizarAsaas(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	out, err := h.inquilinoSvc.SincronizarAsaas(c.Request.Context(), id, h.asaasKey(c))
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		case errors.Is(err, ErrAsaasNotConfigured):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) CalcularScore(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	// engine=nil → usa somente a heurística local (ver ScoreEngine no wiring doc).
	out, err := h.inquilinoSvc.CalcularScore(c.Request.Context(), id, nil)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) MultaJuros(c *gin.Context) {
	id, ok := idParam(c)
	if !ok {
		return
	}
	out, err := h.inquilinoSvc.MultaJurosDoInquilino(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		return
	}
	c.JSON(http.StatusOK, out)
}
