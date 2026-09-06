package notas

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, n *models.Nota) error {
	return r.db.WithContext(ctx).Create(n).Error
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Nota, error) {
	var n models.Nota
	if err := r.db.WithContext(ctx).First(&n, id).Error; err != nil {
		return nil, err
	}
	return &n, nil
}

func (r *Repository) MarkConcluida(ctx context.Context, id uint) error {
	falseVal := false
	return r.db.WithContext(ctx).Model(&models.Nota{}).Where("id = ?", id).Update("nova", &falseVal).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Nota{}, id).Error
}

// ByCliente devolve todas as notas de um cliente (§2.4 GET /clientes/:id/notas),
// vazio (não erro) se nenhuma existir.
func (r *Repository) ByCliente(ctx context.Context, clienteID uint) ([]models.Nota, error) {
	var list []models.Nota
	err := r.db.WithContext(ctx).Preload("Criador").Where("cliente_id = ?", clienteID).Order("data_criacao DESC").Find(&list).Error
	return list, err
}

func (r *Repository) FindCliente(ctx context.Context, id uint) (*models.Cliente, error) {
	var c models.Cliente
	if err := r.db.WithContext(ctx).First(&c, id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) FindUser(ctx context.Context, id uint) (*models.User, error) {
	var u models.User
	if err := r.db.WithContext(ctx).First(&u, id).Error; err != nil {
		return nil, err
	}
	return &u, nil
}
