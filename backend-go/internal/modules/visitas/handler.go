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
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Escolha o cliente, o imóvel e o dia/horário da visita."})
		return
	}
	if y := req.DataVisita.Year(); y < 2000 || y > 2100 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Data inválida. Escolha o dia no calendário.", "campo": "data_visita"})
		return
	}
	// Cliente e imóvel precisam ser desta imobiliária (a busca é escopada
	// por tenant); antes qualquer id existente no banco era aceito.
	if !h.repo.DaEmpresa(c.Request.Context(), req.ClienteID, req.ImovelID) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Cliente ou imóvel não encontrado. Recarregue a página e escolha de novo."})
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao criar visita"})
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

	if dono := soDoCorretor(c); dono != nil {
		f.CorretorID = dono
	}
	out, total, err := h.repo.List(c.Request.Context(), f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao listar visitas"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao buscar visitas"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao buscar visita"})
		return
	}

	if alheia(c, v.CorretorID) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Visita não encontrada"})
		return
	}
	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Dados inválidos. Recarregue a página e tente de novo."})
		return
	}
	if req.DataVisita != nil {
		if y := req.DataVisita.Year(); y < 2000 || y > 2100 {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Data inválida. Escolha o dia no calendário.", "campo": "data_visita"})
			return
		}
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
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "A nota vai de 1 a 5 estrelas.", "campo": "nota_avaliacao"})
			return
		}
		v.NotaAvaliacao = req.NotaAvaliacao
	}

	if err := h.repo.Update(c.Request.Context(), v); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao atualizar visita"})
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
	if soDoCorretor(c) != nil {
		atual, err := h.repo.FindByID(c.Request.Context(), uint(id))
		if err != nil || alheia(c, atual.CorretorID) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Visita não encontrada"})
			return
		}
	}
	affected, err := h.repo.Delete(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao remover visita"})
		return
	}
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Visita não encontrada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Visita removida com sucesso"})
}

// soDoCorretor: corretor (sem ser admin/correspondente) só enxerga e mexe no
// que é dele — antes via as visitas de toda a equipe, com nome e telefone dos
// clientes dos colegas, embora a lista de clientes já viesse filtrada.
func soDoCorretor(c *gin.Context) *uint {
	u, ok := auth.UserFrom(c)
	if ok && u.IsCorretor && !u.IsAdministrador && !u.IsCorrespondente && !u.IsSuperAdmin {
		id := u.ID
		return &id
	}
	return nil
}

// alheia: true quando o corretor tenta abrir visita de outro corretor.
func alheia(c *gin.Context, corretorID *uint) bool {
	dono := soDoCorretor(c)
	return dono != nil && (corretorID == nil || *corretorID != *dono)
}
