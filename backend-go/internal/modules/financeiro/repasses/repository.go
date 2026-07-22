package repasses

import (
	"context"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/models"
	"crmimob/internal/tenant"
)

// Repository acessa `repasse_proprietarios` (models.RepasseProprietario, neste
// escopo) e faz leituras pontuais em `cliente_aluguels`/`cobranca_aluguels`
// (tabelas do módulo de aluguéis, FORA deste escopo — não há struct de modelo
// aqui de propósito). As leituras usam Table() + filtro manual de tenant via
// tenant.From(ctx), replicando a mesma regra de segurança dos callbacks GORM
// para esse caso pontual (mesmo padrão usado em modules/pagamentos).
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, m *models.RepasseProprietario) error {
	return r.db.WithContext(ctx).Create(m).Error
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.RepasseProprietario, error) {
	var m models.RepasseProprietario
	if err := r.db.WithContext(ctx).First(&m, id).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *Repository) FindByCobrancaAluguelID(ctx context.Context, cobrancaID uint) (*models.RepasseProprietario, error) {
	var m models.RepasseProprietario
	if err := r.db.WithContext(ctx).Where("cobranca_aluguel_id = ?", cobrancaID).First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

type ListFilter struct {
	MesReferencia  string
	Status         string
	TransferStatus string
}

func (r *Repository) List(ctx context.Context, f ListFilter) ([]models.RepasseProprietario, error) {
	q := r.db.WithContext(ctx).Model(&models.RepasseProprietario{})
	if f.MesReferencia != "" {
		q = q.Where("mes_referencia = ?", f.MesReferencia)
	}
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.TransferStatus != "" {
		q = q.Where("transfer_status = ?", f.TransferStatus)
	}
	var rows []models.RepasseProprietario
	if err := q.Order("created_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *Repository) Update(ctx context.Context, id uint, updates map[string]any) error {
	return r.db.WithContext(ctx).Model(&models.RepasseProprietario{}).Where("id = ?", id).Updates(updates).Error
}

// --- Projeções somente-leitura em tabelas do módulo de aluguéis ---

// CobrancaAluguelRow é uma projeção mínima de `cobranca_aluguels`.
type CobrancaAluguelRow struct {
	ID               uint      `gorm:"column:id"`
	ClienteAluguelID uint      `gorm:"column:cliente_aluguel_id"`
	AsaasPaymentID   string    `gorm:"column:asaas_payment_id"`
	Valor            float64   `gorm:"column:valor"`
	DataVencimento   time.Time `gorm:"column:data_vencimento"`
	Status           string    `gorm:"column:status"`
}

// ClienteAluguelRow é uma projeção mínima de `cliente_aluguels`.
type ClienteAluguelRow struct {
	ID                  uint    `gorm:"column:id"`
	ValorAluguel        float64 `gorm:"column:valor_aluguel"`
	TaxaAdministracao   float64 `gorm:"column:taxa_administracao"`
	CorretorPercentual  float64 `gorm:"column:corretor_percentual"`
	ProprietarioPix     string  `gorm:"column:proprietario_pix"`
	ProprietarioNome    string  `gorm:"column:proprietario_nome"`
	ProprietarioTelefone string `gorm:"column:proprietario_telefone"`
	PercentualMulta     float64 `gorm:"column:percentual_multa"`
	PercentualJurosMora float64 `gorm:"column:percentual_juros_mora"`
}

func (r *Repository) cobrancasConfirmadasDoMes(ctx context.Context, mes string) ([]CobrancaAluguelRow, error) {
	q := r.db.WithContext(ctx).Table("cobranca_aluguels").
		Where("status IN ?", []string{"CONFIRMED", "RECEIVED"}).
		Where("to_char(data_vencimento, 'YYYY-MM') = ?", mes)
	q = applyTenantFilter(ctx, q)
	var rows []CobrancaAluguelRow
	if err := q.Select("id, cliente_aluguel_id, asaas_payment_id, valor, data_vencimento, status").Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *Repository) cobrancasOverdue(ctx context.Context, clienteAluguelID uint) ([]CobrancaAluguelRow, error) {
	q := r.db.WithContext(ctx).Table("cobranca_aluguels").
		Where("cliente_aluguel_id = ? AND status = ?", clienteAluguelID, "OVERDUE")
	q = applyTenantFilter(ctx, q)
	var rows []CobrancaAluguelRow
	if err := q.Select("id, cliente_aluguel_id, asaas_payment_id, valor, data_vencimento, status").Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *Repository) clienteAluguel(ctx context.Context, id uint) (*ClienteAluguelRow, error) {
	q := r.db.WithContext(ctx).Table("cliente_aluguels").Where("id = ?", id)
	q = applyTenantFilter(ctx, q)
	var row ClienteAluguelRow
	if err := q.Select("id, valor_aluguel, taxa_administracao, corretor_percentual, proprietario_pix, proprietario_nome, proprietario_telefone, percentual_multa, percentual_juros_mora").
		Scan(&row).Error; err != nil {
		return nil, err
	}
	if row.ID == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &row, nil
}

func applyTenantFilter(ctx context.Context, q *gorm.DB) *gorm.DB {
	if scope, ok := tenant.From(ctx); ok && scope.TenantID != nil {
		return q.Where("tenant_id = ?", *scope.TenantID)
	}
	return q
}
