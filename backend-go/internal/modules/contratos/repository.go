package contratos

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) FindInquilino(ctx context.Context, id uint) (*models.ClienteAluguel, error) {
	var c models.ClienteAluguel
	if err := r.db.WithContext(ctx).First(&c, id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) SaveInquilino(ctx context.Context, c *models.ClienteAluguel) error {
	return r.db.WithContext(ctx).Save(c).Error
}

func (r *Repository) FindAluguel(ctx context.Context, id uint) (*models.Aluguel, error) {
	var a models.Aluguel
	if err := r.db.WithContext(ctx).First(&a, id).Error; err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *Repository) FindProprietario(ctx context.Context, id uint) (*models.Proprietario, error) {
	var p models.Proprietario
	if err := r.db.WithContext(ctx).First(&p, id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) ListAlugueis(ctx context.Context) ([]models.Aluguel, error) {
	var out []models.Aluguel
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&out).Error
	return out, err
}

func (r *Repository) ListProprietarios(ctx context.Context) ([]models.Proprietario, error) {
	var out []models.Proprietario
	err := r.db.WithContext(ctx).Order("name ASC").Find(&out).Error
	return out, err
}

func (r *Repository) ListInquilinos(ctx context.Context) ([]models.ClienteAluguel, error) {
	var out []models.ClienteAluguel
	err := r.db.WithContext(ctx).Order("id DESC").Find(&out).Error
	return out, err
}

// ListContratos devolve inquilinos com vínculo de contrato (aluguel_id != null).
func (r *Repository) ListContratos(ctx context.Context) ([]models.ClienteAluguel, error) {
	var out []models.ClienteAluguel
	err := r.db.WithContext(ctx).Where("aluguel_id IS NOT NULL").Order("id DESC").Find(&out).Error
	return out, err
}
