package auth

import "github.com/golang-jwt/jwt/v5"

// Claims é o payload do JWT (idêntico em access e refresh — ver 01-spec §4.1).
// NUNCA inclui o hash de senha (gotcha 01-spec §7.4).
type Claims struct {
	UserID           uint   `json:"id"`
	Email            string `json:"email"`
	Role             string `json:"role"`
	IsCorretor       bool   `json:"is_corretor"`
	IsCorrespondente bool   `json:"is_correspondente"`
	IsAdministrador  bool   `json:"is_administrador"`
	TenantID         *uint  `json:"tenant_id"`
	IsSuperAdmin     bool   `json:"is_super_admin"`
	jwt.RegisteredClaims
}
