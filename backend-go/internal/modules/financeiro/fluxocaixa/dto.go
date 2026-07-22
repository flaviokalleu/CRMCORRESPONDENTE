package fluxocaixa

import "time"

// UpsertRequest — body de POST/PUT /api/fluxocaixa[/:id].
type UpsertRequest struct {
	Data           time.Time `json:"data" binding:"required"`
	Tipo           string    `json:"tipo" binding:"required"` // entrada|saida
	Valor          float64   `json:"valor" binding:"required"`
	Descricao      string    `json:"descricao"`
	ReferenciaID   *uint     `json:"referenciaId"`
	ReferenciaTipo string    `json:"referenciaTipo"`
}

// DashboardResponse — GET /api/fluxocaixa/dashboard.
// Corrige o gotcha do Node (03-spec §"Financeiro CRUD"): totais e pendências
// agora respeitam o escopo de tenant (via callbacks GORM + WithContext).
type DashboardResponse struct {
	TotalReceitas float64 `json:"totalReceitas"`
	TotalDespesas float64 `json:"totalDespesas"`
	Lucro         float64 `json:"lucro"`
	Pendencias    int64   `json:"pendencias"`
}
