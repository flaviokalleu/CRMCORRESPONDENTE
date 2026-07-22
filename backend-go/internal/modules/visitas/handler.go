package visitas

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/models"
)

// Handler expõe /api/visitas/*. Todas as rotas exigem auth.Required() +
// middleware.ResolveTenant(db) (wiring). Corrige gotcha §9: PUT/DELETE agora
// operam dentro do escopo de tenant garantido pelos callbacks GORM.
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

// Create: POST /api/visitas.
func (h *Handler) Create(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Não autenticado"})
		return
	}
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "cliente_id, imovel_id e data_visita são obrigatórios"})
		return
	}

	corretorID := req.CorretorID
	if corretorID == nil {
		corretorID = &user.ID
	}

	v := &models.Visita{
		ClienteID:   req.ClienteID,
		ImovelID:    req.ImovelID,
		CorretorID:  corretorID,
		CriadoPorID: user.ID,
		DataVisita:  req.DataVisita,
		Status:      models.VisitaStatusAgendada,
		Observacoes: req.Observacoes,
	}
	if err := h.repo.Create(c.Request.Context(), v); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao criar visita", "error": err.Error()})
		return
	}

	_ = h.notifier.NotifyUser(c.Request.Context(), *corretorID, "visita:agendada", map[string]interface{}{
		"visita_id": v.ID, "cliente_id": v.ClienteID, "data_visita": v.DataVisita,
	})

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": v})
}

// List: GET /api/visitas com filtros dinâmicos.
func (h *Handler) List(c *gin.Context) {
	f := ListFilters{Status: c.Query("status"), Page: 1, Limit: 20}
	if v, err := strconv.Atoi(c.Query("page")); err == nil && v > 0 {
		f.Page = v
	}
	if v, err := strconv.Atoi(c.Query("limit")); err == nil && v > 0 {
		f.Limit = v
	}
	if v := c.Query("corretor_id"); v != "" {
		if id, err := strconv.ParseUint(v, 10, 64); err == nil {
			uid := uint(id)
			f.CorretorID = &uid
		}
	}
	if v := c.Query("data_inicio"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			f.DataInicio = &t
		}
	}
	if v := c.Query("data_fim"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			f.DataFim = &t
		}
	}

	out, total, err := h.repo.List(c.Request.Context(), f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao listar visitas", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": out, "total": total, "page": f.Page, "pageSize": f.Limit})
}

// ListByCliente: GET /api/visitas/cliente/:clienteId.
func (h *Handler) ListByCliente(c *gin.Context) {
	clienteID, err := strconv.ParseUint(c.Param("clienteId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "clienteId inválido"})
		return
	}
	out, err := h.repo.ListByCliente(c.Request.Context(), uint(clienteID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao buscar visitas", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": out})
}

// Update: PUT /api/visitas/:id (atualização parcial).
func (h *Handler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "id inválido"})
		return
	}
	v, err := h.repo.FindByID(c.Request.Context(), uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Visita não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao buscar visita", "error": err.Error()})
		return
	}

	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Corpo inválido"})
		return
	}
	if req.DataVisita != nil {
		v.DataVisita = *req.DataVisita
	}
	if req.Status != nil {
		if !models.IsVisitaStatusValido(*req.Status) {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "status inválido"})
			return
		}
		v.Status = *req.Status
	}
	if req.Observacoes != nil {
		v.Observacoes = req.Observacoes
	}
	if req.FeedbackCliente != nil {
		v.FeedbackCliente = req.FeedbackCliente
	}
	if req.NotaAvaliacao != nil {
		if *req.NotaAvaliacao < 1 || *req.NotaAvaliacao > 5 {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "nota_avaliacao deve estar entre 1 e 5"})
			return
		}
		v.NotaAvaliacao = req.NotaAvaliacao
	}

	if err := h.repo.Update(c.Request.Context(), v); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao atualizar visita", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": v})
}

// Delete: DELETE /api/visitas/:id.
func (h *Handler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "id inválido"})
		return
	}
	affected, err := h.repo.Delete(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao remover visita", "error": err.Error()})
		return
	}
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Visita não encontrada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Visita removida com sucesso"})
}
