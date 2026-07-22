// Package pagamentos migra `routes/pagamentos.js` (cobranças avulsas de
// clientes) de Mercado Pago para Asaas (03-spec §1 e "De-Para").
package pagamentos

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
)

// Handler expõe as rotas de /api/pagamentos. Rotas de auth por-rota, igual ao
// Node (`router.use(authenticateToken)` só a partir de certa linha — aqui
// aplicamos h.authRequired() explicitamente por rota para clareza e para
// preservar as duas rotas públicas).
type Handler struct {
	svc          *Service
	authRequired gin.HandlerFunc
}

func NewHandler(svc *Service, authRequired gin.HandlerFunc) *Handler {
	return &Handler{svc: svc, authRequired: authRequired}
}

// Register monta as rotas no grupo `/api/pagamentos`. `rg` já deve estar
// isolado por tenant via middleware.ResolveTenant nas rotas autenticadas —
// aplicamos isso por rota abaixo, preservando as duas públicas sem tenant.
func (h *Handler) Register(rg *gin.RouterGroup, resolveTenant gin.HandlerFunc) {
	// Públicas (sem auth) — espelham as rotas acima do `router.use(authenticateToken)` no Node.
	rg.GET("/publico/:id", h.publico)
	rg.GET("/config", h.config)

	protected := rg.Group("")
	protected.Use(h.authRequired, resolveTenant)
	{
		protected.POST("/boleto", h.criarBoleto)
		protected.POST("/pix", h.criarPix)
		protected.POST("/universal", h.criarUniversal)
		protected.GET("/:id/pix-qrcode", h.pixQrCode)
		protected.GET("", h.list)
		protected.GET("/", h.list)
		protected.GET("/:id", h.get)
		protected.PUT("/:id", h.update)
		protected.DELETE("/:id", h.delete)
		protected.POST("/verificar-status", h.verificarStatus)
	}
}

func adminUser(c *gin.Context) (isAdmin bool, userID uint, tenantID *uint, ok bool) {
	u, found := auth.UserFrom(c)
	if !found {
		return false, 0, nil, false
	}
	return u.IsAdministrador, u.ID, u.TenantID, true
}

func (h *Handler) config(c *gin.Context) {
	c.JSON(http.StatusOK, h.svc.Config())
}

// publico — página pública de pagamento (sem auth). Reaproveita Get sem
// checagem de dono (isAdmin=true para não bloquear).
func (h *Handler) publico(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	p, err := h.svc.Get(c.Request.Context(), uint(id), true, 0)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pagamento não encontrado"})
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) criarBoleto(c *gin.Context) {
	var req CreateBoletoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_, userID, tenantID, _ := adminUser(c)
	pagamento, payment, err := h.svc.CreateBoleto(c.Request.Context(), tenantID, userID, req)
	if err != nil {
		respondCreateError(c, err)
		return
	}
	c.JSON(http.StatusCreated, CreatePagamentoResponse{
		Success: true, Pagamento: pagamento,
		Asaas: AsaasInfo{PaymentID: payment.ID, InvoiceURL: payment.InvoiceURL, Status: payment.Status},
	})
}

func (h *Handler) criarPix(c *gin.Context) {
	var req CreatePixRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_, userID, tenantID, _ := adminUser(c)
	pagamento, payment, err := h.svc.CreatePix(c.Request.Context(), tenantID, userID, req)
	if err != nil {
		respondCreateError(c, err)
		return
	}
	c.JSON(http.StatusCreated, CreatePagamentoResponse{
		Success: true, Pagamento: pagamento,
		Asaas: AsaasInfo{PaymentID: payment.ID, InvoiceURL: payment.InvoiceURL, Status: payment.Status},
	})
}

func (h *Handler) criarUniversal(c *gin.Context) {
	var req CreateUniversalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_, userID, tenantID, _ := adminUser(c)
	pagamento, payment, err := h.svc.CreateUniversal(c.Request.Context(), tenantID, userID, req)
	if err != nil {
		respondCreateError(c, err)
		return
	}
	c.JSON(http.StatusCreated, CreatePagamentoResponse{
		Success: true, Pagamento: pagamento,
		Asaas: AsaasInfo{PaymentID: payment.ID, InvoiceURL: payment.InvoiceURL, Status: payment.Status},
	})
}

func respondCreateError(c *gin.Context, err error) {
	if errors.Is(err, ErrClienteNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}

func (h *Handler) pixQrCode(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	_, _, tenantID, _ := adminUser(c)
	qr, err := h.svc.GetPixQrCode(c.Request.Context(), tenantID, uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pagamento PIX não encontrado"})
		return
	}
	c.JSON(http.StatusOK, qr)
}

func (h *Handler) list(c *gin.Context) {
	var q ListQuery
	_ = c.ShouldBindQuery(&q)

	isAdmin, userID, _, _ := adminUser(c)
	f := ListFilter{Status: q.Status, Tipo: q.Tipo, ClienteID: q.ClienteID}
	if !isAdmin {
		f.CreatedBy = &userID
	}

	resp, err := h.svc.List(c.Request.Context(), f, q.Page, q.Limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	isAdmin, userID, _, _ := adminUser(c)
	p, err := h.svc.Get(c.Request.Context(), uint(id), isAdmin, userID)
	if err != nil {
		status := http.StatusNotFound
		if errors.Is(err, ErrForbidden) {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	isAdmin, _, _, _ := adminUser(c)
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Apenas administradores podem editar"})
		return
	}
	var req UpdatePagamentoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	p, err := h.svc.Update(c.Request.Context(), uint(id), req)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, ErrPagamentoNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	isAdmin, _, _, _ := adminUser(c)
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Apenas administradores podem excluir"})
		return
	}
	if err := h.svc.Delete(c.Request.Context(), uint(id)); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, ErrPagamentoNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Pagamento excluído"})
}

func (h *Handler) verificarStatus(c *gin.Context) {
	isAdmin, _, tenantID, _ := adminUser(c)
	if !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Apenas administradores podem verificar status"})
		return
	}
	var body struct {
		PagamentoID uint `json:"pagamento_id"`
	}
	_ = c.ShouldBindJSON(&body)
	if body.PagamentoID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pagamento_id é obrigatório"})
		return
	}
	p, err := h.svc.VerificarStatus(c.Request.Context(), tenantID, body.PagamentoID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pagamento não encontrado"})
		return
	}
	c.JSON(http.StatusOK, p)
}
