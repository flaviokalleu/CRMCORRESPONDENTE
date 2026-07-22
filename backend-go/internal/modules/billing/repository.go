package billing

import (
	"context"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository acessa `plans` e `subscriptions` — ambos GLOBAIS (isentos de
// tenant scope, ver internal/tenant/globals.go). Ver 01-spec §3.4/§3.5.
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// ---- Plans ----

func (r *Repository) ListPlans(ctx context.Context, onlyActive bool) ([]models.Plan, error) {
	q := r.db.WithContext(ctx).Order("ordem ASC")
	if onlyActive {
		q = q.Where("ativo = true")
	}
	var out []models.Plan
	err := q.Find(&out).Error
	return out, err
}

func (r *Repository) GetPlanByID(ctx context.Context, id uint) (*models.Plan, error) {
	var p models.Plan
	if err := r.db.WithContext(ctx).First(&p, id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) GetPlanBySlug(ctx context.Context, slug string) (*models.Plan, error) {
	var p models.Plan
	if err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) CreatePlan(ctx context.Context, p *models.Plan) error {
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *Repository) UpdatePlan(ctx context.Context, id uint, updates map[string]any) error {
	return r.db.WithContext(ctx).Model(&models.Plan{}).Where("id = ?", id).Updates(updates).Error
}

// ---- Subscriptions ----

func (r *Repository) ListSubscriptions(ctx context.Context, status string, tenantID *uint) ([]models.Subscription, error) {
	q := r.db.WithContext(ctx).Order("created_at DESC")
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if tenantID != nil {
		q = q.Where("tenant_id = ?", *tenantID)
	}
	var out []models.Subscription
	err := q.Find(&out).Error
	return out, err
}

// LatestActiveByTenant busca a subscription mais recente ativa/trialing do
// tenant (equivalente à query de checkSubscription/getStorageLimits do Node).
func (r *Repository) LatestActiveByTenant(ctx context.Context, tenantID uint) (*models.Subscription, error) {
	var s models.Subscription
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND status IN ?", tenantID, []string{"active", "trialing"}).
		Order("created_at DESC").
		First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) CreateSubscription(ctx context.Context, s *models.Subscription) error {
	return r.db.WithContext(ctx).Create(s).Error
}

// CancelActiveForTenant cancela (status=canceled, cancelado_em=now) todas as
// subscriptions active/trialing do tenant — usado antes de trocar de plano.
func (r *Repository) CancelActiveForTenant(ctx context.Context, tenantID uint) error {
	return r.db.WithContext(ctx).Model(&models.Subscription{}).
		Where("tenant_id = ? AND status IN ?", tenantID, []string{"active", "trialing"}).
		Updates(map[string]any{"status": "canceled", "cancelado_em": time.Now()}).Error
}

func (r *Repository) UpdateSubscription(ctx context.Context, id uint, updates map[string]any) error {
	return r.db.WithContext(ctx).Model(&models.Subscription{}).Where("id = ?", id).Updates(updates).Error
}

// CountForTable conta linhas de uma tabela (de qualquer cluster) filtradas
// por tenant_id — usado por PlanUsageHandler (clientes/usuarios/imoveis/alugueis).
// Fail-open: tabela ausente em ambiente parcial de migração conta como 0.
func (r *Repository) CountForTable(ctx context.Context, table string, tenantID uint) int64 {
	var count int64
	_ = r.db.WithContext(ctx).Table(table).Where("tenant_id = ?", tenantID).Count(&count).Error
	return count
}
