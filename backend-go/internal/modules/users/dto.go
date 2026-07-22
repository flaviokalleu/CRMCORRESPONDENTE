package users

import "crmimob/internal/models"

// Response é o shape público de um User — nunca inclui password. Espelha o
// enriquecimento que userRoutes.js fazia (type, role, roles[], displayName).
// Ver 01-spec §2.6.
type Response struct {
	ID               uint    `json:"id"`
	Username         string  `json:"username"`
	FirstName        string  `json:"first_name"`
	LastName         string  `json:"last_name"`
	Email            string  `json:"email"`
	Telefone         string  `json:"telefone"`
	Creci            string  `json:"creci"`
	Address          string  `json:"address"`
	PixAccount       string  `json:"pix_account"`
	Photo            string  `json:"photo"`
	IsCorretor       bool    `json:"is_corretor"`
	IsAdministrador  bool    `json:"is_administrador"`
	IsCorrespondente bool    `json:"is_correspondente"`
	IsSuperAdmin     bool    `json:"is_super_admin"`
	TenantID         *uint   `json:"tenant_id"`
	Type             string  `json:"type"`
	Role             string  `json:"role"`
	Roles            []string `json:"roles"`
	DisplayName      string  `json:"displayName"`
}

// ToResponse converte o model para o DTO público (nunca serializa Password).
func ToResponse(u *models.User) Response {
	roles := make([]string, 0, 3)
	if u.IsAdministrador {
		roles = append(roles, "Administrador")
	}
	if u.IsCorretor {
		roles = append(roles, "Corretor")
	}
	if u.IsCorrespondente {
		roles = append(roles, "Correspondente")
	}
	role := u.Role()
	displayName := u.FirstName
	if u.LastName != "" {
		displayName = displayName + " " + u.LastName
	}
	if displayName == "" {
		displayName = u.Username
	}
	return Response{
		ID:               u.ID,
		Username:         u.Username,
		FirstName:        u.FirstName,
		LastName:         u.LastName,
		Email:            u.Email,
		Telefone:         u.Telefone,
		Creci:            u.Creci,
		Address:          u.Address,
		PixAccount:       u.PixAccount,
		Photo:            u.Photo,
		IsCorretor:       u.IsCorretor,
		IsAdministrador:  u.IsAdministrador,
		IsCorrespondente: u.IsCorrespondente,
		IsSuperAdmin:     u.IsSuperAdmin,
		TenantID:         u.TenantID,
		Type:             role,
		Role:             role,
		Roles:            roles,
		DisplayName:      displayName,
	}
}

func ToResponseList(users []models.User) []Response {
	out := make([]Response, 0, len(users))
	for i := range users {
		out = append(out, ToResponse(&users[i]))
	}
	return out
}

// UpdateRequest é a allow-list de campos editáveis via PUT /api/user/:id
// (idêntica ao Node: first_name,last_name,username,email,telefone,address,pix_account).
// Ver 01-spec §2.6 e gotcha §7 (nunca aceitar password/roles/tenant_id por aqui).
type UpdateRequest struct {
	FirstName  *string `form:"first_name" json:"first_name"`
	LastName   *string `form:"last_name" json:"last_name"`
	Username   *string `form:"username" json:"username"`
	Email      *string `form:"email" json:"email"`
	Telefone   *string `form:"telefone" json:"telefone"`
	Address    *string `form:"address" json:"address"`
	PixAccount *string `form:"pix_account" json:"pix_account"`
}

// ToUpdates monta o map de colunas a atualizar (allow-list estrita).
func (r UpdateRequest) ToUpdates() map[string]any {
	m := map[string]any{}
	if r.FirstName != nil {
		m["first_name"] = *r.FirstName
	}
	if r.LastName != nil {
		m["last_name"] = *r.LastName
	}
	if r.Username != nil {
		m["username"] = *r.Username
	}
	if r.Email != nil {
		m["email"] = *r.Email
	}
	if r.Telefone != nil {
		m["telefone"] = *r.Telefone
	}
	if r.Address != nil {
		m["address"] = *r.Address
	}
	if r.PixAccount != nil {
		m["pix_account"] = *r.PixAccount
	}
	return m
}
