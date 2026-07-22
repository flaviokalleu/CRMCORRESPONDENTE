package contratos

import "time"

// VincularRequest é o corpo de POST /api/contratos/vincular e
// PUT /api/contratos/:id/atualizar.
type VincularRequest struct {
	ClienteAluguelID uint  `json:"cliente_aluguel_id" binding:"required"`
	AluguelID        *uint `json:"aluguel_id"`
	ProprietarioID   *uint `json:"proprietario_id"`
}

// ContratoTextoRequest é o corpo de POST /clientealuguel/:id/contrato.
type ContratoTextoRequest struct {
	TextoContrato string `json:"texto_contrato" binding:"required"`
}

// ReajusteAplicarRequest é o corpo de POST /clientealuguel/:id/reajuste/aplicar.
type ReajusteAplicarRequest struct {
	Indice float64 `json:"indice"`
}

// ReajusteResultado é a resposta de GET .../reajuste e POST .../reajuste/aplicar.
type ReajusteResultado struct {
	ValorAnterior  float64   `json:"valor_anterior"`
	ValorNovo      float64   `json:"valor_novo"`
	IndiceAplicado float64   `json:"indice_aplicado"`
	DataAniversario *time.Time `json:"data_aniversario,omitempty"`
	DiasRestantes  int       `json:"dias_restantes,omitempty"`
}

// ContratoDocumento é uma entrada do JSONB `contrato_documentos`.
type ContratoDocumento struct {
	ID         string    `json:"id"`
	Nome       string    `json:"nome"`
	Tipo       string    `json:"tipo"`
	Path       string    `json:"path"`
	DataUpload time.Time `json:"data_upload"`
}

// OpcoesResponse é a resposta de GET /api/contratos/opcoes.
type OpcoesResponse struct {
	Imoveis       any `json:"imoveis"`
	Proprietarios any `json:"proprietarios"`
	Inquilinos    any `json:"inquilinos"`
}
