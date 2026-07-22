package models

import "time"

// Lembrete espelha a tabela `Lembretes` (⚠️ "L" maiúsculo — nome de tabela
// preservado 1:1 do model Sequelize original, que não usava `underscored`).
// Sem tenant_id — não é multi-tenant hoje (ver spec §4.3).
type Lembrete struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Titulo     string    `gorm:"column:titulo;not null" json:"titulo"`
	Descricao  *string   `gorm:"column:descricao" json:"descricao"`
	Data       time.Time `gorm:"column:data;not null" json:"data"`
	Notificado bool      `gorm:"column:notificado;default:false" json:"notificado"`
	Concluido  bool      `gorm:"column:concluido;default:false" json:"concluido"`

	CreatedAt time.Time `gorm:"column:createdAt" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (Lembrete) TableName() string { return "Lembretes" }
