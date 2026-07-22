package models

import "time"

// Simulacao espelha a tabela `simulacoes` — simulação de financiamento imobiliário
// (SAC ou PRICE) associada opcionalmente a um Cliente. Ver
// docs/migration/06-dashboards-vendas-config.md §"Simulações".
//
// GOTCHA (§ tabelas/colunas): tabela usa `tenant_id` nullable no Node original,
// mas TODA leitura deve filtrar por tenant no Go (gotcha §2) — o campo é
// preenchido sempre na criação a partir do Scope resolvido.
type Simulacao struct {
	ID uint `gorm:"primaryKey" json:"id"`

	ClienteID *uint `gorm:"column:cliente_id;index" json:"cliente_id,omitempty"`
	UserID    uint  `gorm:"column:user_id;index" json:"user_id"`
	TenantID  *uint `gorm:"column:tenant_id;index" json:"tenant_id,omitempty"`

	ValorImovel     float64 `gorm:"column:valor_imovel" json:"valor_imovel"`
	ValorEntrada    float64 `gorm:"column:valor_entrada" json:"valor_entrada"`
	ValorFinanciado float64 `gorm:"column:valor_financiado" json:"valor_financiado"` // DECIMAL(12,2)

	PrazoMeses      int     `gorm:"column:prazo_meses" json:"prazo_meses"`
	TaxaJurosAnual  float64 `gorm:"column:taxa_juros_anual" json:"taxa_juros_anual"` // DECIMAL(5,2)
	Sistema         string  `gorm:"column:sistema;default:SAC" json:"sistema"`       // SAC|PRICE

	PrimeiraParcela float64 `gorm:"column:primeira_parcela" json:"primeira_parcela"`
	UltimaParcela   float64 `gorm:"column:ultima_parcela" json:"ultima_parcela"`
	TotalPago       float64 `gorm:"column:total_pago" json:"total_pago"`         // DECIMAL(14,2)
	TotalJuros      float64 `gorm:"column:total_juros" json:"total_juros"`       // DECIMAL(14,2)
	RendaMinima     float64 `gorm:"column:renda_minima" json:"renda_minima"`

	Observacoes *string `gorm:"column:observacoes" json:"observacoes,omitempty"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`

	// Associações (Preload sob demanda — não persistidas).
	Cliente *Cliente `gorm:"foreignKey:ClienteID;references:ID" json:"cliente,omitempty"`
	User    *User    `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
}

func (Simulacao) TableName() string { return "simulacoes" }

// Sistemas de amortização suportados.
const (
	SimulacaoSistemaSAC   = "SAC"
	SimulacaoSistemaPRICE = "PRICE"
)

// IsSistemaValido confere se o valor pertence ao enum sistema (SAC/PRICE).
func IsSistemaValido(sistema string) bool {
	return sistema == SimulacaoSistemaSAC || sistema == SimulacaoSistemaPRICE
}
