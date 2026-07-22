package pagamentos

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
	"crmimob/internal/tenant"
)

// Repository acessa `pagamentos`. Toda query usa db.WithContext(ctx) para que
// os callbacks GORM de tenant (internal/tenant) apliquem o escopo automático.
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, p *models.Pagamento) error {
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Pagamento, error) {
	var p models.Pagamento
	if err := r.db.WithContext(ctx).First(&p, id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) FindByAsaasPaymentID(ctx context.Context, asaasID string) (*models.Pagamento, error) {
	var p models.Pagamento
	if err := r.db.WithContext(ctx).Where("asaas_payment_id = ?", asaasID).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) FindByLinkUnico(ctx context.Context, link string) (*models.Pagamento, error) {
	var p models.Pagamento
	if err := r.db.WithContext(ctx).Where("link_unico = ?", link).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

type ListFilter struct {
	Status    string
	Tipo      string
	ClienteID uint
	CreatedBy *uint // não-nulo restringe a criador (não-admin)
	Offset    int
	Limit     int
}

func (r *Repository) List(ctx context.Context, f ListFilter) ([]models.Pagamento, int64, error) {
	q := r.db.WithContext(ctx).Model(&models.Pagamento{})
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.Tipo != "" {
		q = q.Where("tipo = ?", f.Tipo)
	}
	if f.ClienteID != 0 {
		q = q.Where("cliente_id = ?", f.ClienteID)
	}
	if f.CreatedBy != nil {
		q = q.Where("created_by = ?", *f.CreatedBy)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []models.Pagamento
	if err := q.Order("created_at DESC").Offset(f.Offset).Limit(f.Limit).Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *Repository) Update(ctx context.Context, id uint, updates map[string]any) error {
	return r.db.WithContext(ctx).Model(&models.Pagamento{}).Where("id = ?", id).Updates(updates).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Pagamento{}, id).Error
}

// clienteBasico é uma projeção mínima da tabela `clientes` (modelo Cliente
// pertence a outro módulo, fora deste escopo). Usa a tabela diretamente via
// Table(), o que NÃO passa pelo schema do GORM — por isso o filtro de tenant é
// aplicado manualmente aqui a partir do tenant.Scope do contexto (mesma regra
// de segurança dos callbacks, replicada à mão para este caso pontual).
type clienteBasico struct {
	ID       uint   `gorm:"column:id"`
	Nome     string `gorm:"column:nome"`
	CPF      string `gorm:"column:cpf"`
	Email    string `gorm:"column:email"`
	Telefone string `gorm:"column:telefone"`
}

func (r *Repository) findClienteBasico(ctx context.Context, id uint) (*clienteBasico, error) {
	q := r.db.WithContext(ctx).Table("clientes").Where("id = ?", id)
	if scope, ok := tenant.From(ctx); ok && scope.TenantID != nil {
		q = q.Where("tenant_id = ?", *scope.TenantID)
	}
	var c clienteBasico
	if err := q.Select("id, nome, cpf, email, telefone").Scan(&c).Error; err != nil {
		return nil, err
	}
	if c.ID == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &c, nil
}

func (r *Repository) findTenant(ctx context.Context, tenantID uint) (*models.Tenant, error) {
	var t models.Tenant
	if err := r.db.WithContext(ctx).First(&t, tenantID).Error; err != nil {
		return nil, err
	}
	return &t, nil
}
