package models

import "time"

// FaturaAssinatura é a cobrança que a PLATAFORMA faz à imobiliária (não
// confundir com `pagamentos`, que são as cobranças da imobiliária aos clientes
// dela). Tem tenant_id, então nas rotas da imobiliária o escopo automático já
// filtra. `Chave` é única e impede fatura duplicada (ex.: renovacao:7:2026-12-01).
type FaturaAssinatura struct {
	ID               uint       `gorm:"primaryKey" json:"id"`
	TenantID         uint       `gorm:"column:tenant_id" json:"tenant_id"`
	PlanID           uint       `gorm:"column:plan_id" json:"plan_id"`
	Ciclo            string     `gorm:"column:ciclo" json:"ciclo"`
	Valor            float64    `gorm:"column:valor" json:"valor"`
	Vencimento       time.Time  `gorm:"column:vencimento;type:date" json:"vencimento"`
	Status           string     `gorm:"column:status" json:"status"` // pendente|paga|vencida|cancelada|estornada
	Descricao        string     `gorm:"column:descricao" json:"descricao"`
	Chave            string     `gorm:"column:chave" json:"-"`
	GatewayPaymentID *string    `gorm:"column:gateway_payment_id" json:"-"`
	LinkPagamento    *string    `gorm:"column:link_pagamento" json:"link_pagamento,omitempty"`
	PagaEm           *time.Time `gorm:"column:paga_em" json:"paga_em,omitempty"`
	FormaPagamento   *string    `gorm:"column:forma_pagamento" json:"forma_pagamento,omitempty"`
	CreatedAt        time.Time  `gorm:"column:created_at" json:"created_at"`
	UpdatedAt        time.Time  `gorm:"column:updated_at" json:"updated_at"`
}

func (FaturaAssinatura) TableName() string { return "faturas_assinatura" }

// Situações de fatura.
const (
	FaturaPendente  = "pendente"
	FaturaPaga      = "paga"
	FaturaVencida   = "vencida"
	FaturaCancelada = "cancelada"
	FaturaEstornada = "estornada"
)

// EmAberto diz se a fatura ainda pode ser paga.
func (f *FaturaAssinatura) EmAberto() bool {
	return f.Status == FaturaPendente || f.Status == FaturaVencida
}
