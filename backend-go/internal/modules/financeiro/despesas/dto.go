package despesas

import "time"

// UpsertRequest — body de POST/PUT /api/despesas[/:id].
type UpsertRequest struct {
	Tipo       string    `json:"tipo" binding:"required"`
	Valor      float64   `json:"valor" binding:"required"`
	Descricao  string    `json:"descricao"`
	Data       time.Time `json:"data" binding:"required"`
	ContratoID *uint     `json:"contratoId"`
	CorretorID *uint     `json:"corretorId"`
}
