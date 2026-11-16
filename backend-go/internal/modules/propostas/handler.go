package propostas

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
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Escolha o cliente e o imóvel e escreva o valor oferecido."})
		return
	}
	if e := validarValor("valor", req.ValorOfertado); e != "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": e, "campo": "valor"})
		return
	}
	if req.DataValidade != nil {
		if e := validarValidade(*req.DataValidade, true); e != "" {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": e, "campo": "validade"})
			return
		}
	}
	if !h.repo.DaEmpresa(c.Request.Context(), req.ClienteID, req.ImovelID) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Cliente ou imóvel não encontrado. Recarregue a página e escolha de novo."})
		return
	}

	forma := req.FormaPagamento
	if forma == "" {
		forma = models.PropostaFormaPagamentoFinanciamento
	} else if !models.IsFormaPagamentoValida(forma) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Escolha a forma de pagamento na lista."})
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao criar proposta"})
		return
	}

	_ = h.notifier.NotifyUser(c.Request.Context(), corretorID, "proposta:criada", map[string]interface{}{
		"proposta_id": p.ID, "cliente_id": p.ClienteID, "valor_ofertado": p.ValorOfertado,
	})

	if completo, err := h.repo.FindByIDCompleto(c.Request.Context(), p.ID); err == nil {
		p = completo
	}
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
	if dono := soDoCorretor(c); dono != nil {
		f.CorretorID = dono
	}
	out, total, err := h.repo.List(c.Request.Context(), f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao listar propostas"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao buscar propostas"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao buscar proposta"})
		return
	}

	if alheia(c, p.CorretorID) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Proposta não encontrada"})
		return
	}
	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Dados inválidos. Recarregue a página e tente de novo."})
		return
	}
	if req.Status != nil {
		if !models.IsPropostaStatusValido(*req.Status) {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Etapa inválida."})
			return
		}
		p.Status = *req.Status
	}
	if req.ValorOfertado != nil {
		if e := validarValor("valor", *req.ValorOfertado); e != "" {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": e, "campo": "valor"})
			return
		}
		p.ValorOfertado = *req.ValorOfertado
	}
	if req.FormaPagamento != nil {
		if !models.IsFormaPagamentoValida(*req.FormaPagamento) {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Escolha a forma de pagamento na lista."})
			return
		}
		p.FormaPagamento = *req.FormaPagamento
	}
	if req.DataValidade != nil {
		if *req.DataValidade == "" {
			p.DataValidade = nil
		} else {
			t, err := time.Parse(time.RFC3339, *req.DataValidade)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Data inválida. Escolha o dia no calendário.", "campo": "validade"})
				return
			}
			if e := validarValidade(t, false); e != "" {
				c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": e, "campo": "validade"})
				return
			}
			p.DataValidade = &t
		}
	}
	if req.ValorContraProposta != nil {
		if e := validarValor("contra", *req.ValorContraProposta); e != "" {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": e})
			return
		}
		p.ValorContraProposta = req.ValorContraProposta
	}
	if req.ValorAceito != nil {
		if e := validarValor("aceito", *req.ValorAceito); e != "" {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": e})
			return
		}
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
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao atualizar proposta"})
		return
	}
	if completo, err := h.repo.FindByIDCompleto(c.Request.Context(), p.ID); err == nil {
		p = completo
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
	if soDoCorretor(c) != nil {
		atual, err := h.repo.FindByID(c.Request.Context(), uint(id))
		if err != nil || alheia(c, atual.CorretorID) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Proposta não encontrada"})
			return
		}
	}
	affected, err := h.repo.Delete(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao remover proposta"})
		return
	}
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Proposta não encontrada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Proposta removida com sucesso"})
}

// valorMax: a coluna é numeric(12,2). Acima disso o INSERT falhava com 500.
const valorMax = 9999999999.99

func validarValor(_ string, v float64) string {
	if !(v > 0) {
		return "Escreva um valor maior que zero."
	}
	if v > valorMax {
		return "Valor alto demais. O máximo é R$ 9.999.999.999,99."
	}
	return ""
}

// validarValidade: ano plausível e, na criação, não pode ser dia passado.
func validarValidade(t time.Time, criando bool) string {
	if t.Year() < 2000 || t.Year() > 2100 {
		return "Data inválida. Escolha o dia no calendário."
	}
	if criando {
		hoje := time.Now().Truncate(24 * time.Hour).Add(-24 * time.Hour)
		if t.Before(hoje) {
			return "A validade não pode ser um dia que já passou."
		}
	}
	return ""
}

// soDoCorretor: corretor (sem ser admin/correspondente) só enxerga e mexe no
// que é dele — antes via as propostas de toda a equipe, com nome e telefone dos
// clientes dos colegas, embora a lista de clientes já viesse filtrada.
func soDoCorretor(c *gin.Context) *uint {
	u, ok := auth.UserFrom(c)
	if ok && u.IsCorretor && !u.IsAdministrador && !u.IsCorrespondente && !u.IsSuperAdmin {
		id := u.ID
		return &id
	}
	return nil
}

// alheia: true quando o corretor tenta abrir proposta de outro corretor.
func alheia(c *gin.Context, corretorID *uint) bool {
	dono := soDoCorretor(c)
	return dono != nil && (corretorID == nil || *corretorID != *dono)
}
