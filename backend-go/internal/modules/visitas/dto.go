package visitas

import "time"

// CreateRequest é o body de POST /api/visitas.
type CreateRequest struct {
	ClienteID   uint      `json:"cliente_id" binding:"required"`
	ImovelID    uint      `json:"imovel_id" binding:"required"`
	CorretorID  *uint     `json:"corretor_id,omitempty"`
	DataVisita  time.Time `json:"data_visita" binding:"required"`
	Observacoes *string   `json:"observacoes,omitempty"`
}

// UpdateRequest é o body de PUT /api/visitas/:id (atualização parcial).
type UpdateRequest struct {
	DataVisita      *time.Time `json:"data_visita,omitempty"`
	Status          *string    `json:"status,omitempty"`
	Observacoes     *string    `json:"observacoes,omitempty"`
	FeedbackCliente *string    `json:"feedback_cliente,omitempty"`
	NotaAvaliacao   *int       `json:"nota_avaliacao,omitempty"` // 1-5
}

// ListFilters replica os filtros dinâmicos de GET /api/visitas.
type ListFilters struct {
	Status      string
	CorretorID  *uint
	DataInicio  *time.Time
	DataFim     *time.Time
	Page        int
	Limit       int
}
