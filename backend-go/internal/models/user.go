package models

import "time"

// User espelha a tabela `users` (Sequelize model User).
// Flags de papel coexistem (um user pode ser admin + corretor simultaneamente).
// tenant_id é nullable e o modelo É escopado por tenant (não é global).
type User struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Username         string    `gorm:"column:username" json:"username"`
	FirstName        string    `gorm:"column:first_name" json:"first_name"`
	LastName         string    `gorm:"column:last_name" json:"last_name"`
	Email            string    `gorm:"column:email;uniqueIndex" json:"email"`
	Telefone         string    `gorm:"column:telefone" json:"telefone"`
	Password         string    `gorm:"column:password" json:"-"` // nunca serializado
	Creci            string    `gorm:"column:creci" json:"creci"`
	Address          string    `gorm:"column:address" json:"address"`
	PixAccount       string    `gorm:"column:pix_account" json:"pix_account"`
	Photo            string    `gorm:"column:photo" json:"photo"`
	IsCorretor       bool      `gorm:"column:is_corretor;default:false" json:"is_corretor"`
	IsAdministrador  bool      `gorm:"column:is_administrador;default:false" json:"is_administrador"`
	IsCorrespondente bool      `gorm:"column:is_correspondente;default:false" json:"is_correspondente"`
	IsSuperAdmin     bool      `gorm:"column:is_super_admin;default:false" json:"is_super_admin"`
	TenantID         *uint     `gorm:"column:tenant_id" json:"tenant_id"`
	CreatedAt        time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt        time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (User) TableName() string { return "users" }

// Role deriva o papel por prioridade fixa: Administrador > Corretor > Correspondente > User.
// (Padroniza a divergência entre os helpers do Node — ver 01-spec §4.1.)
func (u *User) Role() string {
	switch {
	case u.IsAdministrador:
		return "Administrador"
	case u.IsCorretor:
		return "Corretor"
	case u.IsCorrespondente:
		return "Correspondente"
	default:
		return "User"
	}
}
