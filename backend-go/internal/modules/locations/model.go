// Package locations replica locations.js (§2.7 do spec): Estado/Município,
// cadastros GLOBAIS (sem tenant_id) — já listados em internal/tenant/globals.go
// ("estados", "municipios").
package locations

// Estado espelha a tabela `Estados` (tableName default do Sequelize — "Estados").
type Estado struct {
	ID   uint   `gorm:"primaryKey" json:"id"`
	Nome string `gorm:"column:nome" json:"nome"`
	Sigla string `gorm:"column:sigla" json:"sigla"`
}

func (Estado) TableName() string { return "estados" }

// Municipio espelha a tabela `Municipios`. ⚠️ `estadoId` em camelCase (default
// Sequelize sem underscored) — preservado 1:1 conforme spec §4.5 (confirmar
// nome real da coluna na migration; se a tabela usar snake_case, ajustar a tag).
type Municipio struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Nome     string `gorm:"column:nome" json:"nome"`
	EstadoID uint   `gorm:"column:estadoId" json:"estadoId"`
}

func (Municipio) TableName() string { return "municipios" }
