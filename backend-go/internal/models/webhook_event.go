package models

import (
	"time"

	"gorm.io/datatypes"
)

// WebhookEvent registra eventos de webhook de gateways de pagamento já
// processados, para IDEMPOTÊNCIA. O Node não tinha esta tabela (03-spec
// gotcha §3/§"Idempotência"): reprocessar PAYMENT_CONFIRMED duplicava
// recibo/WhatsApp. Antes de processar um evento, o handler deve checar se já
// existe uma linha com o mesmo (Provider, EventID) e, se existir e
// ProcessedAt != nil, pular o processamento (responder 200 sem efeito).
type WebhookEvent struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Provider    string         `gorm:"column:provider;uniqueIndex:idx_webhook_provider_event" json:"provider"` // ex: "asaas"
	EventID     string         `gorm:"column:event_id;uniqueIndex:idx_webhook_provider_event" json:"event_id"`
	Payload     datatypes.JSON `gorm:"column:payload" json:"payload,omitempty"`
	ProcessedAt *time.Time     `gorm:"column:processed_at" json:"processed_at,omitempty"`
	CreatedAt   time.Time      `gorm:"column:created_at" json:"created_at"`
}

func (WebhookEvent) TableName() string { return "webhook_events" }
