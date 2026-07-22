package relatorios

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository busca os clientes usados nas análises. Query Model-based —
// tenant_id é filtrado automaticamente pelos callbacks de internal/tenant
// (db.WithContext(ctx)). Corrige o gotcha crítico do relatório público
// (spec §"Observações críticas"): antes vazava todos os tenants.
type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ListClientes(ctx context.Context) ([]models.Cliente, error) {
	var out []models.Cliente
	err := r.db.WithContext(ctx).Find(&out).Error
	return out, err
}
