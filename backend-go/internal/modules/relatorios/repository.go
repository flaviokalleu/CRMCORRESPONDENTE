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

// ListImovelTipos agrega a contagem de imóveis por `tipo` (coluna not null),
// para o gráfico de rosca "distribuição da carteira por tipo de imóvel".
// Usa o construtor de queries do GORM (Model+Select+Group), nunca db.Raw:
// Raw não passa pelo Schema resolvido do GORM, então não recebe o filtro de
// tenant_id dos callbacks de internal/tenant (ver gotcha documentado em
// internal/modules/dashboards/service.go) — usar Raw aqui vazaria imóveis de
// outros tenants.
func (r *Repository) ListImovelTipos(ctx context.Context) (map[string]int, error) {
	var rows []struct {
		Tipo  string
		Total int
	}
	err := r.db.WithContext(ctx).Model(&models.Imovel{}).
		Select("tipo, count(*) as total").
		Group("tipo").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make(map[string]int, len(rows))
	for _, row := range rows {
		out[row.Tipo] = row.Total
	}
	return out, nil
}
