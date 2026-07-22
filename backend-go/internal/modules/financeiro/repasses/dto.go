package repasses

import "crmimob/internal/models"

// ListQuery — GET /api/repasses.
type ListQuery struct {
	Mes            string `form:"mes"`
	Status         string `form:"status"`
	TransferStatus string `form:"transfer_status"`
}

// GerarRequest — POST /api/repasses/gerar.
type GerarRequest struct {
	Mes        string `json:"mes" binding:"required"` // "YYYY-MM"
	EnviarPix  bool   `json:"enviar_pix"`
}

// GerarResponse — resposta da geração mensal de repasses.
type GerarResponse struct {
	Message            string                       `json:"message"`
	TransferenciasPix  int                          `json:"transferencias_pix"`
	Repasses           []models.RepasseProprietario `json:"repasses"`
	Erros              []string                     `json:"erros,omitempty"`
}

// ConfirmarRequest — PUT /api/repasses/:id/confirmar.
type ConfirmarRequest struct {
	Observacao string `json:"observacao"`
}

// ResumoQuery — GET /api/repasses/resumo.
type ResumoQuery struct {
	Mes string `form:"mes" binding:"required"`
}

// ResumoResponse — somatórios agregados do mês.
type ResumoResponse struct {
	Mes               string                        `json:"mes"`
	TotalAluguel      float64                       `json:"total_aluguel"`
	TotalTaxa         float64                       `json:"total_taxa"`
	TotalRepasse      float64                       `json:"total_repasse"`
	TotalComissao     float64                       `json:"total_comissao"`
	Repasses          []models.RepasseProprietario `json:"repasses"`
}

// MultaJurosItem — item de resposta de /clientealuguel/:id/multa-juros.
type MultaJurosItem struct {
	CobrancaID      uint    `json:"cobranca_id"`
	Valor           float64 `json:"valor"`
	DiasAtraso      int     `json:"dias_atraso"`
	PercentualMulta float64 `json:"percentual_multa"`
	PercentualJuros float64 `json:"percentual_juros_mora"`
	ValorMulta      float64 `json:"valor_multa"`
	ValorJuros      float64 `json:"valor_juros"`
	ValorTotal      float64 `json:"valor_total"`
}
