package models

import (
	"time"

	"gorm.io/datatypes"
)

// Plan espelha a tabela `plans` — modelo GLOBAL. Ver 01-spec §3.4.
// TODO(fase-3): migrar preços de float64 para tipo decimal (shopspring/decimal)
// quando o billing SaaS via Asaas for implementado.
type Plan struct {
	ID          uint    `gorm:"primaryKey" json:"id"`
	Nome        string  `gorm:"column:nome;uniqueIndex" json:"nome"`
	Slug        string  `gorm:"column:slug;uniqueIndex" json:"slug"`
	Descricao   *string `gorm:"column:descricao" json:"descricao,omitempty"`
	PrecoMensal float64 `gorm:"column:preco_mensal" json:"preco_mensal"`
	PrecoAnual  float64 `gorm:"column:preco_anual" json:"preco_anual"`

	MaxClientes int `gorm:"column:max_clientes;default:50" json:"max_clientes"`
	MaxUsuarios int `gorm:"column:max_usuarios;default:2" json:"max_usuarios"`
	MaxImoveis  int `gorm:"column:max_imoveis;default:20" json:"max_imoveis"`
	MaxAlugueis int `gorm:"column:max_alugueis;default:10" json:"max_alugueis"`

	HasWhatsapp            bool `gorm:"column:has_whatsapp;default:false" json:"has_whatsapp"`
	HasPagamentos          bool `gorm:"column:has_pagamentos;default:false" json:"has_pagamentos"`
	HasAIAnalysis          bool `gorm:"column:has_ai_analysis;default:false" json:"has_ai_analysis"`
	HasRelatoriosAvancados bool `gorm:"column:has_relatorios_avancados;default:false" json:"has_relatorios_avancados"`
	HasMultiUsuarios       bool `gorm:"column:has_multi_usuarios;default:false" json:"has_multi_usuarios"`
	HasAPIAccess           bool `gorm:"column:has_api_access;default:false" json:"has_api_access"`
	HasSuportePrioritario  bool `gorm:"column:has_suporte_prioritario;default:false" json:"has_suporte_prioritario"`
	HasDominioCustomizado  bool `gorm:"column:has_dominio_customizado;default:false" json:"has_dominio_customizado"`

	MaxStorageMB   int            `gorm:"column:max_storage_mb;default:500" json:"max_storage_mb"`
	MaxFileSizeMB  int            `gorm:"column:max_file_size_mb;default:10" json:"max_file_size_mb"`
	FeaturesExtras datatypes.JSON `gorm:"column:features_extras" json:"features_extras"`
	Ativo          bool           `gorm:"column:ativo;default:true" json:"ativo"`
	Ordem          int            `gorm:"column:ordem;default:0" json:"ordem"`
	TrialDias      int            `gorm:"column:trial_dias;default:0" json:"trial_dias"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Plan) TableName() string { return "plans" }
