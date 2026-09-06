// Package vistorias implementa o CRUD de vistorias de entrada/saída
// (routes/vistoriaRoutes.js). Ver docs/migration/04-alugueis.md §7.
package vistorias

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"crmimob/internal/models"
	"crmimob/internal/tenant"
)

var ErrTenantScope = errors.New("vistoria fora do tenant atual")

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// Vistorias antigas não possuem tenant_id. O vínculo com cliente_aluguel é a
// fronteira de segurança: toda leitura e alteração precisa passar pelo
// subselect do cliente pertencente ao tenant do request.
func (r *Repository) scoped(ctx context.Context) *gorm.DB {
	db := r.db.WithContext(ctx)
	scope, ok := tenant.From(ctx)
	if !ok || scope.TenantID == nil {
		return db
	}
	return db.Where("vistoria_aluguels.cliente_aluguel_id IN (SELECT id FROM cliente_aluguels WHERE tenant_id = ?)", *scope.TenantID)
}

func (r *Repository) Create(ctx context.Context, v *models.VistoriaAluguel) error {
	if scope, ok := tenant.From(ctx); ok && scope.TenantID != nil {
		var count int64
		if err := r.db.WithContext(ctx).Model(&models.ClienteAluguel{}).
			Where("id = ? AND tenant_id = ?", v.ClienteAluguelID, *scope.TenantID).
			Count(&count).Error; err != nil {
			return err
		}
		if count != 1 {
			return ErrTenantScope
		}
		if v.AluguelID != nil {
			count = 0
			if err := r.db.WithContext(ctx).Model(&models.Aluguel{}).
				Where("id = ? AND tenant_id = ?", *v.AluguelID, *scope.TenantID).
				Count(&count).Error; err != nil {
				return err
			}
			if count != 1 {
				return ErrTenantScope
			}
		}
	}
	return r.db.WithContext(ctx).Create(v).Error
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.VistoriaAluguel, error) {
	var v models.VistoriaAluguel
	if err := r.scoped(ctx).Where("vistoria_aluguels.id = ?", id).First(&v).Error; err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *Repository) ListByCliente(ctx context.Context, clienteAluguelID uint) ([]models.VistoriaAluguel, error) {
	var out []models.VistoriaAluguel
	err := r.scoped(ctx).
		Where("cliente_aluguel_id = ?", clienteAluguelID).
		Order("data_vistoria DESC").
		Find(&out).Error
	return out, err
}

func (r *Repository) Save(ctx context.Context, v *models.VistoriaAluguel) error {
	result := r.scoped(ctx).Model(&models.VistoriaAluguel{}).Where("vistoria_aluguels.id = ?", v.ID).Updates(map[string]any{
		"cliente_aluguel_id": v.ClienteAluguelID,
		"aluguel_id":         v.AluguelID,
		"tipo":               v.Tipo,
		"data_vistoria":      v.DataVistoria,
		"observacoes_gerais": v.ObservacoesGerais,
		"checklist":          v.Checklist,
		"fotos":              v.Fotos,
		"pdf_url":            v.PdfURL,
		"status":             v.Status,
		"updated_at":         v.UpdatedAt,
	})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// UltimaPorTipo devolve a vistoria mais recente do inquilino para o tipo
// informado ("entrada"/"saida"), ou nil se não houver.
func (r *Repository) UltimaPorTipo(ctx context.Context, clienteAluguelID uint, tipo string) (*models.VistoriaAluguel, error) {
	var v models.VistoriaAluguel
	err := r.scoped(ctx).
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
