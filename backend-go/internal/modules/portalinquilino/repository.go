package portalinquilino

import (
	"context"
	"encoding/json"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// FindByCPF busca o inquilino por CPF limpo (somente dígitos) OU formatado —
// replica a dupla tentativa do Node em `POST /api/portal/login`. Usa
// context.Background() (sem tenant scope) deliberadamente: o portal do
// inquilino não é tenant-scoped (04-spec §9).
func (r *Repository) FindByCPF(ctx context.Context, cpfLimpo, cpfFormatado string) (*models.ClienteAluguel, error) {
	var c models.ClienteAluguel
	err := r.db.WithContext(ctx).Where("cpf = ? OR cpf = ?", cpfLimpo, cpfFormatado).First(&c).Error
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.ClienteAluguel, error) {
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

func (r *Repository) ListCobrancas(ctx context.Context, clienteAluguelID uint) ([]models.CobrancaAluguel, error) {
	var out []models.CobrancaAluguel
	err := r.db.WithContext(ctx).
		Where("cliente_aluguel_id = ?", clienteAluguelID).
		Order("data_vencimento DESC").
		Find(&out).Error
	return out, err
}

func (r *Repository) ListRecibos(ctx context.Context, clienteAluguelID uint) ([]models.CobrancaAluguel, error) {
	var out []models.CobrancaAluguel
	err := r.db.WithContext(ctx).
		Where("cliente_aluguel_id = ? AND status IN ?", clienteAluguelID, []string{"CONFIRMED", "RECEIVED"}).
		Order("data_pagamento DESC").
		Find(&out).Error
	return out, err
}

func (r *Repository) FindCobranca(ctx context.Context, id uint) (*models.CobrancaAluguel, error) {
	var cob models.CobrancaAluguel
	if err := r.db.WithContext(ctx).First(&cob, id).Error; err != nil {
		return nil, err
	}
	return &cob, nil
}

// PermitirPortal lê `tenant.configuracoes.permitir_portal_inquilino` — default
// true (ausência de config ou tenant nulo não bloqueia, igual ao Node
// `!== false`).
func (r *Repository) PermitirPortal(ctx context.Context, tenantID *uint) bool {
	if tenantID == nil {
		return true
	}
	var t models.Tenant
	if err := r.db.WithContext(ctx).Select("configuracoes").First(&t, *tenantID).Error; err != nil {
		return true
	}
	if len(t.Configuracoes) == 0 {
		return true
	}
	var cfg map[string]any
	if err := json.Unmarshal(t.Configuracoes, &cfg); err != nil {
		return true
	}
	if v, ok := cfg["permitir_portal_inquilino"]; ok {
		if b, ok := v.(bool); ok {
			return b
		}
	}
	return true
}
