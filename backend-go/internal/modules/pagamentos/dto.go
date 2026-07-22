package pagamentos

import "crmimob/internal/models"

// CreateBoletoRequest — POST /api/pagamentos/boleto.
type CreateBoletoRequest struct {
	ClienteID      uint    `json:"cliente_id" binding:"required"`
	Titulo         string  `json:"titulo" binding:"required"`
	Descricao      string  `json:"descricao"`
	Valor          float64 `json:"valor" binding:"required,gt=0"`
	DataVencimento string  `json:"data_vencimento" binding:"required"` // YYYY-MM-DD
	Observacoes    string  `json:"observacoes"`
	Parcelas       int     `json:"parcelas"`
	EnviarWhatsapp *bool   `json:"enviar_whatsapp"`
	EnviarEmail    *bool   `json:"enviar_email"`
}

// CreatePixRequest — POST /api/pagamentos/pix. Sem data_vencimento — expira em
// PIX_EXPIRE_MINUTES (default 30) a partir de agora.
type CreatePixRequest struct {
	ClienteID      uint    `json:"cliente_id" binding:"required"`
	Titulo         string  `json:"titulo" binding:"required"`
	Descricao      string  `json:"descricao"`
	Valor          float64 `json:"valor" binding:"required,gt=0"`
	Observacoes    string  `json:"observacoes"`
	EnviarWhatsapp *bool   `json:"enviar_whatsapp"`
	EnviarEmail    *bool   `json:"enviar_email"`
}

// CreateUniversalRequest — POST /api/pagamentos/universal (checkout aceita
// todos os métodos — Asaas billingType UNDEFINED).
type CreateUniversalRequest struct {
	ClienteID      uint    `json:"cliente_id" binding:"required"`
	Titulo         string  `json:"titulo" binding:"required"`
	Descricao      string  `json:"descricao"`
	Valor          float64 `json:"valor" binding:"required,gt=0"`
	DataVencimento string  `json:"data_vencimento" binding:"required"`
	Observacoes    string  `json:"observacoes"`
	EnviarWhatsapp *bool   `json:"enviar_whatsapp"`
	EnviarEmail    *bool   `json:"enviar_email"`
}

// UpdatePagamentoRequest — PUT /api/pagamentos/:id (só edita status pendente).
type UpdatePagamentoRequest struct {
	Titulo         *string  `json:"titulo"`
	Descricao      *string  `json:"descricao"`
	Valor          *float64 `json:"valor"`
	DataVencimento *string  `json:"data_vencimento"`
	Parcelas       *int     `json:"parcelas"`
	Observacoes    *string  `json:"observacoes"`
}

// ListQuery — GET /api/pagamentos (paginação + filtros).
type ListQuery struct {
	Page      int    `form:"page"`
	Limit     int    `form:"limit"`
	Status    string `form:"status"`
	Tipo      string `form:"tipo"`
	ClienteID uint   `form:"cliente_id"`
}

// ListResponse — shape preservado do Node ({pagamentos, total, page, totalPages}).
type ListResponse struct {
	Pagamentos []models.Pagamento `json:"pagamentos"`
	Total      int64              `json:"total"`
	Page       int                `json:"page"`
	TotalPages int                `json:"totalPages"`
}

// CreatePagamentoResponse — resposta de criação (boleto/pix/universal).
// Substitui o antigo bloco `mercado_pago` por `asaas`.
type CreatePagamentoResponse struct {
	Success   bool             `json:"success"`
	Pagamento *models.Pagamento `json:"pagamento"`
	Asaas     AsaasInfo        `json:"asaas"`
	Envios    EnviosInfo       `json:"envios"`
}

type AsaasInfo struct {
	PaymentID  string `json:"payment_id"`
	InvoiceURL string `json:"invoice_url"`
	Status     string `json:"status"`
}

type EnviosInfo struct {
	WhatsappEnviado bool `json:"whatsapp_enviado"`
	EmailEnviado    bool `json:"email_enviado"`
}

// ConfigResponse — GET /api/pagamentos/config.
type ConfigResponse struct {
	MaxParcelas        int `json:"maxParcelas"`
	BoletoDaysToExpire int `json:"boletoDaysToExpire"`
	PixExpireMinutes   int `json:"pixExpireMinutes"`
}
