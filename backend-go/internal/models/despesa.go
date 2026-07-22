package models

import "time"

// Despesa espelha a tabela `despesas`. Mesmo shape de Receita + `corretorId`.
// ⚠️ `underscored:false` — colunas camelCase (ver receita.go).
type Despesa struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Tipo       string    `gorm:"column:tipo" json:"tipo"`
	Valor      float64   `gorm:"column:valor" json:"valor"` // DECIMAL(12,2)
	Descricao  string    `gorm:"column:descricao" json:"descricao"`
	Data       time.Time `gorm:"column:data" json:"data"`
	ContratoID *uint     `gorm:"column:contratoId" json:"contratoId,omitempty"`
	CorretorID *uint     `gorm:"column:corretorId" json:"corretorId,omitempty"`
	TenantID   *uint     `gorm:"column:tenant_id;index" json:"tenant_id,omitempty"`
	CreatedAt  time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt  time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Despesa) TableName() string { return "despesas" }
