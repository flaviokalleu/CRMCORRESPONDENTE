package comissoes

import "time"

// UpsertRequest — body de POST/PUT /api/comissoes[/:id].
type UpsertRequest struct {
	Valor      float64   `json:"valor" binding:"required"`
	Percentual float64   `json:"percentual" binding:"required"`
	Data       time.Time `json:"data" binding:"required"`
	ContratoID *uint     `json:"contratoId"`
	CorretorID *uint     `json:"corretorId"`
}
