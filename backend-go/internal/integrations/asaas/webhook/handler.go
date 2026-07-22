// Package webhook implementa o handler HTTP do webhook Asaas
// (POST /api/asaas/webhook/:tenantSlug e POST /api/asaas/webhook legado),
// com validação de token e idempotência via tabela webhook_events
// (03-spec §"Webhook Asaas (detalhado)").
package webhook

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/integrations/asaas"
	"crmimob/internal/models"
)

// Handler expõe as rotas públicas do webhook Asaas. Não usa auth.Required nem
// ResolveTenant — o tenant é resolvido pelo slug na URL (ou é o legado global).
type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler { return &Handler{db: db} }

// Register monta as rotas no grupo raiz da API (mount `/api`, público —
// espelha `app.use('/api', asaasWebhookRoutes)` do Node).
func (h *Handler) Register(rg *gin.RouterGroup) {
	rg.POST("/asaas/webhook/:tenantSlug", h.handleTenant)
	rg.POST("/asaas/webhook", h.handleLegacy)
	rg.GET("/asaas/teste", h.testConnection)
}

func isProduction() bool {
	return os.Getenv("NODE_ENV") == "production"
}

// handleTenant resolve o tenant pelo slug, valida `asaas-access-token` contra
// `tenant.asaas_webhook_token` e processa usando a `asaas_api_key` do tenant.
func (h *Handler) handleTenant(c *gin.Context) {
	slug := c.Param("tenantSlug")
	ctx := c.Request.Context()

	var t models.Tenant
	if err := h.db.WithContext(ctx).Where("slug = ?", slug).First(&t).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organização não encontrada"})
		return
	}

	token := c.GetHeader("asaas-access-token")
	if t.AsaasWebhookToken == nil || *t.AsaasWebhookToken == "" {
		if isProduction() {
			log.Printf("asaas webhook: tenant %s sem asaas_webhook_token configurado — rejeitado em produção", slug)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Webhook não configurado"})
			return
		}
		log.Printf("asaas webhook: tenant %s sem asaas_webhook_token — aceitando (ambiente não-produção)", slug)
	} else if token != *t.AsaasWebhookToken {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
		return
	}

	tenantID := t.ID
	h.process(c, &tenantID)
}

// handleLegacy usa o token/chave globais (ASAAS_WEBHOOK_TOKEN / ASAAS_API_KEY).
func (h *Handler) handleLegacy(c *gin.Context) {
	expected := os.Getenv("ASAAS_WEBHOOK_TOKEN")
	token := c.GetHeader("asaas-access-token")

	if expected == "" {
		if isProduction() {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Webhook não configurado"})
			return
		}
		log.Printf("asaas webhook (legado): ASAAS_WEBHOOK_TOKEN não configurado — aceitando (ambiente não-produção)")
	} else if token != expected {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
		return
	}

	h.process(c, nil)
}

func (h *Handler) process(c *gin.Context, tenantID *uint) {
	ctx := c.Request.Context()

	raw, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Corpo inválido"})
		return
	}

	var payload asaas.WebhookPayload
	if err := json.Unmarshal(raw, &payload); err != nil || payload.Event == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Body inválido"})
		return
	}

	// Chave de deduplicação: id do evento se vier no payload, senão uma chave
	// composta (evento + payment.id) — Asaas normalmente reenvia o mesmo `id`
	// em retries do mesmo evento (03-spec: "Asaas envia `id` do evento").
	eventID := payload.ID
	if eventID == "" {
		eventID = payload.Event + "_" + payload.Payment.ID
	}

	evt, already, err := reserveEvent(ctx, h.db, eventID, raw)
	if err != nil {
		log.Printf("asaas webhook: erro ao reservar evento %s: %v", eventID, err)
		// Resiliência: erro interno não deve provocar retry infinito do Asaas.
		c.JSON(http.StatusOK, gin.H{"received": true})
		return
	}
	if already {
		c.JSON(http.StatusOK, gin.H{"received": true, "duplicate": true})
		return
	}

	if procErr := ProcessEvent(ctx, h.db, tenantID, payload); procErr != nil {
		log.Printf("asaas webhook: erro ao processar evento %s (%s): %v", eventID, payload.Event, procErr)
		// Erro de negócio: responde 200 mesmo assim (evita retries agressivos
		// do Asaas — 03-spec §"Resiliência"), mas NÃO marca como processado,
		// permitindo reprocessamento numa próxima entrega.
		c.JSON(http.StatusOK, gin.H{"received": true})
		return
	}

	if evt != nil {
		if markErr := markProcessed(ctx, h.db, evt.ID); markErr != nil {
			log.Printf("asaas webhook: erro ao marcar evento %s como processado: %v", eventID, markErr)
		}
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

// testConnection — GET /api/asaas/teste. Testa a chave global (equivalente a
// `testarConexao` do Node).
func (h *Handler) testConnection(c *gin.Context) {
	apiKey := asaas.ResolveAPIKey(nil)
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "ASAAS_API_KEY não configurada"})
		return
	}
	client := asaas.NewClient(apiKey)
	balance, err := client.GetBalance(c.Request.Context())
	if err != nil {
		var asaasErr *asaas.ErrAsaas
		if errors.As(err, &asaasErr) {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": asaasErr.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"environment": asaas.ResolveEnvironment(),
		"balance":     balance.Balance,
	})
}
