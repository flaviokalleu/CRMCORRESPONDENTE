package storage

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// DefaultMaxStorageMB / DefaultMaxFileSizeMB replicam os defaults do
// storageService.js Node quando não há override de tenant nem plano ativo.
const (
	DefaultMaxStorageMB  = 500
	DefaultMaxFileSizeMB = 10
)

// Limits é o resultado da resolução de limites de storage de um tenant.
// Unlimited=true quando o valor efetivo é 0 ("0 = ilimitado" no Node).
type Limits struct {
	MaxStorageMB  int
	MaxFileSizeMB int
	Unlimited     bool
}

// resolveLimits aplica a cascata: override do tenant ?? plano da subscription
// ativa ?? default. Ver spec §5.4.
func resolveLimits(ctx context.Context, db *gorm.DB, tenantID uint) (Limits, error) {
	var t models.Tenant
	if err := db.WithContext(ctx).First(&t, tenantID).Error; err != nil {
		return Limits{}, err
	}

	maxStorageMB := 0
	maxFileSizeMB := 0
	haveStorage := false
	haveFileSize := false

	if t.MaxStorageMB != nil {
		maxStorageMB = *t.MaxStorageMB
		haveStorage = true
	}
	if t.MaxFileSizeMB != nil {
		maxFileSizeMB = *t.MaxFileSizeMB
		haveFileSize = true
	}

	if !haveStorage || !haveFileSize {
		plan, err := activePlan(ctx, db, tenantID)
		if err == nil && plan != nil {
			if !haveStorage {
				maxStorageMB = plan.MaxStorageMB
			}
			if !haveFileSize {
				maxFileSizeMB = plan.MaxFileSizeMB
			}
		} else {
			if !haveStorage {
				maxStorageMB = DefaultMaxStorageMB
			}
			if !haveFileSize {
				maxFileSizeMB = DefaultMaxFileSizeMB
			}
		}
	}

	return Limits{
		MaxStorageMB:  maxStorageMB,
		MaxFileSizeMB: maxFileSizeMB,
		Unlimited:     maxStorageMB == 0,
	}, nil
}

// activePlan busca o Plan associado à Subscription ativa (status active|trialing)
// mais recente do tenant. Retorna (nil, nil) se não houver subscription ativa.
func activePlan(ctx context.Context, db *gorm.DB, tenantID uint) (*models.Plan, error) {
	var sub models.Subscription
	err := db.WithContext(ctx).
		Where("tenant_id = ? AND status IN ?", tenantID, []string{"active", "trialing"}).
		Order("created_at DESC").
		First(&sub).Error
	if err != nil {
		return nil, err
	}
	if !sub.IsActive() && !sub.IsTrialing() {
		return nil, gorm.ErrRecordNotFound
	}
	var plan models.Plan
	if err := db.WithContext(ctx).First(&plan, sub.PlanID).Error; err != nil {
		return nil, err
	}
	return &plan, nil
}
