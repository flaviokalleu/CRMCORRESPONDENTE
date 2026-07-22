// Package vistorias implementa o CRUD de vistorias de entrada/saída
// (routes/vistoriaRoutes.js). Ver docs/migration/04-alugueis.md §7.
package vistorias

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, v *models.VistoriaAluguel) error {
	return r.db.WithContext(ctx).Create(v).Error
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.VistoriaAluguel, error) {
	var v models.VistoriaAluguel
	if err := r.db.WithContext(ctx).First(&v, id).Error; err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *Repository) ListByCliente(ctx context.Context, clienteAluguelID uint) ([]models.VistoriaAluguel, error) {
	var out []models.VistoriaAluguel
	err := r.db.WithContext(ctx).
		Where("cliente_aluguel_id = ?", clienteAluguelID).
		Order("data_vistoria DESC").
		Find(&out).Error
	return out, err
}

func (r *Repository) Save(ctx context.Context, v *models.VistoriaAluguel) error {
	return r.db.WithContext(ctx).Save(v).Error
}

// UltimaPorTipo devolve a vistoria mais recente do inquilino para o tipo
// informado ("entrada"/"saida"), ou nil se não houver.
func (r *Repository) UltimaPorTipo(ctx context.Context, clienteAluguelID uint, tipo string) (*models.VistoriaAluguel, error) {
	var v models.VistoriaAluguel
	err := r.db.WithContext(ctx).
		Where("cliente_aluguel_id = ? AND tipo = ?", clienteAluguelID, tipo).
		Order("data_vistoria DESC").
		First(&v).Error
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *Repository) FindInquilino(ctx context.Context, id uint) (*models.ClienteAluguel, error) {
	var c models.ClienteAluguel
	if err := r.db.WithContext(ctx).First(&c, id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) FindAluguel(ctx context.Context, id uint) (*models.Aluguel, error) {
	var a models.Aluguel
	if err := r.db.WithContext(ctx).First(&a, id).Error; err != nil {
		return nil, err
	}
	return &a, nil
}
