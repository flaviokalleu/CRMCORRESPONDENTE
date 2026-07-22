package proprietarios

// CreateRequest é o corpo de POST /api/proprietarios (contrato preservado).
type CreateRequest struct {
	Name    string `json:"name" binding:"required"`
	Phone   string `json:"phone"`
	Address string `json:"address"`
}
