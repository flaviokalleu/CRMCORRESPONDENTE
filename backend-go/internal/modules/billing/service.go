package billing

import (
	"context"
	"errors"
	"time"

	"crmimob/internal/models"
)

var ErrPlanNotFound = errors.New("plano não encontrado")

// PlanResolver implementa o padrão "Evoticket" de resolução de features/limites
// (ver 01-spec §6.1). Não depende de banco — recebe tenant/plan já carregados.
type PlanResolver struct{}

func NewPlanResolver() *PlanResolver { return &PlanResolver{} }

// IsFeatureEnabled: se tenant.use_custom_modules==true E o override do tenant
// não é nil, usa o valor do tenant; senão usa o valor (bool simples) do plano.
func (PlanResolver) IsFeatureEnabled(t *models.Tenant, p *models.Plan, feature string) bool {
	if t != nil && t.UseCustomModules {
		if override := tenantFeatureOverride(t, feature); override != nil {
			return *override
		}
	}
	if p == nil {
		return false
	}
	return planFeatureValue(p, feature)
}

func tenantFeatureOverride(t *models.Tenant, feature string) *bool {
	switch feature {
	case "has_whatsapp":
		return t.HasWhatsapp
	case "has_pagamentos":
		return t.HasPagamentos
	case "has_ai_analysis":
		return t.HasAIAnalysis
	case "has_relatorios_avancados":
		return t.HasRelatoriosAvancados
	case "has_multi_usuarios":
		return t.HasMultiUsuarios
	case "has_api_access":
		return t.HasAPIAccess
	case "has_suporte_prioritario":
		return t.HasSuportePrioritario
	case "has_dominio_customizado":
		return t.HasDominioCustomizado
	default:
		return nil
	}
}

func planFeatureValue(p *models.Plan, feature string) bool {
	switch feature {
	case "has_whatsapp":
		return p.HasWhatsapp
	case "has_pagamentos":
		return p.HasPagamentos
	case "has_ai_analysis":
		return p.HasAIAnalysis
	case "has_relatorios_avancados":
		return p.HasRelatoriosAvancados
	case "has_multi_usuarios":
		return p.HasMultiUsuarios
	case "has_api_access":
		return p.HasAPIAccess
	case "has_suporte_prioritario":
		return p.HasSuportePrioritario
	case "has_dominio_customizado":
		return p.HasDominioCustomizado
	default:
		return false
	}
}

// EffectiveLimit: limite do tenant sempre vence se definido (≠ nil),
// independente de use_custom_modules; senão usa o do plano. 0 = ilimitado.
// CRÍTICO (ver 01-spec §6.1/§6.4): usar *int para distinguir NULL (herda) de 0 (ilimitado).
func (PlanResolver) EffectiveLimit(t *models.Tenant, p *models.Plan, field string) int {
	if t != nil {
		if override := tenantLimitOverride(t, field); override != nil {
			return *override
		}
	}
	if p == nil {
		return 0
	}
	return planLimitValue(p, field)
}

func tenantLimitOverride(t *models.Tenant, field string) *int {
	switch field {
	case "clientes":
		return t.MaxClientes
	case "usuarios":
		return t.MaxUsuarios
	case "imoveis":
		return t.MaxImoveis
	case "alugueis":
		return t.MaxAlugueis
	case "storage_mb":
		return t.MaxStorageMB
	case "file_size_mb":
		return t.MaxFileSizeMB
	default:
		return nil
	}
}

func planLimitValue(p *models.Plan, field string) int {
	switch field {
	case "clientes":
		return p.MaxClientes
	case "usuarios":
		return p.MaxUsuarios
	case "imoveis":
		return p.MaxImoveis
	case "alugueis":
		return p.MaxAlugueis
	case "storage_mb":
		return p.MaxStorageMB
	case "file_size_mb":
		return p.MaxFileSizeMB
	default:
		return 0
	}
}

// ---- Service (plans/subscriptions CRUD, usado pelos handlers) ----

type Service struct {
	repo     *Repository
	resolver *PlanResolver
}

func NewService(repo *Repository) *Service { return &Service{repo: repo, resolver: NewPlanResolver()} }

func (s *Service) Resolver() *PlanResolver { return s.resolver }

func (s *Service) ListPlans(ctx context.Context, onlyActive bool) ([]models.Plan, error) {
	return s.repo.ListPlans(ctx, onlyActive)
}

func (s *Service) GetPlan(ctx context.Context, id uint) (*models.Plan, error) {
	return s.repo.GetPlanByID(ctx, id)
}

func (s *Service) GetPlanBySlug(ctx context.Context, slug string) (*models.Plan, error) {
	return s.repo.GetPlanBySlug(ctx, slug)
}

func (s *Service) CreatePlan(ctx context.Context, req PlanRequest) (*models.Plan, error) {
	p := req.ToModel()
	ativo := p.Ativo // o INSERT devolve o default do banco em p.Ativo
	if err := s.repo.CreatePlan(ctx, p); err != nil {
		return nil, err
	}
	// O GORM troca valor zero pelo `default` da tag no INSERT: "0 = sem
	// limite" virava 50 clientes / 2 usuários / 20 imóveis / 10 aluguéis e
	// um plano criado fora da vitrine (ativo=false) nascia na vitrine.
	// Regrava esses campos exatamente como vieram da tela.
	if err := s.repo.UpdatePlan(ctx, p.ID, map[string]any{
		"max_clientes": req.MaxClientes, "max_usuarios": req.MaxUsuarios,
		"max_imoveis": req.MaxImoveis, "max_alugueis": req.MaxAlugueis,
		"max_storage_mb": req.MaxStorageMB, "max_file_size_mb": req.MaxFileSizeMB,
		"ativo": ativo, "ordem": req.Ordem, "trial_dias": req.TrialDias,
	}); err != nil {
		return nil, err
	}
	return s.repo.GetPlanByID(ctx, p.ID)
}

func (s *Service) UpdatePlan(ctx context.Context, id uint, req PlanRequest) (*models.Plan, error) {
	updates := map[string]any{
		"nome": req.Nome, "slug": req.Slug, "descricao": req.Descricao,
		"preco_mensal": req.PrecoMensal, "preco_anual": req.PrecoAnual,
		"max_clientes": req.MaxClientes, "max_usuarios": req.MaxUsuarios,
		"max_imoveis": req.MaxImoveis, "max_alugueis": req.MaxAlugueis,
		"has_whatsapp": req.HasWhatsapp, "has_pagamentos": req.HasPagamentos,
		"has_ai_analysis": req.HasAIAnalysis, "has_relatorios_avancados": req.HasRelatoriosAvancados,
		"has_multi_usuarios": req.HasMultiUsuarios, "has_api_access": req.HasAPIAccess,
		"has_suporte_prioritario": req.HasSuportePrioritario, "has_dominio_customizado": req.HasDominioCustomizado,
		"max_storage_mb": req.MaxStorageMB, "max_file_size_mb": req.MaxFileSizeMB,
		"features_extras": req.FeaturesExtras, "ordem": req.Ordem, "trial_dias": req.TrialDias,
	}
	if req.Ativo != nil {
		updates["ativo"] = *req.Ativo
	}
	if err := s.repo.UpdatePlan(ctx, id, updates); err != nil {
		return nil, err
	}
	return s.repo.GetPlanByID(ctx, id)
}

func (s *Service) ListSubscriptions(ctx context.Context, status string, tenantID *uint) ([]models.Subscription, error) {
	return s.repo.ListSubscriptions(ctx, status, tenantID)
}

// ChangePlanForTenant cancela a(s) subscription(s) ativa(s)/trial do tenant e
// cria uma nova `active` no plano/ciclo indicados. Ver 01-spec §2.3 (PUT
// /subscriptions/:tenantId/change-plan).
func (s *Service) ChangePlanForTenant(ctx context.Context, tenantID, planID uint, ciclo string) (*models.Subscription, error) {
	plan, err := s.repo.GetPlanByID(ctx, planID)
	if err != nil {
		return nil, ErrPlanNotFound
	}
	if ciclo != "anual" {
		ciclo = "mensal"
	}
	valor := plan.PrecoMensal
	if ciclo == "anual" {
		valor = plan.PrecoAnual
	}

	// Uma assinatura por empresa (índice único desde a migração 0012): troca
	// no lugar, preservando o "pago até" (data_fim) e a tolerância.
	var sub models.Subscription
	err = s.repo.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("id DESC").First(&sub).Error
	if err != nil {
		sub = models.Subscription{
			TenantID: tenantID, PlanID: planID, Status: "active", Ciclo: ciclo,
			DataInicio: time.Now(), Valor: valor, ToleranciaDias: 3,
		}
		if err := s.repo.CreateSubscription(ctx, &sub); err != nil {
			return nil, err
		}
		return &sub, nil
	}
	if err := s.repo.UpdateSubscription(ctx, sub.ID, map[string]any{
		"plan_id": planID, "ciclo": ciclo, "valor": valor, "plano_agendado_id": nil,
	}); err != nil {
		return nil, err
	}
	sub.PlanID, sub.Ciclo, sub.Valor = planID, ciclo, valor
	return &sub, nil
}
