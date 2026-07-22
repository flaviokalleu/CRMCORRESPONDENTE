package superadmin

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository acessa `tenants`/`users`/`subscriptions`/`plans` (todos GLOBAIS
// do ponto de vista deste painel — o super admin enxerga todos os tenants,
// ver 01-spec §5.1 regra de super admin sem X-Tenant-Id). Também conta linhas
// em tabelas de outros clusters (`clientes`,`imoveis`,`alugueis`) via
// db.Table(nome) para não depender de models que talvez ainda não existam
// neste módulo.
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) ListTenants(ctx context.Context, page, limit int, search string, ativo *bool) ([]models.Tenant, int64, error) {
	q := r.db.WithContext(ctx).Model(&models.Tenant{})
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("nome ILIKE ? OR email ILIKE ? OR cnpj ILIKE ?", like, like, like)
	}
	if ativo != nil {
		q = q.Where("ativo = ?", *ativo)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	var out []models.Tenant
	err := q.Order("created_at DESC").Limit(limit).Offset((page - 1) * limit).Find(&out).Error
	return out, total, err
}

func (r *Repository) GetTenantByID(ctx context.Context, id uint) (*models.Tenant, error) {
	var t models.Tenant
	if err := r.db.WithContext(ctx).First(&t, id).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *Repository) CreateTenant(ctx context.Context, t *models.Tenant) error {
	return r.db.WithContext(ctx).Create(t).Error
}

func (r *Repository) UpdateTenant(ctx context.Context, id uint, updates map[string]any) error {
	if len(updates) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Model(&models.Tenant{}).Where("id = ?", id).Updates(updates).Error
}

// CountForTable conta linhas de uma tabela de outro cluster filtradas por
// tenant_id (usado para stats de clientes/imoveis/alugueis).
func (r *Repository) CountForTable(ctx context.Context, table string, tenantID uint) int64 {
	var count int64
	// Fail-open (tabela pode não existir ainda em ambientes parciais de
	// migração) — erro é tratado como 0, não interrompe o painel.
	_ = r.db.WithContext(ctx).Table(table).Where("tenant_id = ?", tenantID).Count(&count).Error
	return count
}

func (r *Repository) CountUsersForTenant(ctx context.Context, tenantID uint) int64 {
	var count int64
	_ = r.db.WithContext(ctx).Model(&models.User{}).Where("tenant_id = ?", tenantID).Count(&count).Error
	return count
}

func (r *Repository) FindAdminForTenant(ctx context.Context, tenantID uint) (*models.User, error) {
	var u models.User
	err := r.db.WithContext(ctx).Where("tenant_id = ? AND is_administrador = true", tenantID).Order("id ASC").First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) ListUsersForTenant(ctx context.Context, tenantID uint) ([]models.User, error) {
	var out []models.User
	err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("id ASC").Find(&out).Error
	return out, err
}

func (r *Repository) CreateUser(ctx context.Context, u *models.User) error {
	return r.db.WithContext(ctx).Create(u).Error
}

func (r *Repository) UpdateUser(ctx context.Context, id uint, updates map[string]any) error {
	if len(updates) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", id).Updates(updates).Error
}

func (r *Repository) ExistsUserByEmail(ctx context.Context, email string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.User{}).Where("email = ?", email).Count(&count).Error
	return count > 0, err
}

func (r *Repository) ExistsTenantBySlug(ctx context.Context, slug string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Tenant{}).Where("slug = ?", slug).Count(&count).Error
	return count > 0, err
}

func (r *Repository) LatestSubscriptionWithPlan(ctx context.Context, tenantID uint) (*models.Subscription, *models.Plan, error) {
	var s models.Subscription
	err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("created_at DESC").First(&s).Error
	if err != nil {
		return nil, nil, err
	}
	var p models.Plan
	if err := r.db.WithContext(ctx).First(&p, s.PlanID).Error; err != nil {
		return &s, nil, nil
	}
	return &s, &p, nil
}

func (r *Repository) ListSubscriptionsForTenant(ctx context.Context, tenantID uint) ([]models.Subscription, error) {
	var out []models.Subscription
	err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("created_at DESC").Find(&out).Error
	return out, err
}

func (r *Repository) CreateSubscription(ctx context.Context, s *models.Subscription) error {
	return r.db.WithContext(ctx).Create(s).Error
}

// ---- Métricas (GET /metrics) ----

func (r *Repository) CountTenants(ctx context.Context, ativo *bool) int64 {
	var count int64
	q := r.db.WithContext(ctx).Model(&models.Tenant{})
	if ativo != nil {
		q = q.Where("ativo = ?", *ativo)
	}
	_ = q.Count(&count).Error
	return count
}

// MRR = SUM(CASE ciclo='mensal' THEN valor ELSE valor/12) das subscriptions active.
func (r *Repository) MRR(ctx context.Context) float64 {
	var mrr float64
	row := r.db.WithContext(ctx).Model(&models.Subscription{}).
		Select("COALESCE(SUM(CASE WHEN ciclo = 'mensal' THEN valor ELSE valor / 12 END), 0)").
		Where("status = 'active'").Row()
	_ = row.Scan(&mrr)
	return mrr
}

func (r *Repository) CountActiveSubscriptions(ctx context.Context) int64 {
	var count int64
	_ = r.db.WithContext(ctx).Model(&models.Subscription{}).Where("status = 'active'").Count(&count).Error
	return count
}

// ChurnMes: assinaturas canceladas neste mês corrente.
func (r *Repository) ChurnMes(ctx context.Context) int64 {
	var count int64
	_ = r.db.WithContext(ctx).Model(&models.Subscription{}).
		Where("status = 'canceled' AND cancelado_em >= date_trunc('month', now())").Count(&count).Error
	return count
}

func (r *Repository) PlanMetrics(ctx context.Context) ([]PlanoMetric, error) {
	var out []PlanoMetric
	err := r.db.WithContext(ctx).Model(&models.Plan{}).
		Select("plans.id as plan_id, plans.nome as nome, COUNT(subscriptions.id) as assinaturas").
		Joins("LEFT JOIN subscriptions ON subscriptions.plan_id = plans.id AND subscriptions.status = 'active'").
		Group("plans.id, plans.nome").
		Order("plans.ordem ASC").
		Scan(&out).Error
	return out, err
}

func (r *Repository) TotalUsuarios(ctx context.Context) int64 {
	var count int64
	_ = r.db.WithContext(ctx).Model(&models.User{}).Count(&count).Error
	return count
}

func (r *Repository) TotalForTable(ctx context.Context, table string) int64 {
	var count int64
	_ = r.db.WithContext(ctx).Table(table).Count(&count).Error
	return count
}
