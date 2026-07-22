package superadmin

import (
	"crmimob/internal/models"
	"crmimob/internal/modules/users"
)

// TenantStats replica os counts que o painel super-admin mostra por tenant
// (clientes/usuarios/imoveis/alugueis). Contamos via db.Table(...) (raw table
// name) porque os models de Cliente/Imovel/Aluguel pertencem a outros
// clusters de migração e podem não existir neste pacote. Ver 01-spec §2.3.
type TenantStats struct {
	Clientes int64 `json:"clientes"`
	Usuarios int64 `json:"usuarios"`
	Imoveis  int64 `json:"imoveis"`
	Alugueis int64 `json:"alugueis"`
}

type TenantListItem struct {
	models.Tenant
	Stats            TenantStats          `json:"stats"`
	LatestSubscription *models.Subscription `json:"latest_subscription,omitempty"`
	Plan             *models.Plan         `json:"plan,omitempty"`
}

type TenantDetail struct {
	models.Tenant
	Stats         TenantStats            `json:"stats"`
	Subscriptions []models.Subscription  `json:"subscriptions"`
	AdminUser     *users.Response        `json:"admin_user,omitempty"`
}

type ListTenantsResponse struct {
	Tenants    []TenantListItem `json:"tenants"`
	Total      int64            `json:"total"`
	Page       int              `json:"page"`
	TotalPages int              `json:"totalPages"`
}

// CreateTenantRequest — POST /api/super-admin/tenants.
type CreateTenantRequest struct {
	Nome            string  `json:"nome" binding:"required"`
	Slug            string  `json:"slug" binding:"required"`
	CNPJ            *string `json:"cnpj"`
	Email           string  `json:"email" binding:"required,email"`
	Telefone        *string `json:"telefone"`
	PlanID          *uint   `json:"plan_id"`
	AdminFirstName  string  `json:"admin_first_name" binding:"required"`
	AdminLastName   string  `json:"admin_last_name"`
	AdminEmail      string  `json:"admin_email" binding:"required,email"`
	AdminPassword   string  `json:"admin_password" binding:"required,min=6"`
	AdminTelefone   string  `json:"admin_telefone"`
}

// UpdateTenantRequest — PUT /api/super-admin/tenants/:id.
// ALLOWED_UPDATE_FIELDS (dados+limites+storage+módulos), ver 01-spec §2.3.
type UpdateTenantRequest struct {
	Nome     *string `json:"nome"`
	CNPJ     *string `json:"cnpj"`
	Email    *string `json:"email"`
	Telefone *string `json:"telefone"`
	Ativo    *bool   `json:"ativo"`
	Endereco *string `json:"endereco"`
	Cidade   *string `json:"cidade"`
	Estado   *string `json:"estado"`
	CEP      *string `json:"cep"`

	UseCustomModules *bool `json:"use_custom_modules"`

	MaxClientes *int `json:"max_clientes"`
	MaxUsuarios *int `json:"max_usuarios"`
	MaxImoveis  *int `json:"max_imoveis"`
	MaxAlugueis *int `json:"max_alugueis"`

	HasWhatsapp            *bool `json:"has_whatsapp"`
	HasPagamentos          *bool `json:"has_pagamentos"`
	HasAIAnalysis          *bool `json:"has_ai_analysis"`
	HasRelatoriosAvancados *bool `json:"has_relatorios_avancados"`
	HasMultiUsuarios       *bool `json:"has_multi_usuarios"`
	HasAPIAccess           *bool `json:"has_api_access"`
	HasSuportePrioritario  *bool `json:"has_suporte_prioritario"`
	HasDominioCustomizado  *bool `json:"has_dominio_customizado"`

	MaxStorageMB  *int `json:"max_storage_mb"`
	MaxFileSizeMB *int `json:"max_file_size_mb"`

	// Admin (opcional — cria/atualiza o admin do tenant).
	AdminFirstName *string `json:"admin_first_name"`
	AdminLastName  *string `json:"admin_last_name"`
	AdminEmail     *string `json:"admin_email"`
	AdminPassword  *string `json:"admin_password"`
	AdminTelefone  *string `json:"admin_telefone"`
}

// ModuleValue traz a origem do valor efetivo ('tenant'|'plan'|'none') — ver
// 01-spec §2.3 (GET /tenants/:id/modules).
type ModuleValue struct {
	Value  any    `json:"value"`
	Source string `json:"source"`
}

type ModulesResponse struct {
	TenantID         uint                   `json:"tenant_id"`
	UseCustomModules bool                   `json:"use_custom_modules"`
	Plan             *models.Plan           `json:"plan,omitempty"`
	Modules          map[string]ModuleValue `json:"modules"`
	Limits           map[string]ModuleValue `json:"limits"`
	Storage          map[string]ModuleValue `json:"storage"`
}

// MetricsResponse — GET /api/super-admin/metrics.
type MetricsResponse struct {
	Tenants    TenantsMetrics    `json:"tenants"`
	Financeiro FinanceiroMetrics `json:"financeiro"`
	Planos     []PlanoMetric     `json:"planos"`
	Recursos   RecursosMetrics   `json:"recursos"`
}

type TenantsMetrics struct {
	Total   int64 `json:"total"`
	Ativos  int64 `json:"ativos"`
	Inativos int64 `json:"inativos"`
}

type FinanceiroMetrics struct {
	MRR               float64 `json:"mrr"`
	ARR               float64 `json:"arr"`
	AssinaturasAtivas int64   `json:"assinaturas_ativas"`
	ChurnMes          int64   `json:"churn_mes"`
}

type PlanoMetric struct {
	PlanID       uint   `json:"plan_id"`
	Nome         string `json:"nome"`
	Assinaturas  int64  `json:"assinaturas"`
}

type RecursosMetrics struct {
	TotalUsuarios int64 `json:"total_usuarios"`
	TotalClientes int64 `json:"total_clientes"`
	TotalImoveis  int64 `json:"total_imoveis"`
}

type ImpersonateResponse struct {
	Message   string       `json:"message"`
	Tenant    models.Tenant `json:"tenant"`
	Admin     *users.Response `json:"admin,omitempty"`
	Instrucao string       `json:"instrucao"`
}
