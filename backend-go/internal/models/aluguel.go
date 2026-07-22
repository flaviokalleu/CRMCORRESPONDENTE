package models

import (
	"time"

	"gorm.io/datatypes"
)

// Aluguel espelha a tabela `alugueis` (model Node `Aluguel`, models/aluguel.js).
// Tabela pluralizada "à mão" pelo Sequelize (não é `aluguels`) — ver 04-spec Gotcha 4.
//
// ⚠ Gotcha 3 (04-spec): o model Node define `foto_adicional` (singular, getter/
// setter JSON), mas as rotas leem/gravam `fotos_adicionais` (plural) — ver
// wiring doc. Mantemos aqui o nome real de coluna confirmado pelo model
// (`foto_adicional`); se a tabela real tiver a coluna plural, ajustar a tag
// `column` antes de rodar as migrations.
type Aluguel struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	NomeImovel     string         `gorm:"column:nome_imovel" json:"nome_imovel"`
	Descricao      string         `gorm:"column:descricao" json:"descricao"`
	ValorAluguel   float64        `gorm:"column:valor_aluguel;type:decimal(10,2)" json:"valor_aluguel"`
	Quartos        int            `gorm:"column:quartos" json:"quartos"`
	Banheiro       int            `gorm:"column:banheiro" json:"banheiro"`
	DiaVencimento  int            `gorm:"column:dia_vencimento" json:"dia_vencimento"`
	FotoCapa       *string        `gorm:"column:foto_capa" json:"foto_capa,omitempty"`
	Alugado        bool           `gorm:"column:alugado;default:false" json:"alugado"`
	FotoAdicional  datatypes.JSON `gorm:"column:foto_adicional" json:"foto_adicional,omitempty"`
	TenantID       *uint          `gorm:"column:tenant_id" json:"tenant_id,omitempty"`
	CreatedAt      time.Time      `gorm:"column:created_at" json:"created_at"`
	UpdatedAt      time.Time      `gorm:"column:updated_at" json:"updated_at"`
}

func (Aluguel) TableName() string { return "alugueis" }
