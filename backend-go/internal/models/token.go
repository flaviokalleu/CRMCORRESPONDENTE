package models

import "time"

// Token espelha a tabela `tokens` (timestamps manuais, sem tenant_id → global).
// expires_at reflete o access token (sliding +60min); o refresh é validado por
// assinatura + presença do registro. Ver gotcha 01-spec §7.2.
type Token struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Token        string    `gorm:"column:token;uniqueIndex" json:"token"`
	RefreshToken *string   `gorm:"column:refresh_token;uniqueIndex" json:"refresh_token,omitempty"`
	UserID       uint      `gorm:"column:user_id;index" json:"user_id"`
	UserType     *string   `gorm:"column:user_type" json:"user_type,omitempty"`
	ExpiresAt    time.Time `gorm:"column:expires_at;index" json:"expires_at"`
	Email        string    `gorm:"column:email;index" json:"email"`
	CreatedAt    time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Token) TableName() string { return "tokens" }
