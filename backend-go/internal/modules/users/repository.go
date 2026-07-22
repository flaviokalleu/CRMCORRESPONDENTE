package users

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository acessa `users` (escopado por tenant via callbacks GORM — ver
// internal/tenant/scope.go). Sempre usar db.WithContext(ctx).
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.User, error) {
	var u models.User
	if err := r.db.WithContext(ctx).First(&u, id).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var u models.User
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&u).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

// List devolve todos os users do tenant corrente, ordenados
// admins → correspondentes → corretores (mesma ordenação do Node).
func (r *Repository) List(ctx context.Context) ([]models.User, error) {
	var out []models.User
	err := r.db.WithContext(ctx).
		Order("is_administrador DESC").
		Order("is_correspondente DESC").
		Order("is_corretor DESC").
		Order("id ASC").
		Find(&out).Error
	return out, err
}

func (r *Repository) Update(ctx context.Context, id uint, updates map[string]any) error {
	if len(updates) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Model(&models.User{}).Where("id = ?", id).Updates(updates).Error
}
