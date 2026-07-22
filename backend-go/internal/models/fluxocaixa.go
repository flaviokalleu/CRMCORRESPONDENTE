package models

import "time"

// FluxoCaixa espelha a tabela `fluxo_caixa`.
// ⚠️ `underscored:false` — colunas camelCase (ver receita.go).
type FluxoCaixa struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	Data            time.Time `gorm:"column:data" json:"data"`
	Tipo            string    `gorm:"column:tipo" json:"tipo"` // entrada|saida
	Valor           float64   `gorm:"column:valor" json:"valor"` // DECIMAL(12,2)
	Descricao       string    `gorm:"column:descricao" json:"descricao"`
	ReferenciaID    *uint     `gorm:"column:referenciaId" json:"referenciaId,omitempty"`
	ReferenciaTipo  string    `gorm:"column:referenciaTipo" json:"referenciaTipo,omitempty"`
	TenantID        *uint     `gorm:"column:tenant_id;index" json:"tenant_id,omitempty"`
	CreatedAt       time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt       time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (FluxoCaixa) TableName() string { return "fluxo_caixa" }
