package correspondentes

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository acessa `users` filtrando is_correspondente=true. Escopado por
// tenant via callbacks GORM. Ver 01-spec §2.8.
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.User, error) {
	var u models.User
	if err := r.db.WithContext(ctx).Where("is_correspondente = true").First(&u, id).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) FindByEmailOrUsername(ctx context.Context, email, username string, excludeID *uint) (*models.User, error) {
	var u models.User
	q := r.db.WithContext(ctx).Where("email = ? OR username = ?", email, username)
	if excludeID != nil {
		q = q.Where("id <> ?", *excludeID)
	}
	if err := q.First(&u).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) List(ctx context.Context) ([]models.User, error) {
	var out []models.User
	err := r.db.WithContext(ctx).Where("is_correspondente = true").Order("id DESC").Find(&out).Error
	return out, err
}

func (r *Repository) Create(ctx context.Context, u *models.User) error {
	return r.db.WithContext(ctx).Create(u).Error
}

func (r *Repository) Update(ctx context.Context, id uint, updates map[string]any) error {
	if len(updates) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Model(&models.User{}).Where("id = ? AND is_correspondente = true", id).Updates(updates).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Where("is_correspondente = true").Delete(&models.User{}, id).Error
}
