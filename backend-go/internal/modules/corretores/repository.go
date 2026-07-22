package corretores

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository acessa `users` filtrando is_corretor=true. Escopado por tenant via
// callbacks GORM (User não é global). Ver 01-spec §2.7.
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.User, error) {
	var u models.User
	if err := r.db.WithContext(ctx).Where("is_corretor = true").First(&u, id).Error; err != nil {
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

func (r *Repository) List(ctx context.Context, search string, page, limit int, all bool) ([]models.User, int64, error) {
	q := r.db.WithContext(ctx).Model(&models.User{}).Where("is_corretor = true")
	if search != "" {
		like := "%" + search + "%"
		q = q.Where("first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ? OR username ILIKE ?", like, like, like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var out []models.User
	query := q.Order("id DESC")
	if !all {
		if page < 1 {
			page = 1
		}
		if limit < 1 {
			limit = 10
		}
		query = query.Limit(limit).Offset((page - 1) * limit)
	}
	if err := query.Find(&out).Error; err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *Repository) Create(ctx context.Context, u *models.User) error {
	return r.db.WithContext(ctx).Create(u).Error
}

func (r *Repository) Update(ctx context.Context, id uint, updates map[string]any) error {
	if len(updates) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Model(&models.User{}).Where("id = ? AND is_corretor = true", id).Updates(updates).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Where("is_corretor = true").Delete(&models.User{}, id).Error
}
