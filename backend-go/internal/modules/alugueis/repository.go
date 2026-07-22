// Package alugueis implementa o CRUD de imóveis de locação (Aluguel),
// inquilinos (ClienteAluguel) e suas cobranças (CobrancaAluguel).
// Ver docs/migration/04-alugueis.md §1-2.
package alugueis

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// --- Aluguel (imóvel de locação) ---

func (r *Repository) ListAlugueis(ctx context.Context) ([]models.Aluguel, error) {
	var out []models.Aluguel
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&out).Error
	return out, err
}

// ListAlugueisDisponiveis devolve imóveis ainda não alugados (para vincular
// a um novo inquilino). GET /api/alugueis-disponiveis.
func (r *Repository) ListAlugueisDisponiveis(ctx context.Context) ([]models.Aluguel, error) {
	var out []models.Aluguel
	err := r.db.WithContext(ctx).Where("alugado = ?", false).Order("created_at DESC").Find(&out).Error
	return out, err
}

func (r *Repository) FindAluguelByID(ctx context.Context, id uint) (*models.Aluguel, error) {
	var a models.Aluguel
	if err := r.db.WithContext(ctx).First(&a, id).Error; err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *Repository) CreateAluguel(ctx context.Context, a *models.Aluguel) error {
	return r.db.WithContext(ctx).Create(a).Error
}

func (r *Repository) SaveAluguel(ctx context.Context, a *models.Aluguel) error {
	return r.db.WithContext(ctx).Save(a).Error
}

func (r *Repository) DeleteAluguel(ctx context.Context, id uint) (int64, error) {
	res := r.db.WithContext(ctx).Delete(&models.Aluguel{}, id)
	return res.RowsAffected, res.Error
}

// --- ClienteAluguel (inquilino) ---

func (r *Repository) ListInquilinos(ctx context.Context) ([]models.ClienteAluguel, error) {
	var out []models.ClienteAluguel
	err := r.db.WithContext(ctx).Order("id DESC").Find(&out).Error
	return out, err
}

func (r *Repository) FindInquilinoByID(ctx context.Context, id uint) (*models.ClienteAluguel, error) {
	var c models.ClienteAluguel
	if err := r.db.WithContext(ctx).First(&c, id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) CreateInquilino(ctx context.Context, c *models.ClienteAluguel) error {
	return r.db.WithContext(ctx).Create(c).Error
}

func (r *Repository) SaveInquilino(ctx context.Context, c *models.ClienteAluguel) error {
	return r.db.WithContext(ctx).Save(c).Error
}

// DeleteInquilinoComCobrancas apaga as cobranças filhas e o inquilino numa
// transação (equivalente ao `destroy` em cascata manual do Node).
func (r *Repository) DeleteInquilinoComCobrancas(ctx context.Context, id uint) (int64, error) {
	var affected int64
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("cliente_aluguel_id = ?", id).Delete(&models.CobrancaAluguel{}).Error; err != nil {
			return err
		}
		res := tx.Delete(&models.ClienteAluguel{}, id)
		affected = res.RowsAffected
		return res.Error
	})
	return affected, err
}

// --- CobrancaAluguel ---

func (r *Repository) ListCobrancasDoInquilino(ctx context.Context, clienteAluguelID uint) ([]models.CobrancaAluguel, error) {
	var out []models.CobrancaAluguel
	err := r.db.WithContext(ctx).
		Where("cliente_aluguel_id = ?", clienteAluguelID).
		Order("data_vencimento DESC").
		Find(&out).Error
	return out, err
}

func (r *Repository) CreateCobranca(ctx context.Context, cob *models.CobrancaAluguel) error {
	return r.db.WithContext(ctx).Create(cob).Error
}

func (r *Repository) SaveCobranca(ctx context.Context, cob *models.CobrancaAluguel) error {
	return r.db.WithContext(ctx).Save(cob).Error
}

func (r *Repository) FindCobrancaByAsaasID(ctx context.Context, asaasPaymentID string) (*models.CobrancaAluguel, error) {
	var c models.CobrancaAluguel
	if err := r.db.WithContext(ctx).Where("asaas_payment_id = ?", asaasPaymentID).First(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

// TenantAsaasAPIKey busca a chave Asaas configurada para o tenant (tabela
// global `tenants`, fora do scope deste módulo). Devolve "" se ausente —
// os fluxos deste módulo tratam isso como "Asaas não configurado" e
// continuam sem bloquear (04-spec §2).
func (r *Repository) TenantAsaasAPIKey(ctx context.Context, tenantID uint) string {
	var t models.Tenant
	if err := r.db.WithContext(ctx).Select("asaas_api_key").First(&t, tenantID).Error; err != nil {
		return ""
	}
	if t.AsaasAPIKey == nil {
		return ""
	}
	return *t.AsaasAPIKey
}
