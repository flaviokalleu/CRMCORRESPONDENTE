package models

import (
	"time"

	"gorm.io/datatypes"
)

// Subscription espelha a tabela `subscriptions` — modelo GLOBAL. Ver 01-spec §3.5.
type Subscription struct {
	ID                    uint           `gorm:"primaryKey" json:"id"`
	TenantID              uint           `gorm:"column:tenant_id;index" json:"tenant_id"`
	PlanID                uint           `gorm:"column:plan_id;index" json:"plan_id"`
	Status                string         `gorm:"column:status;default:trialing" json:"status"` // trialing|active|past_due|canceled|suspended
	Ciclo                 string         `gorm:"column:ciclo;default:mensal" json:"ciclo"`      // mensal|anual
	DataInicio            time.Time      `gorm:"column:data_inicio" json:"data_inicio"`
	DataFim               *time.Time     `gorm:"column:data_fim" json:"data_fim,omitempty"`
	DataFimTrial          *time.Time     `gorm:"column:data_fim_trial" json:"data_fim_trial,omitempty"`
	Valor                 float64        `gorm:"column:valor" json:"valor"`
	GatewaySubscriptionID *string        `gorm:"column:gateway_subscription_id" json:"gateway_subscription_id,omitempty"`
	GatewayCustomerID     *string        `gorm:"column:gateway_customer_id" json:"gateway_customer_id,omitempty"`
	Gateway               *string        `gorm:"column:gateway" json:"gateway,omitempty"`
	ProximoPagamento      *time.Time     `gorm:"column:proximo_pagamento" json:"proximo_pagamento,omitempty"`
	TentativasCobranca    int            `gorm:"column:tentativas_cobranca;default:0" json:"tentativas_cobranca"`
	CanceladoEm           *time.Time     `gorm:"column:cancelado_em" json:"cancelado_em,omitempty"`
	MotivoCancelamento    *string        `gorm:"column:motivo_cancelamento" json:"motivo_cancelamento,omitempty"`
	Metadata              datatypes.JSON `gorm:"column:metadata" json:"metadata"`
	CreatedAt             time.Time      `gorm:"column:created_at" json:"created_at"`
	UpdatedAt             time.Time      `gorm:"column:updated_at" json:"updated_at"`
}

func (Subscription) TableName() string { return "subscriptions" }

// IsActive: status ∈ {active,trialing} E (data_fim nula ou futura). Ver 01-spec §3.5.
func (s *Subscription) IsActive() bool {
	if s.Status != "active" && s.Status != "trialing" {
		return false
	}
	return s.DataFim == nil || s.DataFim.After(time.Now())
}

// IsTrialing: status=trialing E data_fim_trial no futuro.
func (s *Subscription) IsTrialing() bool {
	return s.Status == "trialing" && s.DataFimTrial != nil && !s.DataFimTrial.Before(time.Now())
}

// DaysRemaining: dias até data_fim (ou data_fim_trial), mínimo 0; -1 se sem data.
func (s *Subscription) DaysRemaining() int {
	end := s.DataFim
	if end == nil {
		end = s.DataFimTrial
	}
	if end == nil {
		return -1
	}
	d := int(time.Until(*end).Hours()/24 + 0.9999)
	if d < 0 {
		return 0
	}
	return d
}
