package acessos

import (
	"context"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, a *models.Acesso) error {
	return r.db.WithContext(ctx).Create(a).Error
}

func (r *Repository) FindCliente(ctx context.Context, id uint) (*models.Cliente, error) {
	var c models.Cliente
	if err := r.db.WithContext(ctx).First(&c, id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

// ListFilters replica os query params de GET /api/acessos (§2.6).
type ListFilters struct {
	Page       int
	Limit      int
	Country    string
	StartDate  *time.Time
	EndDate    *time.Time
	UserID     string
	DeviceType string
	Search     string
}

func (r *Repository) List(ctx context.Context, f ListFilters) ([]models.Acesso, int64, error) {
	q := r.db.WithContext(ctx).Model(&models.Acesso{})
	if f.Country != "" {
		q = q.Where("geo_country = ?", f.Country)
	}
	if f.StartDate != nil {
		q = q.Where("timestamp >= ?", *f.StartDate)
	}
	if f.EndDate != nil {
		q = q.Where("timestamp <= ?", *f.EndDate)
	}
	if f.UserID != "" {
		q = q.Where("user_id = ?", f.UserID)
	}
	if f.DeviceType != "" {
		q = q.Where("device_type = ?", f.DeviceType)
	}
	if f.Search != "" {
		q = q.Joins("JOIN users ON users.id = acessos.user_id").
			Where("users.first_name ILIKE ? OR users.last_name ILIKE ? OR users.email ILIKE ?",
				"%"+f.Search+"%", "%"+f.Search+"%", "%"+f.Search+"%")
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := f.Page
	if page < 1 {
		page = 1
	}
	limit := f.Limit
	if limit < 1 {
		limit = 20
	}

	var list []models.Acesso
	err := q.Preload("User").Order("timestamp DESC").
		Limit(limit).Offset((page - 1) * limit).
		Find(&list).Error
	return list, total, err
}

func (r *Repository) Realtime(ctx context.Context, since time.Time) ([]models.Acesso, error) {
	var list []models.Acesso
	err := r.db.WithContext(ctx).Where("timestamp >= ?", since).Order("timestamp DESC").Find(&list).Error
	return list, err
}

func (r *Repository) ByUser(ctx context.Context, userID uint, page, limit int) ([]models.Acesso, int64, error) {
	q := r.db.WithContext(ctx).Model(&models.Acesso{}).Where("user_id = ?", userID)
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	var list []models.Acesso
	err := q.Order("timestamp DESC").Limit(limit).Offset((page - 1) * limit).Find(&list).Error
	return list, total, err
}

// StatsSince agrega contagens simples desde `since` — usado por /stats.
func (r *Repository) CountSince(ctx context.Context, since time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Acesso{}).Where("timestamp >= ?", since).Count(&count).Error
	return count, err
}

type HourCount struct {
	Hour  int
	Count int64
}

func (r *Repository) PeakHoursSince(ctx context.Context, since time.Time) ([]HourCount, error) {
	var rows []HourCount
	err := r.db.WithContext(ctx).Model(&models.Acesso{}).
		Select("EXTRACT(HOUR FROM timestamp)::int AS hour, COUNT(*) AS count").
		Where("timestamp >= ?", since).
		Group("hour").Order("hour").
		Scan(&rows).Error
	return rows, err
}

type PageCount struct {
	Page  string
	Count int64
}

func (r *Repository) TopPagesSince(ctx context.Context, since time.Time, limit int) ([]PageCount, error) {
	var rows []PageCount
	err := r.db.WithContext(ctx).Model(&models.Acesso{}).
		Select("page, COUNT(*) AS count").
		Where("timestamp >= ?", since).
		Group("page").Order("count DESC").Limit(limit).
		Scan(&rows).Error
	return rows, err
}

type DeviceCount struct {
	DeviceType string
	Count      int64
}

func (r *Repository) DeviceStatsSince(ctx context.Context, since time.Time) ([]DeviceCount, error) {
	var rows []DeviceCount
	err := r.db.WithContext(ctx).Model(&models.Acesso{}).
		Select("device_type, COUNT(*) AS count").
		Where("timestamp >= ?", since).
		Group("device_type").
		Scan(&rows).Error
	return rows, err
}

type UserCount struct {
	UserID uint
	Count  int64
}

func (r *Repository) TopUsersSince(ctx context.Context, since time.Time, limit int) ([]UserCount, error) {
	var rows []UserCount
	err := r.db.WithContext(ctx).Model(&models.Acesso{}).
		Select("user_id, COUNT(*) AS count").
		Where("timestamp >= ? AND user_id IS NOT NULL", since).
		Group("user_id").Order("count DESC").Limit(limit).
		Scan(&rows).Error
	return rows, err
}
