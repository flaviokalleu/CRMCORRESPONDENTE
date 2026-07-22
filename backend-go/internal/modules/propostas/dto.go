package propostas

import "time"

// CreateRequest é o body de POST /api/propostas.
type CreateRequest struct {
	ClienteID      uint       `json:"cliente_id" binding:"required"`
	ImovelID       uint       `json:"imovel_id" binding:"required"`
	ValorOfertado  float64    `json:"valor_ofertado" binding:"required,gt=0"`
	FormaPagamento string     `json:"forma_pagamento,omitempty"`
	DataValidade   *time.Time `json:"data_validade,omitempty"`
	Condicoes      *string    `json:"condicoes,omitempty"`
	Observacoes    *string    `json:"observacoes,omitempty"`
}

// UpdateRequest é o body de PUT /api/propostas/:id (negociação, parcial).
type UpdateRequest struct {
	Status              *string  `json:"status,omitempty"`
	ValorContraProposta *float64 `json:"valor_contra_proposta,omitempty"`
	ValorAceito         *float64 `json:"valor_aceito,omitempty"`
	MotivoRecusa        *string  `json:"motivo_recusa,omitempty"`
	Observacoes         *string  `json:"observacoes,omitempty"`
	Condicoes           *string  `json:"condicoes,omitempty"`
}

// ListFilters replica os filtros de GET /api/propostas.
type ListFilters struct {
	Status string
	Page   int
	Limit  int
}
