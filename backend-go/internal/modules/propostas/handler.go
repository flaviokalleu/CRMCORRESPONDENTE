package propostas

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/models"
)

// Handler expõe /api/propostas/*. Todas as rotas exigem auth.Required() +
// middleware.ResolveTenant(db) (wiring). Corrige gotcha §9: PUT/DELETE operam
// dentro do escopo de tenant garantido pelos callbacks GORM.
type Handler struct {
	repo     *Repository
	notifier Notifier
}

func NewHandler(repo *Repository, notifier Notifier) *Handler {
	if notifier == nil {
		notifier = NoopNotifier{}
	}
	return &Handler{repo: repo, notifier: notifier}
}

// Create: POST /api/propostas.
func (h *Handler) Create(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Não autenticado"})
		return
	}
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "cliente_id, imovel_id e valor_ofertado são obrigatórios"})
		return
	}

	forma := req.FormaPagamento
	if forma == "" {
		forma = models.PropostaFormaPagamentoFinanciamento
	} else if !models.IsFormaPagamentoValida(forma) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "forma_pagamento inválida"})
		return
	}

	corretorID := user.ID
	p := &models.Proposta{
		ClienteID:      req.ClienteID,
		ImovelID:       req.ImovelID,
		CorretorID:     &corretorID,
		ValorOfertado:  req.ValorOfertado,
		FormaPagamento: forma,
		Status:         models.PropostaStatusPendente,
		DataValidade:   req.DataValidade,
		Condicoes:      req.Condicoes,
		Observacoes:    req.Observacoes,
	}
	if err := h.repo.Create(c.Request.Context(), p); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao criar proposta", "error": err.Error()})
		return
	}

	_ = h.notifier.NotifyUser(c.Request.Context(), corretorID, "proposta:criada", map[string]interface{}{
		"proposta_id": p.ID, "cliente_id": p.ClienteID, "valor_ofertado": p.ValorOfertado,
	})

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": p})
}

// List: GET /api/propostas?status=&page=&limit=
func (h *Handler) List(c *gin.Context) {
	f := ListFilters{Status: c.Query("status"), Page: 1, Limit: 20}
	if v, err := strconv.Atoi(c.Query("page")); err == nil && v > 0 {
		f.Page = v
	}
	if v, err := strconv.Atoi(c.Query("limit")); err == nil && v > 0 {
		f.Limit = v
	}
	out, total, err := h.repo.List(c.Request.Context(), f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao listar propostas", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": out, "total": total, "page": f.Page, "pageSize": f.Limit})
}

// ListByCliente: GET /api/propostas/cliente/:clienteId.
func (h *Handler) ListByCliente(c *gin.Context) {
	clienteID, err := strconv.ParseUint(c.Param("clienteId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "clienteId inválido"})
		return
	}
	out, err := h.repo.ListByCliente(c.Request.Context(), uint(clienteID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao buscar propostas", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": out})
}

// Update: PUT /api/propostas/:id (negociação — atualização parcial).
func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "id inválido"})
		return
	}
	p, err := h.repo.FindByID(c.Request.Context(), uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Proposta não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao buscar proposta", "error": err.Error()})
		return
	}

	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Corpo inválido"})
		return
	}
	if req.Status != nil {
		if !models.IsPropostaStatusValido(*req.Status) {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "status inválido"})
			return
		}
		p.Status = *req.Status
	}
	if req.ValorContraProposta != nil {
		p.ValorContraProposta = req.ValorContraProposta
	}
	if req.ValorAceito != nil {
		p.ValorAceito = req.ValorAceito
	}
	if req.MotivoRecusa != nil {
		p.MotivoRecusa = req.MotivoRecusa
	}
	if req.Observacoes != nil {
		p.Observacoes = req.Observacoes
	}
	if req.Condicoes != nil {
		p.Condicoes = req.Condicoes
	}

	if err := h.repo.Update(c.Request.Context(), p); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao atualizar proposta", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": p})
}

// Delete: DELETE /api/propostas/:id.
func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "id inválido"})
		return
	}
	affected, err := h.repo.Delete(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao remover proposta", "error": err.Error()})
		return
	}
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Proposta não encontrada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Proposta removida com sucesso"})
}
