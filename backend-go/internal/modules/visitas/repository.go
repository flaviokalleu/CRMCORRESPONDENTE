package visitas

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository encapsula acesso a `visitas`. tenant_id é injetado/filtrado
// automaticamente pelos callbacks globais de internal/tenant (db.WithContext).
type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, v *models.Visita) error {
	return r.db.WithContext(ctx).Create(v).Error
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Visita, error) {
	var v models.Visita
	err := r.db.WithContext(ctx).First(&v, id).Error
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *Repository) List(ctx context.Context, f ListFilters) ([]models.Visita, int64, error) {
	base := r.db.WithContext(ctx).Model(&models.Visita{})
	base = applyFilters(base, f)

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	q := applyFilters(r.db.WithContext(ctx).Preload("Cliente").Preload("Imovel").Preload("Corretor"), f)
	var out []models.Visita
	offset := (f.Page - 1) * f.Limit
	err := q.Order("data_visita ASC").Limit(f.Limit).Offset(offset).Find(&out).Error
	return out, total, err
}

func applyFilters(q *gorm.DB, f ListFilters) *gorm.DB {
	q = q.Model(&models.Visita{})
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.CorretorID != nil {
		q = q.Where("corretor_id = ?", *f.CorretorID)
	}
	if f.DataInicio != nil {
		q = q.Where("data_visita >= ?", *f.DataInicio)
	}
	if f.DataFim != nil {
		q = q.Where("data_visita <= ?", *f.DataFim)
	}
	return q
}

func (r *Repository) ListByCliente(ctx context.Context, clienteID uint) ([]models.Visita, error) {
	var out []models.Visita
	err := r.db.WithContext(ctx).
		Preload("Imovel").Preload("Corretor").
		Where("cliente_id = ?", clienteID).
		Order("data_visita DESC").
		Find(&out).Error
	return out, err
}

func (r *Repository) Update(ctx context.Context, v *models.Visita) error {
	return r.db.WithContext(ctx).Save(v).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) (int64, error) {
	res := r.db.WithContext(ctx).Delete(&models.Visita{}, id)
	return res.RowsAffected, res.Error
}
