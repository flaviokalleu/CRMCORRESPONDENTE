package simulacoes

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository encapsula acesso a `simulacoes`. Toda query usa db.WithContext(ctx)
// — o filtro tenant_id é injetado pelos callbacks globais de internal/tenant
// (o model Simulacao tem a coluna tenant_id). Corrige o gotcha §2 do spec: o
// Node só filtrava listagens por user_id, sem tenant_id.
type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, s *models.Simulacao) error {
	return r.db.WithContext(ctx).Create(s).Error
}

// ListByCliente devolve as simulações de um cliente, mais recentes primeiro,
// com o autor (user) carregado.
func (r *Repository) ListByCliente(ctx context.Context, clienteID uint) ([]models.Simulacao, error) {
	var out []models.Simulacao
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("cliente_id = ?", clienteID).
		Order("created_at DESC").
		Find(&out).Error
	return out, err
}

// List pagina as simulações do usuário autenticado (spec: `WHERE user_id = req.user.id`,
// tenant_id vem do callback).
func (r *Repository) List(ctx context.Context, userID uint, page, limit int) ([]models.Simulacao, int64, error) {
	q := r.db.WithContext(ctx).Model(&models.Simulacao{}).Where("user_id = ?", userID)

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var out []models.Simulacao
	offset := (page - 1) * limit
	err := r.db.WithContext(ctx).
		Preload("Cliente").Preload("User").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&out).Error
	return out, total, err
}

// Delete remove a simulação SE for do usuário dono (`WHERE id AND user_id`).
// RowsAffected==0 sinaliza 404 para o handler (não é dono ou não existe).
func (r *Repository) Delete(ctx context.Context, id, userID uint) (int64, error) {
	res := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&models.Simulacao{})
	return res.RowsAffected, res.Error
}
