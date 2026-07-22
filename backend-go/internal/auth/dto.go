package auth

import "crmimob/internal/models"

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

// UserPayload é o shape que o frontend espera no login (contrato preservado 1:1).
type UserPayload struct {
	ID               uint   `json:"id"`
	Email            string `json:"email"`
	Role             string `json:"role"`
	FirstName        string `json:"first_name"`
	LastName         string `json:"last_name"`
	IsCorretor       bool   `json:"is_corretor"`
	IsCorrespondente bool   `json:"is_correspondente"`
	IsAdministrador  bool   `json:"is_administrador"`
	TenantID         *uint  `json:"tenant_id"`
	IsSuperAdmin     bool   `json:"is_super_admin"`
}

func userPayload(u *models.User) UserPayload {
	return UserPayload{
		ID:               u.ID,
		Email:            u.Email,
		Role:             u.Role(),
		FirstName:        u.FirstName,
		LastName:         u.LastName,
		IsCorretor:       u.IsCorretor,
		IsCorrespondente: u.IsCorrespondente,
		IsAdministrador:  u.IsAdministrador,
		TenantID:         u.TenantID,
		IsSuperAdmin:     u.IsSuperAdmin,
	}
}

type LoginResponse struct {
	Token        string      `json:"token"`
	RefreshToken string      `json:"refreshToken"`
	User         UserPayload `json:"user"`
}
