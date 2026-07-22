package models

import (
	"time"

	"gorm.io/datatypes"
)

// Pagamento espelha a tabela `pagamentos` — cobranças avulsas de clientes.
// Migração de Mercado Pago → Asaas (ver 03-spec §"De-Para" e §"Campos a renomear").
// Campos MP (mp_preference_id, mp_payment_id, dados_mp, calculo_mp, juros_mp)
// foram substituídos pelos equivalentes Asaas/gateway-agnósticos.
// Tabela é escopada por tenant (tenant_id) — filtrada automaticamente pelos
// callbacks GORM via internal/tenant quando a query usa db.WithContext(ctx).
type Pagamento struct {
	ID        uint  `gorm:"primaryKey" json:"id"`
	ClienteID uint  `gorm:"column:cliente_id;index" json:"cliente_id"`
	CreatedBy *uint `gorm:"column:created_by;index" json:"created_by,omitempty"`
	TenantID  *uint `gorm:"column:tenant_id;index" json:"tenant_id,omitempty"`

	// Identificadores Asaas (substituem mp_preference_id/mp_payment_id).
	AsaasCustomerID *string `gorm:"column:asaas_customer_id" json:"asaas_customer_id,omitempty"`
	AsaasPaymentID  *string `gorm:"column:asaas_payment_id;index" json:"asaas_payment_id,omitempty"`

	Tipo   string `gorm:"column:tipo;default:universal" json:"tipo"` // boleto|pix|cartao|universal
	Status string `gorm:"column:status;default:pendente" json:"status"`
	// pendente|aprovado|rejeitado|cancelado|expirado|aguardando
	// (canônico recomendado: adotar vocabulário Asaas internamente e traduzir na saída)

	Titulo    string `gorm:"column:titulo" json:"titulo"`
	Descricao string `gorm:"column:descricao" json:"descricao"`

	// `valor` é STRING formatada (ex: "2.000,00") — legado do Node. Usar sempre
	// ValorNumerico (DECIMAL) para cálculos (gotcha 03-spec §2).
	Valor         string  `gorm:"column:valor" json:"valor"`
	ValorNumerico float64 `gorm:"column:valor_numerico" json:"valor_numerico"`

	Parcelas               int     `gorm:"column:parcelas;default:1" json:"parcelas"`
	ValorParcela            string  `gorm:"column:valor_parcela" json:"valor_parcela"`
	ValorParcelaNumerico    float64 `gorm:"column:valor_parcela_numerico" json:"valor_parcela_numerico"`

	WhatsappEnviado    bool       `gorm:"column:whatsapp_enviado;default:false" json:"whatsapp_enviado"`
	EmailEnviado       bool       `gorm:"column:email_enviado;default:false" json:"email_enviado"`
	DataEnvioWhatsapp  *time.Time `gorm:"column:data_envio_whatsapp" json:"data_envio_whatsapp,omitempty"`
	DataEnvioEmail     *time.Time `gorm:"column:data_envio_email" json:"data_envio_email,omitempty"`

	DataVencimento *time.Time `gorm:"column:data_vencimento" json:"data_vencimento,omitempty"`
	DataPagamento  *time.Time `gorm:"column:data_pagamento" json:"data_pagamento,omitempty"`

	// InvoiceURL substitui `link_pagamento`/`init_point` (MP) — Asaas `invoiceUrl`.
	InvoiceURL     string `gorm:"column:invoice_url" json:"invoice_url"`
	LinkCurto      string `gorm:"column:link_curto" json:"link_curto"`
	CodigoBarras   string `gorm:"column:codigo_barras" json:"codigo_barras"`
	LinhaDigitavel string `gorm:"column:linha_digitavel" json:"linha_digitavel"`
	QRCode         string `gorm:"column:qr_code" json:"qr_code"`
	QRCodeBase64   string `gorm:"column:qr_code_base64" json:"qr_code_base64"`

	Observacoes string `gorm:"column:observacoes" json:"observacoes"`

	// DadosGateway substitui `dados_mp` (JSONB) — payload bruto do gateway (Asaas).
	DadosGateway datatypes.JSON `gorm:"column:dados_gateway" json:"dados_gateway,omitempty"`

	// InvoiceURL cobre comprovante_url/receipt_url; TransactionReceiptURL é o
	// comprovante de transação quando disponível (Asaas `transactionReceiptUrl`).
	TransactionReceiptURL string `gorm:"column:transaction_receipt_url" json:"transaction_receipt_url,omitempty"`

	ValorOriginal         string   `gorm:"column:valor_original" json:"valor_original,omitempty"`
	ValorOriginalNumerico *float64 `gorm:"column:valor_original_numerico" json:"valor_original_numerico,omitempty"`
	JurosTotal            string   `gorm:"column:juros_total" json:"juros_total,omitempty"`
	JurosTotalNumerico    *float64 `gorm:"column:juros_total_numerico" json:"juros_total_numerico,omitempty"`
	TaxaJuros             *float64 `gorm:"column:taxa_juros" json:"taxa_juros,omitempty"`

	ParcelaAtual              *int       `gorm:"column:parcela_atual" json:"parcela_atual,omitempty"`
	PagamentoPaiID            *uint      `gorm:"column:pagamento_pai_id" json:"pagamento_pai_id,omitempty"`
	IsParcelado               bool       `gorm:"column:is_parcelado;default:false" json:"is_parcelado"`
	DataEnvioProximaParcela   *time.Time `gorm:"column:data_envio_proxima_parcela" json:"data_envio_proxima_parcela,omitempty"`

	ValorComJuros *float64 `gorm:"column:valor_com_juros" json:"valor_com_juros,omitempty"`

	LinkUnico string `gorm:"column:link_unico;uniqueIndex" json:"link_unico"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Pagamento) TableName() string { return "pagamentos" }

// Status canônicos (vocabulário local, traduzido de/para eventos Asaas na borda).
const (
	PagamentoStatusPendente   = "pendente"
	PagamentoStatusAprovado   = "aprovado"
	PagamentoStatusRejeitado  = "rejeitado"
	PagamentoStatusCancelado  = "cancelado"
	PagamentoStatusExpirado   = "expirado"
	PagamentoStatusAguardando = "aguardando"
)

// Tipos de cobrança suportados.
const (
	PagamentoTipoBoleto    = "boleto"
	PagamentoTipoPix       = "pix"
	PagamentoTipoCartao    = "cartao"
	PagamentoTipoUniversal = "universal"
)
