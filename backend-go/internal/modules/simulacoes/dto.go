package simulacoes

// CalcularRequest é o body de POST /api/simulacoes/calcular e POST /api/simulacoes.
type CalcularRequest struct {
	ClienteID      *uint   `json:"cliente_id,omitempty"`
	ValorImovel    float64 `json:"valor_imovel" binding:"required,gt=0"`
	ValorEntrada   float64 `json:"valor_entrada"`
	PrazoMeses     int     `json:"prazo_meses" binding:"required,gt=0"`
	TaxaJurosAnual float64 `json:"taxa_juros_anual" binding:"required,gt=0"`
	Sistema        string  `json:"sistema,omitempty"`
	Observacoes    *string `json:"observacoes,omitempty"`
}
