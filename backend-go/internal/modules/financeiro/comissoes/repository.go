package comissoes

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository acessa `comissoes`. Toda query usa db.WithContext(ctx) (03-spec gotcha §6).
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, m *models.Comissao) error {
	return r.db.WithContext(ctx).Create(m).Error
}

func (r *Repository) List(ctx context.Context) ([]models.Comissao, error) {
	var rows []models.Comissao
	if err := r.db.WithContext(ctx).Order("data DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Comissao, error) {
	var m models.Comissao
	if err := r.db.WithContext(ctx).First(&m, id).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *Repository) Update(ctx context.Context, id uint, updates map[string]any) error {
	return r.db.WithContext(ctx).Model(&models.Comissao{}).Where("id = ?", id).Updates(updates).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Comissao{}, id).Error
}
