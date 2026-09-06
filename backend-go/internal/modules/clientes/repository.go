package clientes

import (
	"context"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository encapsula as queries GORM de Cliente. O isolamento de tenant é
// automático via callbacks (ver internal/tenant) — nenhuma query aqui filtra
// tenant_id manualmente, desde que db.WithContext(ctx) receba um contexto que
// passou por middleware.ResolveTenant.
type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// DB expõe o *gorm.DB subjacente para consultas ad-hoc que não justificam um
// método dedicado no repositório (ex.: listaclientes_handler.go, que replica
// uma superfície de rota alternativa sobre o mesmo model).
func (r *Repository) DB() *gorm.DB { return r.db }

// ListFilters replica os filtros de GET /api/clientes (§2.1).
type ListFilters struct {
	Recentes   bool
	Page       int
	Limit      int
	Search     string
	Status     string
	Corretor   string // filtra por user_id quando admin/correspondente escolhe um corretor
	OnlyUserID *uint  // corretor só vê os próprios (userId=self)
	Inicio     *time.Time
	Fim        *time.Time // exclusivo
}

// List devolve os clientes paginados + total, com `user` e `notas(id)` carregados
// (para NotasCount), ordenados por created_at DESC.
func (r *Repository) List(ctx context.Context, f ListFilters) ([]models.Cliente, int64, error) {
	q := r.db.WithContext(ctx).Model(&models.Cliente{})

	if f.OnlyUserID != nil {
		q = q.Where("user_id = ?", *f.OnlyUserID)
	} else if f.Corretor != "" {
		q = q.Where("user_id = ?", f.Corretor)
	}
	if f.Status != "" {
		if f.Status == "atencao" {
			// Filtro agregado usado pelo dashboard: espelha exatamente a mesma
			// definição da fila de atenção do módulo de dashboards.
			q = q.Where(
				"(status ILIKE ? OR status ILIKE ? OR status ILIKE ? OR status ILIKE ? OR status = ?)",
				"%aguardando%", "%pendente%", "%análise%", "%em análise%", "aguardando_aprovacao",
			)
		} else {
			q = q.Where("status = ?", f.Status)
		}
	}
	if f.Search != "" {
		like := "%" + f.Search + "%"
		q = q.Where("nome ILIKE ? OR email ILIKE ? OR cpf ILIKE ?", like, like, like)
	}
	if f.Inicio != nil {
		q = q.Where("created_at >= ?", *f.Inicio)
	}
	if f.Fim != nil {
		q = q.Where("created_at < ?", *f.Fim)
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
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	// O dashboard solicita ordem cronológica; a fila mantém sua prioridade.
	if !f.Recentes {
		q = q.Order("(status = 'aguardando_aprovacao') DESC")
	}
	var clientes []models.Cliente
	err := q.Preload("User").
		Preload("Notas", func(db *gorm.DB) *gorm.DB { return db.Select("id", "cliente_id") }).
		Order("created_at DESC").Order("id DESC").
		Limit(limit).Offset((page - 1) * limit).
		Find(&clientes).Error
	return clientes, total, err
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Cliente, error) {
	var c models.Cliente
	if err := r.db.WithContext(ctx).Preload("Notas").First(&c, id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

// FindByCPF é usado para detectar duplicidade de CPF na criação (§2.1).
func (r *Repository) FindByCPF(ctx context.Context, cpf string) (*models.Cliente, error) {
	var c models.Cliente
	if err := r.db.WithContext(ctx).Where("cpf = ?", cpf).First(&c).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *Repository) Create(ctx context.Context, c *models.Cliente) error {
	return r.db.WithContext(ctx).Create(c).Error
}

func (r *Repository) Save(ctx context.Context, c *models.Cliente) error {
	return r.db.WithContext(ctx).Save(c).Error
}

func (r *Repository) UpdateStatus(ctx context.Context, id uint, status string) error {
	return r.db.WithContext(ctx).Model(&models.Cliente{}).Where("id = ?", id).Update("status", status).Error
}

// UpdateDocumentField grava o caminho do documento processado numa coluna
// específica (documentTypeMap) — usado no fluxo de upload.
func (r *Repository) UpdateDocumentField(ctx context.Context, id uint, column string, value *string) error {
	return r.db.WithContext(ctx).Model(&models.Cliente{}).Where("id = ?", id).Update(column, value).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Cliente{}, id).Error
}
