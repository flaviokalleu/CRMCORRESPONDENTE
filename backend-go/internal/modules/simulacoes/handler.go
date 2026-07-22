package simulacoes

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"crmimob/internal/auth"
	"crmimob/internal/models"
)

// Handler expõe /api/simulacoes/*. Todas as rotas exigem auth.Required() +
// middleware.ResolveTenant(db) (aplicados no wiring — ver routes.go/wiring doc).
type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func bindCalculoInput(req CalcularRequest) CalculoInput {
	return CalculoInput{
		ValorImovel:    req.ValorImovel,
		ValorEntrada:   req.ValorEntrada,
		PrazoMeses:     req.PrazoMeses,
		TaxaJurosAnual: req.TaxaJurosAnual,
		Sistema:        req.Sistema,
	}
}

// Calcular: POST /api/simulacoes/calcular — prévia SEM salvar.
func (h *Handler) Calcular(c *gin.Context) {
	var req CalcularRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Campos obrigatórios ausentes ou inválidos"})
		return
	}
	resultado, err := Calcular(bindCalculoInput(req))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": resultado})
}

// Create: POST /api/simulacoes — recalcula e persiste (grava user_id, tenant_id).
func (h *Handler) Create(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Não autenticado"})
		return
	}
	var req CalcularRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Campos obrigatórios ausentes ou inválidos"})
		return
	}
	resultado, err := Calcular(bindCalculoInput(req))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}

	sistema := req.Sistema
	if sistema == "" {
		sistema = SistemaSAC
	}

	sim := &models.Simulacao{
		ClienteID:       req.ClienteID,
		UserID:          user.ID,
		ValorImovel:     req.ValorImovel,
		ValorEntrada:    req.ValorEntrada,
		ValorFinanciado: resultado.ValorFinanciado,
		PrazoMeses:      req.PrazoMeses,
		TaxaJurosAnual:  req.TaxaJurosAnual,
		Sistema:         sistema,
		PrimeiraParcela: resultado.PrimeiraParcela,
		UltimaParcela:   resultado.UltimaParcela,
		TotalPago:       resultado.TotalPago,
		TotalJuros:      resultado.TotalJuros,
		RendaMinima:     resultado.RendaMinima,
		Observacoes:     req.Observacoes,
	}
	if err := h.repo.Create(c.Request.Context(), sim); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao salvar simulação", "error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": sim})
}

// ListByCliente: GET /api/simulacoes/cliente/:clienteId
func (h *Handler) ListByCliente(c *gin.Context) {
	clienteID, err := strconv.ParseUint(c.Param("clienteId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "clienteId inválido"})
		return
	}
	out, err := h.repo.ListByCliente(c.Request.Context(), uint(clienteID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao buscar simulações", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": out})
}

// List: GET /api/simulacoes?page=1&limit=20 (filtra pelo dono).
func (h *Handler) List(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Não autenticado"})
		return
	}
	page, limit := parsePagination(c)
	out, total, err := h.repo.List(c.Request.Context(), user.ID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao listar simulações", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": out, "total": total, "page": page, "pageSize": limit})
}

// Delete: DELETE /api/simulacoes/:id — só o dono pode remover.
func (h *Handler) Delete(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Não autenticado"})
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "id inválido"})
		return
	}
	affected, err := h.repo.Delete(c.Request.Context(), uint(id), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao remover simulação", "error": err.Error()})
		return
	}
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Simulação não encontrada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Simulação removida com sucesso"})
}

func parsePagination(c *gin.Context) (page, limit int) {
	page = 1
	limit = 20
	if v, err := strconv.Atoi(c.Query("page")); err == nil && v > 0 {
		page = v
	}
	if v, err := strconv.Atoi(c.Query("limit")); err == nil && v > 0 {
		limit = v
	}
	return
}
