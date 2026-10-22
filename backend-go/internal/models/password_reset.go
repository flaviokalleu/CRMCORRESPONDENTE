package models

import "time"

// PasswordReset é um pedido de redefinição de senha. Sem tenant_id: a
// recuperação acontece antes do login, fora de qualquer escopo de tenant.
type PasswordReset struct {
	ID        uint       `gorm:"primaryKey"`
	UserID    uint       `gorm:"column:user_id"`
	TokenHash string     `gorm:"column:token_hash"`
	ExpiresAt time.Time  `gorm:"column:expires_at"`
	UsedAt    *time.Time `gorm:"column:used_at"`
	CreatedAt time.Time  `gorm:"column:created_at"`
}

func (PasswordReset) TableName() string { return "password_resets" }
