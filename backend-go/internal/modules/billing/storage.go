package billing

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// StorageService replica storageService.js: limites efetivos (tenant override
// ?? plano ?? default) e increment/decrement atômico de storage_used_bytes.
// Ver 01-spec §6.3.
type StorageService struct {
	db       *gorm.DB
	resolver *PlanResolver
	repo     *Repository
}

func NewStorageService(db *gorm.DB, repo *Repository) *StorageService {
	return &StorageService{db: db, resolver: NewPlanResolver(), repo: repo}
}

// Limits devolve (maxStorageMB, maxFileSizeMB) efetivos do tenant.
func (s *StorageService) Limits(ctx context.Context, tenant *models.Tenant) (maxStorageMB, maxFileSizeMB int) {
	var plan *models.Plan
	if sub, err := s.repo.LatestActiveByTenant(ctx, tenant.ID); err == nil {
		if p, err := s.repo.GetPlanByID(ctx, sub.PlanID); err == nil {
			plan = p
		}
	}
	maxStorageMB = s.resolver.EffectiveLimit(tenant, plan, "storage_mb")
	if maxStorageMB == 0 && plan == nil && tenant.MaxStorageMB == nil {
		maxStorageMB = 500 // default do Node quando não há plano/override
	}
	maxFileSizeMB = s.resolver.EffectiveLimit(tenant, plan, "file_size_mb")
	if maxFileSizeMB == 0 && plan == nil && tenant.MaxFileSizeMB == nil {
		maxFileSizeMB = 10
	}
	return
}

// GetInfo monta o payload de GET /api/storage-usage.
func (s *StorageService) GetInfo(ctx context.Context, tenant *models.Tenant) StorageInfo {
	maxMB, maxFileMB := s.Limits(ctx, tenant)
	usedBytes := tenant.StorageUsedBytes
	usedMB := float64(usedBytes) / (1024 * 1024)

	ilimitado := maxMB == 0
	var pct, dispMB float64
	if !ilimitado {
		limitBytes := float64(maxMB) * 1024 * 1024
		if limitBytes > 0 {
			pct = (float64(usedBytes) / limitBytes) * 100
		}
		dispMB = float64(maxMB) - usedMB
		if dispMB < 0 {
			dispMB = 0
		}
	}

	return StorageInfo{
		UsadoMB: usedMB, UsadoBytes: usedBytes, LimiteMB: maxMB, LimiteArquivoMB: maxFileMB,
		Percentual: pct, Ilimitado: ilimitado, DisponivelMB: dispMB,
	}
}

// Increment soma bytes ao storage_used_bytes do tenant, atomicamente.
func (s *StorageService) Increment(ctx context.Context, tenantID uint, bytes int64) error {
	return s.db.WithContext(ctx).Model(&models.Tenant{}).Where("id = ?", tenantID).
		UpdateColumn("storage_used_bytes", gorm.Expr("storage_used_bytes + ?", bytes)).Error
}

// Decrement subtrai bytes, nunca deixando o total ficar negativo (atômico via
// GREATEST no próprio SQL — mais seguro que o Node, que fazia isso em memória).
func (s *StorageService) Decrement(ctx context.Context, tenantID uint, bytes int64) error {
	return s.db.WithContext(ctx).Model(&models.Tenant{}).Where("id = ?", tenantID).
		UpdateColumn("storage_used_bytes", gorm.Expr("GREATEST(storage_used_bytes - ?, 0)", bytes)).Error
}
