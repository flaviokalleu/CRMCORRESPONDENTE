package models

import "time"

// RepasseProprietario espelha a tabela `repasse_proprietarios` (underscored).
// Núcleo financeiro do repasse PIX ao proprietário nos aluguéis recorrentes
// (ver 03-spec §"Fluxo de repasse ao proprietário"). ClienteAluguelID e
// CobrancaAluguelID referenciam tabelas do módulo de aluguéis (fora deste
// escopo) — mantidos como FKs simples (uint), sem struct relacionada aqui.
type RepasseProprietario struct {
	ID                          uint       `gorm:"primaryKey" json:"id"`
	ClienteAluguelID            uint       `gorm:"column:cliente_aluguel_id;index" json:"cliente_aluguel_id"`
	CobrancaAluguelID           uint       `gorm:"column:cobranca_aluguel_id;uniqueIndex" json:"cobranca_aluguel_id"`
	ValorAluguel                float64    `gorm:"column:valor_aluguel" json:"valor_aluguel"`                 // DECIMAL(10,2)
	TaxaAdministracaoPercentual float64    `gorm:"column:taxa_administracao_percentual" json:"taxa_administracao_percentual"` // DECIMAL(5,2)
	ValorTaxa                   float64    `gorm:"column:valor_taxa" json:"valor_taxa"`
	ValorRepasse                float64    `gorm:"column:valor_repasse" json:"valor_repasse"`
	CorretorPercentual          float64    `gorm:"column:corretor_percentual" json:"corretor_percentual"`
	ComissaoCorretor            float64    `gorm:"column:comissao_corretor" json:"comissao_corretor"`
	MesReferencia               string     `gorm:"column:mes_referencia;index" json:"mes_referencia"` // "YYYY-MM"
	Status                      string     `gorm:"column:status;default:PENDENTE" json:"status"`      // PENDENTE|REALIZADO
	DataRepasse                 *time.Time `gorm:"column:data_repasse" json:"data_repasse,omitempty"`
	Observacao                  string     `gorm:"column:observacao" json:"observacao,omitempty"`
	AsaasTransferID             *string    `gorm:"column:asaas_transfer_id" json:"asaas_transfer_id,omitempty"`
	// TransferStatus: PENDENTE|PROCESSANDO|REALIZADO|FALHOU|SEM_PIX
	TransferStatus string `gorm:"column:transfer_status;default:PENDENTE" json:"transfer_status"`
	TransferError  string `gorm:"column:transfer_error" json:"transfer_error,omitempty"`

	TenantID *uint `gorm:"column:tenant_id;index" json:"tenant_id,omitempty"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (RepasseProprietario) TableName() string { return "repasse_proprietarios" }

// Estados de status/transfer_status (ver 03-spec §"Fluxo de repasse").
const (
	RepasseStatusPendente  = "PENDENTE"
	RepasseStatusRealizado = "REALIZADO"

	RepasseTransferPendente   = "PENDENTE"
	RepasseTransferProcessando = "PROCESSANDO"
	RepasseTransferRealizado  = "REALIZADO"
	RepasseTransferFalhou     = "FALHOU"
	RepasseTransferSemPix     = "SEM_PIX"
)
