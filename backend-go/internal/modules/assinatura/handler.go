package assinatura

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"crmimob/internal/auth"
	"crmimob/internal/integrations/asaas"
	"crmimob/internal/modules/billing"
	"crmimob/internal/models"
)

type Handler struct {
	svc *Service
	db  *gorm.DB
}

func NewHandler(svc *Service, db *gorm.DB) *Handler { return &Handler{svc: svc, db: db} }

// Register monta as rotas da imobiliária (grupo já com auth + tenant). Estas
// rotas NÃO passam pelo bloqueio: a imobiliária bloqueada precisa conseguir pagar.
func (h *Handler) Register(g *gin.RouterGroup) {
	g.GET("", h.resumo)
	g.GET("/faturas", h.faturas)
	g.GET("/planos", h.planos)
	g.POST("/faturas/:id/pagar", h.pagar)
	g.POST("/trocar-plano", h.trocarPlano)
}

// TrocarPlano exposto para a rota antiga /api/tenant/change-plan, que antes
// trocava o plano sem cobrar nada.
func (h *Handler) TrocarPlano(c *gin.Context) { h.trocarPlano(c) }

// RegisterWebhook monta o aviso do Asaas da plataforma (público, com token).
func (h *Handler) RegisterWebhook(api *gin.RouterGroup) {
	api.POST("/assinatura/webhook/asaas", h.webhook)
}

func tenantDoPedido(c *gin.Context) (*models.User, uint, bool) {
	u, ok := auth.UserFrom(c)
	if !ok || u.TenantID == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Usuário sem empresa"})
		return nil, 0, false
	}
	return u, *u.TenantID, true
}

type planoResumo struct {
	ID          uint    `json:"id"`
	Nome        string  `json:"nome"`
	PrecoMensal float64 `json:"preco_mensal"`
}

func (h *Handler) resumo(c *gin.Context) {
	u, tid, ok := tenantDoPedido(c)
	if !ok {
		return
	}
	ctx := c.Request.Context()
	t, sub, plano, err := h.svc.Carregar(ctx, tid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Não foi possível carregar a assinatura"})
		return
	}
	acesso, _ := h.svc.AcessoDoTenant(ctx, tid)
	aberta, _ := h.svc.FaturaEmAberto(ctx, tid)

	out := gin.H{
		"empresa":         t.Nome,
		"acesso":          acesso,
		"pode_gerenciar":  u.IsAdministrador || u.IsSuperAdmin,
		"cobranca_online": h.svc.CobrancaOnline(),
		"tem_documento":   (t.DocumentoCobranca != nil && *t.DocumentoCobranca != "") || (t.CNPJ != nil && *t.CNPJ != ""),
		"fatura_aberta":   aberta,
		"plataforma":      tid == h.svc.PlataformaTenantID,
	}
	out["recursos"], out["limites"] = recursosELimites(ctx, h.db, t, plano)
	if sub != nil {
		out["ciclo"] = sub.Ciclo
		out["mensalidade"] = 0.0
		if plano != nil {
			out["plano"] = planoResumo{plano.ID, plano.Nome, plano.PrecoMensal}
			out["mensalidade"] = ValorDaMensalidade(sub, plano, sub.Ciclo)
		}
		if sub.PlanoAgendadoID != nil {
			var p models.Plan
			if h.db.WithContext(ctx).First(&p, *sub.PlanoAgendadoID).Error == nil {
				out["plano_agendado"] = planoResumo{p.ID, p.Nome, p.PrecoMensal}
			}
		}
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) faturas(c *gin.Context) {
	_, tid, ok := tenantDoPedido(c)
	if !ok {
		return
	}
	lista, err := h.svc.ListarFaturas(c.Request.Context(), tid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Não foi possível carregar as faturas"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"faturas": lista})
}

func (h *Handler) planos(c *gin.Context) {
	var lista []models.Plan
	if err := h.db.WithContext(c.Request.Context()).Where("ativo = ?", true).Order("ordem, preco_mensal").Find(&lista).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Não foi possível carregar os planos"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"planos": lista})
}

func somenteGestor(c *gin.Context, u *models.User) bool {
	if u.IsAdministrador || u.IsSuperAdmin {
		return true
	}
	c.JSON(http.StatusForbidden, gin.H{"error": "Só o administrador da empresa pode fazer isso."})
	return false
}

func (h *Handler) pagar(c *gin.Context) {
	u, tid, ok := tenantDoPedido(c)
	if !ok || !somenteGestor(c, u) {
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Fatura inválida"})
		return
	}
	var body struct {
		Documento string `json:"documento"`
	}
	_ = c.ShouldBindJSON(&body)

	link, err := h.svc.LinkDePagamento(c.Request.Context(), tid, uint(id), body.Documento)
	switch {
	case err == nil:
		c.JSON(http.StatusOK, gin.H{"link": link})
	case errors.Is(err, ErrPrecisaDocumento):
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Informe o CPF ou CNPJ para emitir a cobrança.", "code": "PRECISA_DOCUMENTO"})
	case errors.Is(err, ErrDocumentoInvalido):
		c.JSON(http.StatusBadRequest, gin.H{"error": "CPF ou CNPJ inválido. Confira os números.", "code": "DOCUMENTO_INVALIDO"})
	case errors.Is(err, ErrFaturaNaoEncontrada):
		c.JSON(http.StatusNotFound, gin.H{"error": "Fatura não encontrada"})
	case errors.Is(err, ErrFaturaFechada):
		c.JSON(http.StatusConflict, gin.H{"error": "Esta fatura já foi paga ou cancelada."})
	case errors.Is(err, ErrCobrancaDesligada):
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "O pagamento online ainda não está disponível. Fale com o suporte."})
	default:
		slog.Error("assinatura: falha ao gerar link", "tenant", tid, "fatura", id, "error", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Não conseguimos gerar o pagamento agora. Tente de novo em alguns minutos."})
	}
}

func (h *Handler) trocarPlano(c *gin.Context) {
	u, tid, ok := tenantDoPedido(c)
	if !ok || !somenteGestor(c, u) {
		return
	}
	var body struct {
		PlanID       uint `json:"plan_id"`
		PlanIDLegado uint `json:"planId"` // rota antiga /api/tenant/change-plan
	}
	_ = c.ShouldBindJSON(&body)
	if body.PlanID == 0 {
		body.PlanID = body.PlanIDLegado
	}
	if body.PlanID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Escolha um plano"})
		return
	}
	imediata, fim, err := h.svc.TrocarPlano(c.Request.Context(), tid, body.PlanID)
	if err != nil {
		if errors.Is(err, ErrPlanoInvalido) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Este plano não está disponível"})
			return
		}
		slog.Error("assinatura: falha ao trocar plano", "tenant", tid, "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Não foi possível trocar o plano"})
		return
	}
	msg := "Plano trocado."
	if !imediata && fim != nil {
		msg = "O plano novo começa na próxima renovação, em " + fim.In(fuso).Format("02/01/2006") + "."
	}
	c.JSON(http.StatusOK, gin.H{"imediata": imediata, "mensagem": msg})
}

// webhook: confere o token em tempo constante, descarta aviso repetido e
// processa. Erro devolve 500 para o Asaas reenviar.
func (h *Handler) webhook(c *gin.Context) {
	esperado := os.Getenv("ASAAS_PLATAFORMA_WEBHOOK_TOKEN")
	if esperado == "" || h.svc.asaas == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "webhook não configurado"})
		return
	}
	recebido := c.GetHeader("asaas-access-token")
	if subtle.ConstantTimeCompare([]byte(recebido), []byte(esperado)) != 1 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token inválido"})
		return
	}
	corpo, err := io.ReadAll(io.LimitReader(c.Request.Body, 1<<20))
	if err != nil {
		c.Status(http.StatusBadRequest)
		return
	}
	var p asaas.WebhookPayload
	if err := json.Unmarshal(corpo, &p); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}
	idEvento := p.ID
	if idEvento == "" {
		idEvento = p.Event + ":" + p.Payment.ID
	}
	ctx := c.Request.Context()
	ev := models.WebhookEvent{Provider: "asaas_plataforma", EventID: idEvento, Payload: datatypes.JSON(corpo), CreatedAt: time.Now()}
	h.db.WithContext(ctx).Clauses(clause.OnConflict{DoNothing: true}).Create(&ev)
	var existente models.WebhookEvent
	if err := h.db.WithContext(ctx).Where("provider = ? AND event_id = ?", ev.Provider, idEvento).First(&existente).Error; err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	if existente.ProcessedAt != nil {
		c.JSON(http.StatusOK, gin.H{"ok": true, "repetido": true})
		return
	}
	if err := h.svc.ProcessarWebhook(ctx, p); err != nil {
		slog.Error("assinatura: webhook falhou", "evento", idEvento, "error", err)
		c.Status(http.StatusInternalServerError)
		return
	}
	agora := time.Now()
	h.db.WithContext(ctx).Model(&models.WebhookEvent{}).Where("id = ?", existente.ID).Update("processed_at", agora)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// ExigirLiberadaDoTenant é a mesma barreira para módulos que resolvem a
// empresa por conta própria (ex.: WhatsApp).
func ExigirLiberadaDoTenant(svc *Service, resolver func(*gin.Context) (uint, bool, bool)) gin.HandlerFunc {
	return func(c *gin.Context) {
		tid, superAdmin, ok := resolver(c)
		if !ok || superAdmin {
			c.Next()
			return
		}
		a, err := svc.AcessoDoTenant(c.Request.Context(), tid)
		if err == nil && !a.Liberado {
			c.AbortWithStatusJSON(http.StatusPaymentRequired, gin.H{
				"error": "O acesso está suspenso. Regularize a assinatura para continuar.",
				"code":  "ASSINATURA_BLOQUEADA", "situacao": a.Situacao,
			})
			return
		}
		c.Next()
	}
}

// ExigirLiberada barra com 402 as rotas da imobiliária cujo acesso está
// bloqueado (teste acabou, passou da tolerância, bloqueio manual). Deve rodar
// depois de auth + ResolveTenant. O dono da plataforma sempre passa.
func ExigirLiberada(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		u, ok := auth.UserFrom(c)
		if !ok || u.IsSuperAdmin || u.TenantID == nil {
			c.Next()
			return
		}
		a, err := svc.AcessoDoTenant(c.Request.Context(), *u.TenantID)
		if err != nil {
			slog.Error("assinatura: falha ao checar acesso", "tenant", *u.TenantID, "error", err)
			c.Next() // falha de leitura não derruba a operação da imobiliária
			return
		}
		if !a.Liberado {
			c.AbortWithStatusJSON(http.StatusPaymentRequired, gin.H{
				"error":    "O acesso está suspenso. Regularize a assinatura para continuar.",
				"code":     "ASSINATURA_BLOQUEADA",
				"situacao": a.Situacao,
			})
			return
		}
		c.Next()
	}
}

var recursosDoPlano = []string{
	"has_whatsapp", "has_pagamentos", "has_ai_analysis", "has_relatorios_avancados",
	"has_multi_usuarios", "has_api_access", "has_suporte_prioritario", "has_dominio_customizado",
}

type limiteUso struct {
	Limite int   `json:"limite"` // 0 = ilimitado
	Atual  int64 `json:"atual"`
}

// recursosELimites: o que o plano (ou o ajuste da empresa) libera e quanto já
// foi usado — alimenta o menu (cadeado) e a tela Minha assinatura.
func recursosELimites(ctx context.Context, db *gorm.DB, t *models.Tenant, p *models.Plan) (map[string]bool, map[string]limiteUso) {
	r := billing.NewPlanResolver()
	recursos := map[string]bool{}
	for _, f := range recursosDoPlano {
		recursos[f] = r.IsFeatureEnabled(t, p, f)
	}
	tabelas := map[string]string{"clientes": "clientes", "usuarios": "users", "imoveis": "imoveis", "alugueis": "alugueis"}
	limites := map[string]limiteUso{}
	for campo, tabela := range tabelas {
		var n int64
		db.WithContext(ctx).Table(tabela).Where("tenant_id = ?", t.ID).Count(&n)
		limites[campo] = limiteUso{Limite: r.EffectiveLimit(t, p, campo), Atual: n}
	}
	return recursos, limites
}
