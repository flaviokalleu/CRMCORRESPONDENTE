package models

import "time"

// Proposta espelha a tabela `propostas` — negociação imobiliária entre corretor
// e cliente. Ver docs/migration/06-dashboards-vendas-config.md §"Propostas".
type Proposta struct {
	ID uint `gorm:"primaryKey" json:"id"`

	ClienteID  uint  `gorm:"column:cliente_id;index;not null" json:"cliente_id"`
	ImovelID   uint  `gorm:"column:imovel_id;index;not null" json:"imovel_id"`
	CorretorID *uint `gorm:"column:corretor_id;index" json:"corretor_id,omitempty"`
	TenantID   *uint `gorm:"column:tenant_id;index" json:"tenant_id,omitempty"`

	ValorOfertado       float64  `gorm:"column:valor_ofertado" json:"valor_ofertado"`
	ValorContraProposta *float64 `gorm:"column:valor_contra_proposta" json:"valor_contra_proposta,omitempty"`
	ValorAceito         *float64 `gorm:"column:valor_aceito" json:"valor_aceito,omitempty"`

	FormaPagamento string `gorm:"column:forma_pagamento;default:financiamento" json:"forma_pagamento"`
	Status         string `gorm:"column:status;default:pendente" json:"status"`

	DataValidade  *time.Time `gorm:"column:data_validade" json:"data_validade,omitempty"`
	Condicoes     *string    `gorm:"column:condicoes" json:"condicoes,omitempty"`
	MotivoRecusa  *string    `gorm:"column:motivo_recusa" json:"motivo_recusa,omitempty"`
	Observacoes   *string    `gorm:"column:observacoes" json:"observacoes,omitempty"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`

	Cliente  *Cliente `gorm:"foreignKey:ClienteID;references:ID" json:"cliente,omitempty"`
	Imovel   *Imovel  `gorm:"foreignKey:ImovelID;references:ID" json:"imovel,omitempty"`
	Corretor *User    `gorm:"foreignKey:CorretorID;references:ID" json:"corretor,omitempty"`
}

func (Proposta) TableName() string { return "propostas" }

// Formas de pagamento suportadas.
const (
	PropostaFormaPagamentoFinanciamento = "financiamento"
	PropostaFormaPagamentoAVista        = "a_vista"
	PropostaFormaPagamentoFGTS          = "fgts"
	PropostaFormaPagamentoMisto         = "misto"
)

var propostaFormasPagamentoValidas = []string{
	PropostaFormaPagamentoFinanciamento, PropostaFormaPagamentoAVista,
	PropostaFormaPagamentoFGTS, PropostaFormaPagamentoMisto,
}

// IsFormaPagamentoValida confere se a forma de pagamento pertence ao enum.
func IsFormaPagamentoValida(fp string) bool {
	for _, v := range propostaFormasPagamentoValidas {
		if v == fp {
			return true
		}
	}
	return false
}

// Status de negociação da proposta.
const (
	PropostaStatusPendente     = "pendente"
	PropostaStatusEmNegociacao = "em_negociacao"
	PropostaStatusAceita       = "aceita"
	PropostaStatusRecusada     = "recusada"
	PropostaStatusExpirada     = "expirada"
	PropostaStatusCancelada    = "cancelada"
)

var propostaStatusValidos = []string{
	PropostaStatusPendente, PropostaStatusEmNegociacao, PropostaStatusAceita,
	PropostaStatusRecusada, PropostaStatusExpirada, PropostaStatusCancelada,
}

// IsPropostaStatusValido confere se o status pertence ao enum de propostas.
func IsPropostaStatusValido(status string) bool {
	for _, s := range propostaStatusValidos {
		if s == status {
			return true
		}
	}
	return false
}
