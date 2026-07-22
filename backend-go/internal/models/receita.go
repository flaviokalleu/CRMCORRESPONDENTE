package models

import "time"

// Receita espelha a tabela `receitas`.
//
// ⚠️ Gotcha (03-spec §"Campos do model" / gotcha 7): o model Node usa
// `underscored: false` — colunas ficam em camelCase (`contratoId`, `createdAt`,
// `updatedAt`), diferente do padrão `underscored` (snake_case) do resto do
// projeto. As tags `gorm:"column:..."` abaixo preservam os nomes EXATOS.
type Receita struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Tipo      string    `gorm:"column:tipo" json:"tipo"`
	Valor     float64   `gorm:"column:valor" json:"valor"` // DECIMAL(12,2)
	Descricao string    `gorm:"column:descricao" json:"descricao"`
	Data      time.Time `gorm:"column:data" json:"data"` // DATEONLY
	ContratoID *uint    `gorm:"column:contratoId" json:"contratoId,omitempty"`
	TenantID  *uint     `gorm:"column:tenant_id;index" json:"tenant_id,omitempty"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Receita) TableName() string { return "receitas" }
