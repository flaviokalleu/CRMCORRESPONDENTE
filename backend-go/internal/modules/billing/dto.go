package billing

import (
	"time"

	"gorm.io/datatypes"

	"crmimob/internal/models"
)

// PlanRequest é o body de criação/edição de plano (rota super-admin).
type PlanRequest struct {
	Nome                   string         `json:"nome" binding:"required"`
	Slug                   string         `json:"slug" binding:"required"`
	Descricao              *string        `json:"descricao"`
	PrecoMensal            float64        `json:"preco_mensal"`
	PrecoAnual             float64        `json:"preco_anual"`
	MaxClientes            int            `json:"max_clientes"`
	MaxUsuarios            int            `json:"max_usuarios"`
	MaxImoveis             int            `json:"max_imoveis"`
	MaxAlugueis            int            `json:"max_alugueis"`
	HasWhatsapp            bool           `json:"has_whatsapp"`
	HasPagamentos          bool           `json:"has_pagamentos"`
	HasAIAnalysis          bool           `json:"has_ai_analysis"`
	HasRelatoriosAvancados bool           `json:"has_relatorios_avancados"`
	HasMultiUsuarios       bool           `json:"has_multi_usuarios"`
	HasAPIAccess           bool           `json:"has_api_access"`
	HasSuportePrioritario  bool           `json:"has_suporte_prioritario"`
	HasDominioCustomizado  bool           `json:"has_dominio_customizado"`
	MaxStorageMB           int            `json:"max_storage_mb"`
	MaxFileSizeMB          int            `json:"max_file_size_mb"`
	FeaturesExtras         datatypes.JSON `json:"features_extras"`
	Ativo                  *bool          `json:"ativo"`
	Ordem                  int            `json:"ordem"`
	TrialDias              int            `json:"trial_dias"`
}

func (r PlanRequest) ToModel() *models.Plan {
	p := &models.Plan{
		Nome: r.Nome, Slug: r.Slug, Descricao: r.Descricao,
		PrecoMensal: r.PrecoMensal, PrecoAnual: r.PrecoAnual,
		MaxClientes: r.MaxClientes, MaxUsuarios: r.MaxUsuarios, MaxImoveis: r.MaxImoveis, MaxAlugueis: r.MaxAlugueis,
		HasWhatsapp: r.HasWhatsapp, HasPagamentos: r.HasPagamentos, HasAIAnalysis: r.HasAIAnalysis,
		HasRelatoriosAvancados: r.HasRelatoriosAvancados, HasMultiUsuarios: r.HasMultiUsuarios,
		HasAPIAccess: r.HasAPIAccess, HasSuportePrioritario: r.HasSuportePrioritario,
		HasDominioCustomizado: r.HasDominioCustomizado,
		MaxStorageMB:          r.MaxStorageMB, MaxFileSizeMB: r.MaxFileSizeMB,
		FeaturesExtras: r.FeaturesExtras, Ordem: r.Ordem, TrialDias: r.TrialDias,
	}
	if r.Ativo != nil {
		p.Ativo = *r.Ativo
	} else {
		p.Ativo = true
	}
	return p
}

// SubscriptionResponse enriquece a subscription com tenant/plan resumidos.
type SubscriptionResponse struct {
	ID                    uint       `json:"id"`
	TenantID              uint       `json:"tenant_id"`
	PlanID                uint       `json:"plan_id"`
	Status                string     `json:"status"`
	Ciclo                 string     `json:"ciclo"`
	DataInicio            time.Time  `json:"data_inicio"`
	DataFim               *time.Time `json:"data_fim,omitempty"`
	DataFimTrial          *time.Time `json:"data_fim_trial,omitempty"`
	Valor                 float64    `json:"valor"`
	DiasRestantes         int        `json:"dias_restantes"`
	Tenant                *TenantMini `json:"tenant,omitempty"`
	Plan                  *models.Plan `json:"plan,omitempty"`
}

type TenantMini struct {
	ID   uint   `json:"id"`
	Nome string `json:"nome"`
	Slug string `json:"slug"`
}

func ToSubscriptionResponse(s *models.Subscription) SubscriptionResponse {
	return SubscriptionResponse{
		ID: s.ID, TenantID: s.TenantID, PlanID: s.PlanID, Status: s.Status, Ciclo: s.Ciclo,
		DataInicio: s.DataInicio, DataFim: s.DataFim, DataFimTrial: s.DataFimTrial,
		Valor: s.Valor, DiasRestantes: s.DaysRemaining(),
	}
}

// ChangePlanRequest — PUT /subscriptions/:tenantId/change-plan.
type ChangePlanRequest struct {
	PlanID uint   `json:"plan_id" binding:"required"`
	Ciclo  string `json:"ciclo"` // mensal|anual, default mensal
}

// StorageInfo é a resposta de /api/storage-usage.
type StorageInfo struct {
	UsadoMB          float64 `json:"usado_mb"`
	UsadoBytes       int64   `json:"usado_bytes"`
	LimiteMB         int     `json:"limite_mb"`
	LimiteArquivoMB  int     `json:"limite_arquivo_mb"`
	Percentual       float64 `json:"percentual"`
	Ilimitado        bool    `json:"ilimitado"`
	DisponivelMB     float64 `json:"disponivel_mb"`
}
