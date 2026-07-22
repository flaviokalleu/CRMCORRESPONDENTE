package models

import "time"

// Proprietario espelha a tabela `proprietario` (SINGULAR — divergente do resto
// do cluster). Model Node em minúsculo, `underscored: false`, timestamps
// camelCase (`createdAt`/`updatedAt`). Ver 04-spec Gotcha 5.
type Proprietario struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"column:name;size:255;not null" json:"name"`
	Address   *string   `gorm:"column:address;size:255" json:"address,omitempty"`
	Phone     *string   `gorm:"column:phone;size:255" json:"phone,omitempty"`
	TenantID  *uint     `gorm:"column:tenant_id" json:"tenant_id,omitempty"`
	CreatedAt time.Time `gorm:"column:createdAt" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updated_at"`
}

func (Proprietario) TableName() string { return "proprietario" }
