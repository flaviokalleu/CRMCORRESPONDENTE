// Package proprietarios implementa o CRUD de proprietários (routes/proprietarios.js).
// Isolamento por tenant é automático via os callbacks GORM de
// internal/tenant (basta usar db.WithContext(ctx) — ver 01-spec §5.2), o que
// padroniza o comportamento hoje inconsistente no Node (04-spec Gotcha 7).
package proprietarios

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// List devolve todos os proprietários do tenant do contexto, ordenados por nome.
func (r *Repository) List(ctx context.Context) ([]models.Proprietario, error) {
	var out []models.Proprietario
	err := r.db.WithContext(ctx).Order("name ASC").Find(&out).Error
	return out, err
}

func (r *Repository) Create(ctx context.Context, p *models.Proprietario) error {
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Proprietario, error) {
	var p models.Proprietario
	if err := r.db.WithContext(ctx).First(&p, id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

// Delete remove o proprietário. O callback de tenant já restringe a query ao
// tenant do contexto — deletar um id de outro tenant simplesmente afeta 0
// linhas (RowsAffected==0), tratado pelo service como "não encontrado".
func (r *Repository) Delete(ctx context.Context, id uint) (int64, error) {
	res := r.db.WithContext(ctx).Delete(&models.Proprietario{}, id)
	return res.RowsAffected, res.Error
}
