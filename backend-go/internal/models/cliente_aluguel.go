package models

import (
	"time"

	"gorm.io/datatypes"
)

// ClienteAluguel espelha a tabela `cliente_aluguels` (o "inquilino" — distinto
// de `Cliente`, que é o comprador do CRM de vendas). Ver 04-spec §Modelos.
//
// Tabela larga: no Node várias colunas eram verificadas via `describeTable`
// em runtime ("schema-safe") para tolerar bancos sem as colunas mais novas.
// Em Go, com migrations versionadas, o schema completo é garantido — a
// lógica condicional foi removida (04-spec Gotcha 6).
type ClienteAluguel struct {
	ID uint `gorm:"primaryKey" json:"id"`

	// Identificação
	Nome     string  `gorm:"column:nome" json:"nome"`
	CPF      *string `gorm:"column:cpf" json:"cpf,omitempty"`
	Email    *string `gorm:"column:email" json:"email,omitempty"`
	Telefone *string `gorm:"column:telefone" json:"telefone,omitempty"`

	// Financeiro
	ValorAluguel        float64        `gorm:"column:valor_aluguel;type:decimal(10,2)" json:"valor_aluguel"`
	DiaVencimento       int            `gorm:"column:dia_vencimento" json:"dia_vencimento"`
	Pago                bool           `gorm:"column:pago;default:false" json:"pago"`
	HistoricoPagamentos datatypes.JSON `gorm:"column:historico_pagamentos" json:"historico_pagamentos,omitempty"`
	PercentualMulta     float64        `gorm:"column:percentual_multa;type:decimal(5,2);default:2.00" json:"percentual_multa"`
	PercentualJurosMora float64        `gorm:"column:percentual_juros_mora;type:decimal(5,2);default:1.00" json:"percentual_juros_mora"`

	// Asaas
	AsaasCustomerID           *string `gorm:"column:asaas_customer_id" json:"asaas_customer_id,omitempty"`
	AsaasSubscriptionID       *string `gorm:"column:asaas_subscription_id" json:"asaas_subscription_id,omitempty"`
	AsaasSubscriptionStatus   *string `gorm:"column:asaas_subscription_status" json:"asaas_subscription_status,omitempty"`

	// Contrato
	AluguelID           *uint          `gorm:"column:aluguel_id" json:"aluguel_id,omitempty"`
	DataInicioContrato  *time.Time     `gorm:"column:data_inicio_contrato;type:date" json:"data_inicio_contrato,omitempty"`
	DataFimContrato     *time.Time     `gorm:"column:data_fim_contrato;type:date" json:"data_fim_contrato,omitempty"`
	IndiceReajuste      string         `gorm:"column:indice_reajuste;default:IGPM" json:"indice_reajuste"`
	ContratoPath        *string        `gorm:"column:contrato_path" json:"contrato_path,omitempty"`
	ContratoDocumentos  datatypes.JSON `gorm:"column:contrato_documentos" json:"contrato_documentos,omitempty"`

	// Score
	ScoreInquilino     *int           `gorm:"column:score_inquilino" json:"score_inquilino,omitempty"`
	ScoreDetalhes      datatypes.JSON `gorm:"column:score_detalhes" json:"score_detalhes,omitempty"`
	ScoreAtualizadoEm  *time.Time     `gorm:"column:score_atualizado_em" json:"score_atualizado_em,omitempty"`

	// Proprietário
	ProprietarioNome     *string `gorm:"column:proprietario_nome" json:"proprietario_nome,omitempty"`
	ProprietarioTelefone *string `gorm:"column:proprietario_telefone" json:"proprietario_telefone,omitempty"`
	ProprietarioPix      *string `gorm:"column:proprietario_pix" json:"proprietario_pix,omitempty"`
	ProprietarioID       *uint   `gorm:"column:proprietario_id" json:"proprietario_id,omitempty"`
	TaxaAdministracao    float64 `gorm:"column:taxa_administracao;type:decimal(5,2);default:10.00" json:"taxa_administracao"`

	// Corretor
	CorretorPercentual float64 `gorm:"column:corretor_percentual;type:decimal(5,2);default:0" json:"corretor_percentual"`
	CorretorNome       *string `gorm:"column:corretor_nome" json:"corretor_nome,omitempty"`
	CorretorPix        *string `gorm:"column:corretor_pix" json:"corretor_pix,omitempty"`

	// Pessoais
	DataNascimento   *time.Time `gorm:"column:data_nascimento;type:date" json:"data_nascimento,omitempty"`
	CidadeNascimento *string    `gorm:"column:cidade_nascimento" json:"cidade_nascimento,omitempty"`

	// Fiador
	TemFiador               bool       `gorm:"column:tem_fiador;default:false" json:"tem_fiador"`
	FiadorNome              *string    `gorm:"column:fiador_nome" json:"fiador_nome,omitempty"`
	FiadorTelefone          *string    `gorm:"column:fiador_telefone" json:"fiador_telefone,omitempty"`
	FiadorEmail             *string    `gorm:"column:fiador_email" json:"fiador_email,omitempty"`
	FiadorCPF               *string    `gorm:"column:fiador_cpf" json:"fiador_cpf,omitempty"`
	FiadorDataNascimento    *time.Time `gorm:"column:fiador_data_nascimento;type:date" json:"fiador_data_nascimento,omitempty"`
	FiadorCidadeNascimento  *string    `gorm:"column:fiador_cidade_nascimento" json:"fiador_cidade_nascimento,omitempty"`

	// Documentos
	DocumentoIDPath        *string `gorm:"column:documento_id_path" json:"documento_id_path,omitempty"`
	FiadorDocumentoIDPath  *string `gorm:"column:fiador_documento_id_path" json:"fiador_documento_id_path,omitempty"`

	// Multitenancy
	TenantID *uint `gorm:"column:tenant_id" json:"tenant_id,omitempty"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (ClienteAluguel) TableName() string { return "cliente_aluguels" }
