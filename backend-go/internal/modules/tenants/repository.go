package tenants

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository acessa `tenants` (GLOBAL) e, dentro da transação de onboarding,
// `users`/`subscriptions`. Ver 01-spec §3.3.
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) FindBySlug(ctx context.Context, slug string) (*models.Tenant, error) {
	var t models.Tenant
	if err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Tenant, error) {
	var t models.Tenant
	if err := r.db.WithContext(ctx).First(&t, id).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *Repository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Tenant{}).Where("email = ?", email).Count(&count).Error
	return count > 0, err
}

func (r *Repository) Update(ctx context.Context, id uint, updates map[string]any) error {
	return r.db.WithContext(ctx).Model(&models.Tenant{}).Where("id = ?", id).Updates(updates).Error
}

// LatestSubscriptionForTenant busca a subscription mais recente do tenant
// (qualquer status — usada em ChangePlanSelf, que apenas atualiza o registro
// existente, ver 01-spec §2.2).
func (r *Repository) LatestSubscriptionForTenant(ctx context.Context, tenantID uint) (*models.Subscription, error) {
	var s models.Subscription
	err := r.db.WithContext(ctx).Where("tenant_id = ?", tenantID).Order("created_at DESC").First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) UpdateSubscription(ctx context.Context, id uint, updates map[string]any) error {
	return r.db.WithContext(ctx).Model(&models.Subscription{}).Where("id = ?", id).Updates(updates).Error
}

// RegisterTransaction cria tenant + admin + subscription atomicamente
// (equivalente à transação de tenantRoutes.js /register). Ver 01-spec §2.2.
func (r *Repository) RegisterTransaction(ctx context.Context, t *models.Tenant, admin *models.User, sub *models.Subscription) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(t).Error; err != nil {
			return err
		}
		admin.TenantID = &t.ID
		if err := tx.Create(admin).Error; err != nil {
			return err
		}
		sub.TenantID = t.ID
		if err := tx.Create(sub).Error; err != nil {
			return err
		}
		return nil
	})
}
