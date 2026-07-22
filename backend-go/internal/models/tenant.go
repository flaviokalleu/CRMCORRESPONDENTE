package models

import (
	"time"

	"gorm.io/datatypes"
)

// Tenant espelha a tabela `tenants`. É um modelo GLOBAL (isento de tenant scope).
// Limites/flags usam ponteiro para distinguir NULL (herda do plano) de 0/false.
// Ver 01-spec §3.3 e §6 (padrão Evoticket).
type Tenant struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	Nome               string         `gorm:"column:nome" json:"nome"`
	Slug               string         `gorm:"column:slug;uniqueIndex" json:"slug"`
	CNPJ               *string        `gorm:"column:cnpj;uniqueIndex" json:"cnpj,omitempty"`
	Email              string         `gorm:"column:email" json:"email"`
	Telefone           *string        `gorm:"column:telefone" json:"telefone,omitempty"`
	Logo               *string        `gorm:"column:logo" json:"logo,omitempty"`
	Ativo              bool           `gorm:"column:ativo;default:true" json:"ativo"`
	Configuracoes      datatypes.JSON `gorm:"column:configuracoes" json:"configuracoes"`
	DominioCustomizado *string        `gorm:"column:dominio_customizado;uniqueIndex" json:"dominio_customizado,omitempty"`
	Endereco           *string        `gorm:"column:endereco" json:"endereco,omitempty"`
	Cidade             *string        `gorm:"column:cidade" json:"cidade,omitempty"`
	Estado             *string        `gorm:"column:estado" json:"estado,omitempty"`
	CEP                *string        `gorm:"column:cep" json:"cep,omitempty"`

	// Módulos customizáveis
	UseCustomModules bool `gorm:"column:use_custom_modules;default:false" json:"use_custom_modules"`

	// Limites (override do plano; NULL=herda, 0=ilimitado)
	MaxClientes *int `gorm:"column:max_clientes" json:"max_clientes"`
	MaxUsuarios *int `gorm:"column:max_usuarios" json:"max_usuarios"`
	MaxImoveis  *int `gorm:"column:max_imoveis" json:"max_imoveis"`
	MaxAlugueis *int `gorm:"column:max_alugueis" json:"max_alugueis"`

	// Features (override quando use_custom_modules=true; NULL=herda)
	HasWhatsapp            *bool `gorm:"column:has_whatsapp" json:"has_whatsapp"`
	HasPagamentos          *bool `gorm:"column:has_pagamentos" json:"has_pagamentos"`
	HasAIAnalysis          *bool `gorm:"column:has_ai_analysis" json:"has_ai_analysis"`
	HasRelatoriosAvancados *bool `gorm:"column:has_relatorios_avancados" json:"has_relatorios_avancados"`
	HasMultiUsuarios       *bool `gorm:"column:has_multi_usuarios" json:"has_multi_usuarios"`
	HasAPIAccess           *bool `gorm:"column:has_api_access" json:"has_api_access"`
	HasSuportePrioritario  *bool `gorm:"column:has_suporte_prioritario" json:"has_suporte_prioritario"`
	HasDominioCustomizado  *bool `gorm:"column:has_dominio_customizado" json:"has_dominio_customizado"`

	// Storage
	MaxStorageMB     *int  `gorm:"column:max_storage_mb" json:"max_storage_mb"`
	MaxFileSizeMB    *int  `gorm:"column:max_file_size_mb" json:"max_file_size_mb"`
	StorageUsedBytes int64 `gorm:"column:storage_used_bytes;default:0" json:"storage_used_bytes"`

	// Integração Asaas (por tenant)
	AsaasAPIKey       *string `gorm:"column:asaas_api_key" json:"-"` // segredo — nunca serializar
	AsaasWebhookToken *string `gorm:"column:asaas_webhook_token" json:"-"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (Tenant) TableName() string { return "tenants" }
