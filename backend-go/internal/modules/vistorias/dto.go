package vistorias

import "crmimob/internal/models"

// CreateRequest é o corpo de POST /api/vistorias.
type CreateRequest struct {
	ClienteAluguelID  uint                     `json:"cliente_aluguel_id" binding:"required"`
	AluguelID         *uint                    `json:"aluguel_id"`
	Tipo              string                   `json:"tipo"` // entrada/saida (default entrada)
	DataVistoria      string                   `json:"data_vistoria" binding:"required"`
	ObservacoesGerais string                   `json:"observacoes_gerais"`
	Checklist         []models.ChecklistItem   `json:"checklist"`
}

// UpdateRequest é o corpo de PUT /api/vistorias/:id.
type UpdateRequest struct {
	Checklist         []models.ChecklistItem `json:"checklist"`
	ObservacoesGerais string                 `json:"observacoes_gerais"`
	Status            string                 `json:"status"`
}

// FotoRequest é o corpo (campos não-arquivo) de POST /api/vistorias/:id/fotos.
type FotoRequest struct {
	Descricao string `form:"descricao"`
	Comodo    string `form:"comodo"`
}

// Comparativo é a resposta de GET /api/vistorias/:clienteId/comparativo.
type Comparativo struct {
	Entrada *models.VistoriaAluguel `json:"entrada"`
	Saida   *models.VistoriaAluguel `json:"saida"`
}
