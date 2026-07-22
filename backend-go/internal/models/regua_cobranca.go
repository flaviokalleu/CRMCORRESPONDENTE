package models

import "time"

// ReguaCobranca espelha `regua_cobrancas` — registro de idempotência/histórico
// da automação de cobrança via WhatsApp (não gera cobrança financeira, isso é
// papel do Asaas/CobrancaAluguel). Ver 04-spec §Régua de cobrança.
type ReguaCobranca struct {
	ID                uint       `gorm:"primaryKey" json:"id"`
	ClienteAluguelID  uint       `gorm:"column:cliente_aluguel_id;not null;index" json:"cliente_aluguel_id"`
	CobrancaAluguelID *uint      `gorm:"column:cobranca_aluguel_id" json:"cobranca_aluguel_id,omitempty"`
	// Etapa: D-5/D-1/D+1/D+7/D+15
	Etapa           string     `gorm:"column:etapa;not null" json:"etapa"`
	DiasReferencia  int        `gorm:"column:dias_referencia;not null" json:"dias_referencia"`
	MensagemEnviada bool       `gorm:"column:mensagem_enviada;default:false" json:"mensagem_enviada"`
	DataEnvio       *time.Time `gorm:"column:data_envio" json:"data_envio,omitempty"`
	DataReferencia  time.Time  `gorm:"column:data_referencia;type:date;not null" json:"data_referencia"`
	MesReferencia   *string    `gorm:"column:mes_referencia" json:"mes_referencia,omitempty"` // YYYY-MM

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (ReguaCobranca) TableName() string { return "regua_cobrancas" }

// EtapasOrdenadas replica a tabela fixa de etapas da régua (04-spec §Régua).
var EtapasOrdenadas = []struct {
	Etapa string
	Dias  int
}{
	{"D-5", -5},
	{"D-1", -1},
	{"D+1", 1},
	{"D+7", 7},
	{"D+15", 15},
}
