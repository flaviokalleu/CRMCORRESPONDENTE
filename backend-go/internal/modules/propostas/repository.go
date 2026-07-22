package propostas

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository encapsula acesso a `propostas`. tenant_id é injetado/filtrado
// automaticamente pelos callbacks globais de internal/tenant (db.WithContext).
type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, p *models.Proposta) error {
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Proposta, error) {
	var p models.Proposta
	err := r.db.WithContext(ctx).First(&p, id).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) List(ctx context.Context, f ListFilters) ([]models.Proposta, int64, error) {
	base := r.db.WithContext(ctx).Model(&models.Proposta{})
	if f.Status != "" {
		base = base.Where("status = ?", f.Status)
	}
	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	q := r.db.WithContext(ctx).Preload("Cliente").Preload("Imovel").Preload("Corretor")
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	var out []models.Proposta
	offset := (f.Page - 1) * f.Limit
	err := q.Order("created_at DESC").Limit(f.Limit).Offset(offset).Find(&out).Error
	return out, total, err
}

func (r *Repository) ListByCliente(ctx context.Context, clienteID uint) ([]models.Proposta, error) {
	var out []models.Proposta
	err := r.db.WithContext(ctx).
		Preload("Imovel").Preload("Corretor").
		Where("cliente_id = ?", clienteID).
		Order("created_at DESC").
		Find(&out).Error
	return out, err
}

func (r *Repository) Update(ctx context.Context, p *models.Proposta) error {
	return r.db.WithContext(ctx).Save(p).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) (int64, error) {
	res := r.db.WithContext(ctx).Delete(&models.Proposta{}, id)
	return res.RowsAffected, res.Error
}
