package laudos

import (
	"context"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// Repository encapsula acesso a `laudos`. tenant_id é injetado/filtrado
// automaticamente pelos callbacks globais de internal/tenant (db.WithContext)
// — correção deliberada do gotcha §8 (o model Node não tinha tenant_id).
type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

// DB devolve a conexão subjacente — usada pelo handler para abrir transações
// (criação/atualização/remoção de laudo + arquivos).
func (r *Repository) DB() *gorm.DB {
	return r.db
}

func (r *Repository) Create(ctx context.Context, l *models.Laudo) error {
	return r.db.WithContext(ctx).Create(l).Error
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Laudo, error) {
	var l models.Laudo
	err := r.db.WithContext(ctx).Preload("User").First(&l, id).Error
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *Repository) Update(ctx context.Context, l *models.Laudo) error {
	return r.db.WithContext(ctx).Save(l).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) (int64, error) {
	res := r.db.WithContext(ctx).Delete(&models.Laudo{}, id)
	return res.RowsAffected, res.Error
}

// List aplica os filtros de busca/parceiro/tipo/status (o filtro de status é
// calculado em SQL sobre `vencimento`, já que não é uma coluna persistida).
func (r *Repository) List(ctx context.Context, f ListFilters, now time.Time) ([]models.Laudo, int64, error) {
	base := r.db.WithContext(ctx).Model(&models.Laudo{})
	base = applyListFilters(base, f, now)

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	q := applyListFilters(r.db.WithContext(ctx).Preload("User"), f, now)
	var out []models.Laudo
	offset := (f.Page - 1) * f.Limit
	err := q.Order("created_at DESC").Limit(f.Limit).Offset(offset).Find(&out).Error
	return out, total, err
}

func applyListFilters(q *gorm.DB, f ListFilters, now time.Time) *gorm.DB {
	q = q.Model(&models.Laudo{})
	if f.Search != "" {
		like := "%" + f.Search + "%"
		q = q.Where("parceiro ILIKE ? OR endereco ILIKE ? OR observacoes ILIKE ?", like, like, like)
	}
	if f.Parceiro != "" {
		q = q.Where("parceiro = ?", f.Parceiro)
	}
	if f.TipoImovel != "" {
		q = q.Where("tipo_imovel = ?", f.TipoImovel)
	}
	switch f.Status {
	case "vencidos":
		q = q.Where("vencimento < ?", now)
	case "vencendo":
		q = q.Where("vencimento >= ? AND vencimento <= ?", now, now.AddDate(0, 1, 0))
	case "vigentes":
		q = q.Where("vencimento > ?", now.AddDate(0, 1, 0))
	}
	return q
}

// Estatisticas calcula as agregações de GET /laudos/relatorios/estatisticas.
// Todas as queries são Model-based (db.Model(&models.Laudo{})) — o filtro de
// tenant é aplicado automaticamente pelos callbacks GORM.
func (r *Repository) Estatisticas(ctx context.Context, now time.Time) (*EstatisticasResponse, error) {
	db := r.db.WithContext(ctx)
	resp := &EstatisticasResponse{}

	if err := db.Model(&models.Laudo{}).Count(&resp.Resumo.TotalLaudos).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&models.Laudo{}).Where("vencimento < ?", now).Count(&resp.Resumo.Vencidos).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&models.Laudo{}).Where("vencimento >= ? AND vencimento <= ?", now, now.AddDate(0, 1, 0)).
		Count(&resp.Resumo.Vencendo).Error; err != nil {
		return nil, err
	}
	if err := db.Model(&models.Laudo{}).Where("vencimento > ?", now.AddDate(0, 1, 0)).
		Count(&resp.Resumo.Vigentes).Error; err != nil {
		return nil, err
	}

	if err := db.Model(&models.Laudo{}).Select("tipo_imovel, COUNT(id) as count").
		Group("tipo_imovel").Scan(&resp.LaudosPorTipo).Error; err != nil {
		return nil, err
	}

	if err := db.Model(&models.Laudo{}).
		Select("parceiro, COUNT(id) as count, COALESCE(SUM(valor_solicitado),0) as valor_solicitado, COALESCE(SUM(valor_liberado),0) as valor_liberado").
		Group("parceiro").Order("COUNT(id) DESC").Scan(&resp.LaudosPorParceiro).Error; err != nil {
		return nil, err
	}

	type totais struct {
		TotalSolicitado float64
		TotalLiberado   float64
	}
	var t totais
	if err := db.Model(&models.Laudo{}).
		Select("COALESCE(SUM(valor_solicitado),0) as total_solicitado, COALESCE(SUM(valor_liberado),0) as total_liberado").
		Scan(&t).Error; err != nil {
		return nil, err
	}
	resp.Valores.TotalSolicitado = t.TotalSolicitado
	resp.Valores.TotalLiberado = t.TotalLiberado

	return resp, nil
}
