package models

import "time"

// CobrancaAluguel espelha `cobranca_aluguels` (parcela mensal/avulsa gerada a
// partir do Asaas ou manualmente). `underscored: true` no Node.
type CobrancaAluguel struct {
	ID               uint       `gorm:"primaryKey" json:"id"`
	ClienteAluguelID uint       `gorm:"column:cliente_aluguel_id;not null;index" json:"cliente_aluguel_id"`
	AsaasPaymentID   *string    `gorm:"column:asaas_payment_id;uniqueIndex" json:"asaas_payment_id,omitempty"`
	Valor            float64    `gorm:"column:valor;type:decimal(10,2)" json:"valor"`
	DataVencimento   time.Time  `gorm:"column:data_vencimento;type:date" json:"data_vencimento"`
	DataPagamento    *time.Time `gorm:"column:data_pagamento;type:date" json:"data_pagamento,omitempty"`
	// Status: PENDING/CONFIRMED/OVERDUE/REFUNDED/CANCELLED
	Status       string  `gorm:"column:status;default:PENDING" json:"status"`
	BillingType  string  `gorm:"column:billing_type;default:UNDEFINED" json:"billing_type"` // PIX/BOLETO/CREDIT_CARD/UNDEFINED
	InvoiceURL   *string `gorm:"column:invoice_url" json:"invoice_url,omitempty"`
	BankSlipURL  *string `gorm:"column:bank_slip_url" json:"bank_slip_url,omitempty"`
	PixQrCode    *string `gorm:"column:pix_qr_code" json:"pix_qr_code,omitempty"`
	// Tipo: recorrente/avulso
	Tipo      string  `gorm:"column:tipo;default:recorrente" json:"tipo"`
	Descricao *string `gorm:"column:descricao" json:"descricao,omitempty"`
	ReciboURL *string `gorm:"column:recibo_url" json:"recibo_url,omitempty"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (CobrancaAluguel) TableName() string { return "cobranca_aluguels" }

// EmAberto indica se a cobrança ainda pode ser paga (usado na régua de cobrança
// e no cálculo de multa/juros).
func (c CobrancaAluguel) EmAberto() bool {
	return c.Status == "PENDING" || c.Status == "OVERDUE"
}

// Confirmada indica pagamento efetivado (usado em repasses/dashboard).
func (c CobrancaAluguel) Confirmada() bool {
	return c.Status == "CONFIRMED" || c.Status == "RECEIVED"
}
