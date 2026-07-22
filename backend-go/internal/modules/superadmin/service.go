package superadmin

import (
	"context"
	"errors"
	"strconv"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/models"
	"crmimob/internal/modules/users"
)

var (
	ErrTenantNotFound = errors.New("organização não encontrada")
	ErrSlugTaken      = errors.New("slug já está em uso")
	ErrEmailTaken     = errors.New("email já cadastrado")
	ErrWeakPassword   = errors.New("senha deve ter ao menos 6 caracteres")
)

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

func (s *Service) statsFor(ctx context.Context, tenantID uint) TenantStats {
	return TenantStats{
		Clientes: s.repo.CountForTable(ctx, "clientes", tenantID),
		Usuarios: s.repo.CountUsersForTenant(ctx, tenantID),
		Imoveis:  s.repo.CountForTable(ctx, "imoveis", tenantID),
		Alugueis: s.repo.CountForTable(ctx, "alugueis", tenantID),
	}
}

func (s *Service) ListTenants(ctx context.Context, page, limit int, search string, ativo *bool) (ListTenantsResponse, error) {
	list, total, err := s.repo.ListTenants(ctx, page, limit, search, ativo)
	if err != nil {
		return ListTenantsResponse{}, err
	}
	items := make([]TenantListItem, 0, len(list))
	for i := range list {
		t := list[i]
		item := TenantListItem{Tenant: t, Stats: s.statsFor(ctx, t.ID)}
		if sub, plan, err := s.repo.LatestSubscriptionWithPlan(ctx, t.ID); err == nil {
			item.LatestSubscription = sub
			item.Plan = plan
		}
		items = append(items, item)
	}
	if limit < 1 {
		limit = 20
	}
	totalPages := int((total + int64(limit) - 1) / int64(limit))
	if totalPages < 1 {
		totalPages = 1
	}
	return ListTenantsResponse{Tenants: items, Total: total, Page: page, TotalPages: totalPages}, nil
}

func (s *Service) GetTenantDetail(ctx context.Context, id uint) (*TenantDetail, error) {
	t, err := s.repo.GetTenantByID(ctx, id)
	if err != nil {
		return nil, err
	}
	subs, _ := s.repo.ListSubscriptionsForTenant(ctx, id)
	detail := &TenantDetail{Tenant: *t, Stats: s.statsFor(ctx, id), Subscriptions: subs}
	if admin, err := s.repo.FindAdminForTenant(ctx, id); err == nil {
		resp := users.ToResponse(admin)
		detail.AdminUser = &resp
	}
	return detail, nil
}

func (s *Service) CreateTenant(ctx context.Context, req CreateTenantRequest) (*models.Tenant, error) {
	if len(req.AdminPassword) < 6 {
		return nil, ErrWeakPassword
	}
	if taken, err := s.repo.ExistsTenantBySlug(ctx, req.Slug); err != nil {
		return nil, err
	} else if taken {
		return nil, ErrSlugTaken
	}
	if taken, err := s.repo.ExistsUserByEmail(ctx, req.AdminEmail); err != nil {
		return nil, err
	} else if taken {
		return nil, ErrEmailTaken
	}

	hash, err := auth.HashPassword(req.AdminPassword)
	if err != nil {
		return nil, err
	}

	t := &models.Tenant{Nome: req.Nome, Slug: req.Slug, CNPJ: req.CNPJ, Email: req.Email, Telefone: req.Telefone, Ativo: true}
	if err := s.repo.CreateTenant(ctx, t); err != nil {
		return nil, err
	}

	admin := &models.User{
		FirstName: req.AdminFirstName, LastName: req.AdminLastName, Email: req.AdminEmail,
		Password: hash, Telefone: req.AdminTelefone, IsAdministrador: true, TenantID: &t.ID,
	}
	if err := s.repo.CreateUser(ctx, admin); err != nil {
		return nil, err
	}

	if req.PlanID != nil {
		sub := &models.Subscription{TenantID: t.ID, PlanID: *req.PlanID, Status: "active", Ciclo: "mensal", DataInicio: time.Now()}
		_ = s.repo.CreateSubscription(ctx, sub)
	}

	return t, nil
}

// UpdateTenant aplica o allow-list de campos. Se use_custom_modules for
// setado para false, zera os overrides de módulos (ver 01-spec §2.3).
func (s *Service) UpdateTenant(ctx context.Context, id uint, req UpdateTenantRequest) (*TenantDetail, error) {
	updates := map[string]any{}
	setIf := func(key string, v any) { updates[key] = v }

	if req.Nome != nil {
		setIf("nome", *req.Nome)
	}
	if req.CNPJ != nil {
		setIf("cnpj", *req.CNPJ)
	}
	if req.Email != nil {
		setIf("email", *req.Email)
	}
	if req.Telefone != nil {
		setIf("telefone", *req.Telefone)
	}
	if req.Ativo != nil {
		setIf("ativo", *req.Ativo)
	}
	if req.Endereco != nil {
		setIf("endereco", *req.Endereco)
	}
	if req.Cidade != nil {
		setIf("cidade", *req.Cidade)
	}
	if req.Estado != nil {
		setIf("estado", *req.Estado)
	}
	if req.CEP != nil {
		setIf("cep", *req.CEP)
	}
	if req.MaxClientes != nil {
		setIf("max_clientes", *req.MaxClientes)
	}
	if req.MaxUsuarios != nil {
		setIf("max_usuarios", *req.MaxUsuarios)
	}
	if req.MaxImoveis != nil {
		setIf("max_imoveis", *req.MaxImoveis)
	}
	if req.MaxAlugueis != nil {
		setIf("max_alugueis", *req.MaxAlugueis)
	}
	if req.MaxStorageMB != nil {
		setIf("max_storage_mb", *req.MaxStorageMB)
	}
	if req.MaxFileSizeMB != nil {
		setIf("max_file_size_mb", *req.MaxFileSizeMB)
	}

	if req.UseCustomModules != nil {
		setIf("use_custom_modules", *req.UseCustomModules)
		if !*req.UseCustomModules {
			// Zera todos os overrides de módulos (gotcha replicado do Node — ver 01-spec §2.3).
			for _, col := range []string{
				"has_whatsapp", "has_pagamentos", "has_ai_analysis", "has_relatorios_avancados",
				"has_multi_usuarios", "has_api_access", "has_suporte_prioritario", "has_dominio_customizado",
			} {
				updates[col] = nil
			}
		} else {
			if req.HasWhatsapp != nil {
				setIf("has_whatsapp", *req.HasWhatsapp)
			}
			if req.HasPagamentos != nil {
				setIf("has_pagamentos", *req.HasPagamentos)
			}
			if req.HasAIAnalysis != nil {
				setIf("has_ai_analysis", *req.HasAIAnalysis)
			}
			if req.HasRelatoriosAvancados != nil {
				setIf("has_relatorios_avancados", *req.HasRelatoriosAvancados)
			}
			if req.HasMultiUsuarios != nil {
				setIf("has_multi_usuarios", *req.HasMultiUsuarios)
			}
			if req.HasAPIAccess != nil {
				setIf("has_api_access", *req.HasAPIAccess)
			}
			if req.HasSuportePrioritario != nil {
				setIf("has_suporte_prioritario", *req.HasSuportePrioritario)
			}
			if req.HasDominioCustomizado != nil {
				setIf("has_dominio_customizado", *req.HasDominioCustomizado)
			}
		}
	}

	if len(updates) > 0 {
		if err := s.repo.UpdateTenant(ctx, id, updates); err != nil {
			return nil, err
		}
	}

	// Admin (opcional): cria se não existir, atualiza se existir.
	if req.AdminEmail != nil || req.AdminFirstName != nil || req.AdminPassword != nil {
		if err := s.upsertAdmin(ctx, id, req); err != nil {
			return nil, err
		}
	}

	return s.GetTenantDetail(ctx, id)
}

func (s *Service) upsertAdmin(ctx context.Context, tenantID uint, req UpdateTenantRequest) error {
	admin, err := s.repo.FindAdminForTenant(ctx, tenantID)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		// Cria um novo admin.
		if req.AdminEmail == nil || req.AdminPassword == nil {
			return nil // dados insuficientes para criar — ignora silenciosamente (allow-list parcial)
		}
		hash, err := auth.HashPassword(*req.AdminPassword)
		if err != nil {
			return err
		}
		first, last, tel := "", "", ""
		if req.AdminFirstName != nil {
			first = *req.AdminFirstName
		}
		if req.AdminLastName != nil {
			last = *req.AdminLastName
		}
		if req.AdminTelefone != nil {
			tel = *req.AdminTelefone
		}
		newAdmin := &models.User{
			FirstName: first, LastName: last, Email: *req.AdminEmail, Password: hash,
			Telefone: tel, IsAdministrador: true, TenantID: &tenantID,
		}
		return s.repo.CreateUser(ctx, newAdmin)
	}

	updates := map[string]any{}
	if req.AdminFirstName != nil {
		updates["first_name"] = *req.AdminFirstName
	}
	if req.AdminLastName != nil {
		updates["last_name"] = *req.AdminLastName
	}
	if req.AdminEmail != nil {
		updates["email"] = *req.AdminEmail
	}
	if req.AdminTelefone != nil {
		updates["telefone"] = *req.AdminTelefone
	}
	if req.AdminPassword != nil && *req.AdminPassword != "" {
		hash, err := auth.HashPassword(*req.AdminPassword)
		if err != nil {
			return err
		}
		updates["password"] = hash
	}
	return s.repo.UpdateUser(ctx, admin.ID, updates)
}

func (s *Service) GetModules(ctx context.Context, id uint) (*ModulesResponse, error) {
	t, err := s.repo.GetTenantByID(ctx, id)
	if err != nil {
		return nil, err
	}
	var plan *models.Plan
	if _, p, err := s.repo.LatestSubscriptionWithPlan(ctx, id); err == nil {
		plan = p
	}

	moduleField := func(tenantVal *bool, planVal bool) ModuleValue {
		if t.UseCustomModules && tenantVal != nil {
			return ModuleValue{Value: *tenantVal, Source: "tenant"}
		}
		if plan != nil {
			return ModuleValue{Value: planVal, Source: "plan"}
		}
		return ModuleValue{Value: false, Source: "none"}
	}
	limitField := func(tenantVal *int, planVal int) ModuleValue {
		if tenantVal != nil {
			return ModuleValue{Value: *tenantVal, Source: "tenant"}
		}
		if plan != nil {
			return ModuleValue{Value: planVal, Source: "plan"}
		}
		return ModuleValue{Value: 0, Source: "none"}
	}

	var pWhatsapp, pPagamentos, pAI, pRelatorios, pMulti, pAPI, pSuporte, pDominio bool
	var pClientes, pUsuarios, pImoveis, pAlugueis, pStorageMB, pFileMB int
	if plan != nil {
		pWhatsapp, pPagamentos, pAI = plan.HasWhatsapp, plan.HasPagamentos, plan.HasAIAnalysis
		pRelatorios, pMulti = plan.HasRelatoriosAvancados, plan.HasMultiUsuarios
		pAPI, pSuporte, pDominio = plan.HasAPIAccess, plan.HasSuportePrioritario, plan.HasDominioCustomizado
		pClientes, pUsuarios, pImoveis, pAlugueis = plan.MaxClientes, plan.MaxUsuarios, plan.MaxImoveis, plan.MaxAlugueis
		pStorageMB, pFileMB = plan.MaxStorageMB, plan.MaxFileSizeMB
	}

	return &ModulesResponse{
		TenantID: t.ID, UseCustomModules: t.UseCustomModules, Plan: plan,
		Modules: map[string]ModuleValue{
			"has_whatsapp":               moduleField(t.HasWhatsapp, pWhatsapp),
			"has_pagamentos":             moduleField(t.HasPagamentos, pPagamentos),
			"has_ai_analysis":            moduleField(t.HasAIAnalysis, pAI),
			"has_relatorios_avancados":   moduleField(t.HasRelatoriosAvancados, pRelatorios),
			"has_multi_usuarios":         moduleField(t.HasMultiUsuarios, pMulti),
			"has_api_access":             moduleField(t.HasAPIAccess, pAPI),
			"has_suporte_prioritario":    moduleField(t.HasSuportePrioritario, pSuporte),
			"has_dominio_customizado":    moduleField(t.HasDominioCustomizado, pDominio),
		},
		Limits: map[string]ModuleValue{
			"max_clientes": limitField(t.MaxClientes, pClientes),
			"max_usuarios": limitField(t.MaxUsuarios, pUsuarios),
			"max_imoveis":  limitField(t.MaxImoveis, pImoveis),
			"max_alugueis": limitField(t.MaxAlugueis, pAlugueis),
		},
		Storage: map[string]ModuleValue{
			"max_storage_mb":   limitField(t.MaxStorageMB, pStorageMB),
			"max_file_size_mb": limitField(t.MaxFileSizeMB, pFileMB),
		},
	}, nil
}

func (s *Service) ToggleStatus(ctx context.Context, id uint) (bool, error) {
	t, err := s.repo.GetTenantByID(ctx, id)
	if err != nil {
		return false, err
	}
	novo := !t.Ativo
	if err := s.repo.UpdateTenant(ctx, id, map[string]any{"ativo": novo}); err != nil {
		return false, err
	}
	return novo, nil
}

// Impersonate NÃO gera token (ver 01-spec §2.3) — apenas devolve a instrução
// para o frontend usar o header X-Tenant-Id.
func (s *Service) Impersonate(ctx context.Context, id uint) (*ImpersonateResponse, error) {
	t, err := s.repo.GetTenantByID(ctx, id)
	if err != nil {
		return nil, err
	}
	resp := &ImpersonateResponse{
		Message: "Use o header X-Tenant-Id para acessar este tenant", Tenant: *t,
		Instrucao: "Envie o header 'X-Tenant-Id: " + strconv.FormatUint(uint64(id), 10) + "' em requisições subsequentes como super admin.",
	}
	if admin, err := s.repo.FindAdminForTenant(ctx, id); err == nil {
		r := users.ToResponse(admin)
		resp.Admin = &r
	}
	return resp, nil
}

func (s *Service) ListUsers(ctx context.Context, tenantID uint) ([]models.User, error) {
	return s.repo.ListUsersForTenant(ctx, tenantID)
}

func (s *Service) Metrics(ctx context.Context) MetricsResponse {
	ativo := true
	inativo := false
	planMetrics, _ := s.repo.PlanMetrics(ctx)
	return MetricsResponse{
		Tenants: TenantsMetrics{
			Total: s.repo.CountTenants(ctx, nil), Ativos: s.repo.CountTenants(ctx, &ativo), Inativos: s.repo.CountTenants(ctx, &inativo),
		},
		Financeiro: FinanceiroMetrics{
			MRR: s.repo.MRR(ctx), ARR: s.repo.MRR(ctx) * 12,
			AssinaturasAtivas: s.repo.CountActiveSubscriptions(ctx), ChurnMes: s.repo.ChurnMes(ctx),
		},
		Planos: planMetrics,
		Recursos: RecursosMetrics{
			TotalUsuarios: s.repo.TotalUsuarios(ctx),
			TotalClientes: s.repo.TotalForTable(ctx, "clientes"),
			TotalImoveis:  s.repo.TotalForTable(ctx, "imoveis"),
		},
	}
}
