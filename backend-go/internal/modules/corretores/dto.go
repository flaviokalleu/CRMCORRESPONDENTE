package corretores

import "crmimob/internal/models"

// Response é o shape público de um corretor — nunca inclui password.
type Response struct {
	ID         uint   `json:"id"`
	Username   string `json:"username"`
	FirstName  string `json:"first_name"`
	LastName   string `json:"last_name"`
	Email      string `json:"email"`
	Telefone   string `json:"telefone"`
	Creci      string `json:"creci"`
	Address    string `json:"address"`
	PixAccount string `json:"pix_account"`
	Photo      string `json:"photo"`
	TenantID   *uint  `json:"tenant_id"`
}

func ToResponse(u *models.User) Response {
	return Response{
		ID: u.ID, Username: u.Username, FirstName: u.FirstName, LastName: u.LastName,
		Email: u.Email, Telefone: u.Telefone, Creci: u.Creci, Address: u.Address,
		PixAccount: u.PixAccount, Photo: u.Photo, TenantID: u.TenantID,
	}
}

func ToResponseList(list []models.User) []Response {
	out := make([]Response, 0, len(list))
	for i := range list {
		out = append(out, ToResponse(&list[i]))
	}
	return out
}

// CreateRequest — campos aceitos na criação de corretor. `photo` vem via
// multipart separadamente (c.FormFile). Ver 01-spec §2.7.
type CreateRequest struct {
	Username   string `form:"username" binding:"required"`
	Email      string `form:"email" binding:"required,email"`
	FirstName  string `form:"first_name" binding:"required"`
	LastName   string `form:"last_name"`
	Telefone   string `form:"telefone"`
	Password   string `form:"password" binding:"required,min=6"`
	Creci      string `form:"creci"`
	Address    string `form:"address"`
	PixAccount string `form:"pix_account"`
}

// UpdateRequest — update parcial (todos opcionais).
type UpdateRequest struct {
	Username   *string `form:"username"`
	Email      *string `form:"email"`
	FirstName  *string `form:"first_name"`
	LastName   *string `form:"last_name"`
	Telefone   *string `form:"telefone"`
	Password   *string `form:"password"`
	Creci      *string `form:"creci"`
	Address    *string `form:"address"`
	PixAccount *string `form:"pix_account"`
}
