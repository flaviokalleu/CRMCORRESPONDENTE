package models

import "time"

// Comissao espelha a tabela `comissoes`.
// ⚠️ `underscored:false` — colunas camelCase (ver receita.go).
type Comissao struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Valor      float64   `gorm:"column:valor" json:"valor"`           // DECIMAL(12,2)
	Percentual float64   `gorm:"column:percentual" json:"percentual"` // DECIMAL(5,2)
	Data       time.Time `gorm:"column:data" json:"data"`
	ContratoID *uint     `gorm:"column:contratoId" json:"contratoId,omitempty"`
	CorretorID *uint     `gorm:"column:corretorId" json:"corretorId,omitempty"`
	TenantID   *uint     `gorm:"column:tenant_id;index" json:"tenant_id,omitempty"`
	CreatedAt  time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt  time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Comissao) TableName() string { return "comissoes" }
