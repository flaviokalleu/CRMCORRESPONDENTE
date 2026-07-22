package lembretes

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) FindByTituloData(ctx context.Context, titulo string, data string) (*models.Lembrete, error) {
	var l models.Lembrete
	// Compara pela data (dia) — replica dedupe "mesmo titulo+data" (§2.5).
	err := r.db.WithContext(ctx).
		Where("titulo = ? AND data::date = ?::date", titulo, data).
		First(&l).Error
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *Repository) Create(ctx context.Context, l *models.Lembrete) error {
	return r.db.WithContext(ctx).Create(l).Error
}

func (r *Repository) All(ctx context.Context) ([]models.Lembrete, error) {
	var list []models.Lembrete
	err := r.db.WithContext(ctx).Find(&list).Error
	return list, err
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Lembrete, error) {
	var l models.Lembrete
	if err := r.db.WithContext(ctx).First(&l, id).Error; err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *Repository) Save(ctx context.Context, l *models.Lembrete) error {
	return r.db.WithContext(ctx).Save(l).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Lembrete{}, id).Error
}
