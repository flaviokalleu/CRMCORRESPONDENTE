package despesas

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository acessa `despesas`. Toda query usa db.WithContext(ctx) (03-spec gotcha §6).
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, m *models.Despesa) error {
	return r.db.WithContext(ctx).Create(m).Error
}

func (r *Repository) List(ctx context.Context) ([]models.Despesa, error) {
	var rows []models.Despesa
	if err := r.db.WithContext(ctx).Order("data DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Despesa, error) {
	var m models.Despesa
	if err := r.db.WithContext(ctx).First(&m, id).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *Repository) Update(ctx context.Context, id uint, updates map[string]any) error {
	return r.db.WithContext(ctx).Model(&models.Despesa{}).Where("id = ?", id).Updates(updates).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Despesa{}, id).Error
}

// Sum soma `valor` de todas as despesas no escopo do tenant corrente.
func (r *Repository) Sum(ctx context.Context) (float64, error) {
	var total float64
	err := r.db.WithContext(ctx).Model(&models.Despesa{}).Select("COALESCE(SUM(valor),0)").Scan(&total).Error
	return total, err
}
