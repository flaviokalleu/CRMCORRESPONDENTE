package fluxocaixa

import (
	"context"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository acessa `fluxo_caixa`. Toda query usa db.WithContext(ctx) (03-spec gotcha §6).
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, m *models.FluxoCaixa) error {
	return r.db.WithContext(ctx).Create(m).Error
}

func (r *Repository) List(ctx context.Context) ([]models.FluxoCaixa, error) {
	var rows []models.FluxoCaixa
	if err := r.db.WithContext(ctx).Order("data DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.FluxoCaixa, error) {
	var m models.FluxoCaixa
	if err := r.db.WithContext(ctx).First(&m, id).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *Repository) Update(ctx context.Context, id uint, updates map[string]any) error {
	return r.db.WithContext(ctx).Model(&models.FluxoCaixa{}).Where("id = ?", id).Updates(updates).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.FluxoCaixa{}, id).Error
}

// CountPendencias conta lançamentos com `data` futura (pendências, ver 03-spec
// §4 fluxocaixa/dashboard). Filtro de tenant é aplicado pelos callbacks GORM.
func (r *Repository) CountPendencias(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.FluxoCaixa{}).Where("data > ?", time.Now()).Count(&count).Error
	return count, err
}
