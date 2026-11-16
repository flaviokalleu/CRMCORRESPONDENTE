package assinatura

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/models"
	"crmimob/internal/tenant"
)

// ctxGlobal: o superadmin carrega o escopo da própria empresa (tenant 1) no
// contexto; as ações do master atuam em OUTRA empresa, então o escopo
// automático precisa ser global aqui.
func ctxGlobal(c *gin.Context) context.Context {
	return tenant.With(c.Request.Context(), tenant.Scope{IsSuperAdmin: true})
}

// RegisterMaster monta as ações do dono da plataforma sobre a assinatura de
// uma imobiliária (grupo já protegido por RequireSuperAdmin).
func (h *Handler) RegisterMaster(g *gin.RouterGroup) {
	g.POST("/assinaturas/faturas/:id/baixa", h.masterBaixa)
	g.POST("/assinaturas/faturas/:id/cancelar", h.masterCancelarFatura)
	g.POST("/assinaturas/:tenantId/prorrogar", h.masterProrrogar)
	g.POST("/assinaturas/:tenantId/bloquear", h.masterBloquear)
	g.POST("/assinaturas/:tenantId/desbloquear", h.masterDesbloquear)
	g.PUT("/assinaturas/:tenantId/condicoes", h.masterCondicoes)
	g.GET("/assinaturas/:tenantId", h.masterVer)
}

func idParam(c *gin.Context, nome string) (uint, bool) {
	v, err := strconv.ParseUint(c.Param(nome), 10, 64)
	if err != nil || v == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Identificador inválido"})
		return 0, false
	}
	return uint(v), true
}

func (h *Handler) masterBaixa(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	baixou, err := h.svc.DarBaixa(ctxGlobal(c), id, "manual", time.Now())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Não foi possível dar baixa"})
		return
	}
	if !baixou {
		c.JSON(http.StatusConflict, gin.H{"error": "Esta fatura não está em aberto"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) masterCancelarFatura(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	res := h.db.WithContext(ctxGlobal(c)).Model(&models.FaturaAssinatura{}).
		Where("id = ? AND status IN ?", id, []string{models.FaturaPendente, models.FaturaVencida}).
		Update("status", models.FaturaCancelada)
	if res.Error != nil || res.RowsAffected == 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Esta fatura não está em aberto"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// masterProrrogar estende o "pago até" (ou o fim do teste) em N dias.
func (h *Handler) masterProrrogar(c *gin.Context) {
	tid, ok := idParam(c, "tenantId")
	if !ok {
		return
	}
	var body struct {
		Dias int `json:"dias"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Dias < 1 || body.Dias > 366 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Informe de 1 a 366 dias"})
		return
	}
	ctx := ctxGlobal(c)
	_, sub, _, err := h.svc.Carregar(ctx, tid)
	if err != nil || sub == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assinatura não encontrada"})
		return
	}
	base := time.Now()
	if fim := FimDoPeriodo(sub); fim != nil && fim.After(base) {
		base = *fim
	}
	novo := base.AddDate(0, 0, body.Dias)
	campo := "data_fim"
	if sub.Status == "trialing" && sub.DataFim == nil {
		campo = "data_fim_trial"
	}
	if err := h.db.WithContext(ctx).Model(&models.Subscription{}).Where("id = ?", sub.ID).Update(campo, novo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Não foi possível prorrogar"})
		return
	}
	// A fatura em aberto passa a vencer na nova data.
	h.db.WithContext(ctx).Model(&models.FaturaAssinatura{}).
		Where("tenant_id = ? AND status IN ? AND chave LIKE ?", tid, []string{models.FaturaPendente, models.FaturaVencida}, "renovacao:%").
		Updates(map[string]any{"vencimento": diaDe(novo), "status": models.FaturaPendente})
	c.JSON(http.StatusOK, gin.H{"ok": true, "novo_vencimento": novo})
}

func (h *Handler) masterBloquear(c *gin.Context) {
	tid, ok := idParam(c, "tenantId")
	if !ok {
		return
	}
	var body struct {
		Motivo string `json:"motivo"`
	}
	_ = c.ShouldBindJSON(&body)
	if tid == h.svc.PlataformaTenantID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A empresa da plataforma não pode ser bloqueada"})
		return
	}
	err := h.db.WithContext(ctxGlobal(c)).Model(&models.Tenant{}).Where("id = ?", tid).
		Updates(map[string]any{"bloqueado": true, "bloqueado_motivo": body.Motivo, "bloqueado_em": time.Now()}).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Não foi possível bloquear"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) masterDesbloquear(c *gin.Context) {
	tid, ok := idParam(c, "tenantId")
	if !ok {
		return
	}
	err := h.db.WithContext(ctxGlobal(c)).Model(&models.Tenant{}).Where("id = ?", tid).
		Updates(map[string]any{"bloqueado": false, "bloqueado_motivo": nil, "bloqueado_em": nil}).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Não foi possível desbloquear"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// masterCondicoes: preço combinado (null = tabela, 0 = cortesia) e tolerância.
func (h *Handler) masterCondicoes(c *gin.Context) {
	tid, ok := idParam(c, "tenantId")
	if !ok {
		return
	}
	var body struct {
		PrecoCombinado *float64 `json:"preco_combinado"`
		UsarTabela     bool     `json:"usar_tabela"`
		ToleranciaDias *int     `json:"tolerancia_dias"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}
	upd := map[string]any{}
	if body.UsarTabela {
		upd["preco_combinado"] = nil
	} else if body.PrecoCombinado != nil {
		if *body.PrecoCombinado < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Preço não pode ser negativo"})
			return
		}
		upd["preco_combinado"] = *body.PrecoCombinado
	}
	if body.ToleranciaDias != nil {
		if *body.ToleranciaDias < 0 || *body.ToleranciaDias > 30 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tolerância de 0 a 30 dias"})
			return
		}
		upd["tolerancia_dias"] = *body.ToleranciaDias
	}
	if len(upd) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nada para alterar"})
		return
	}
	res := h.db.WithContext(ctxGlobal(c)).Model(&models.Subscription{}).Where("tenant_id = ?", tid).Updates(upd)
	if res.Error != nil || res.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assinatura não encontrada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) masterVer(c *gin.Context) {
	tid, ok := idParam(c, "tenantId")
	if !ok {
		return
	}
	ctx := ctxGlobal(c)
	t, sub, plano, err := h.svc.Carregar(ctx, tid)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Empresa não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao carregar"})
		return
	}
	acesso, _ := h.svc.AcessoDoTenant(ctx, tid)
	faturas, _ := h.svc.ListarFaturas(ctx, tid)
	c.JSON(http.StatusOK, gin.H{"tenant": t, "assinatura": sub, "plano": plano, "acesso": acesso, "faturas": faturas})
}
