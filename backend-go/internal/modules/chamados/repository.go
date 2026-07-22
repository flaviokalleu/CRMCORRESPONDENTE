// Package chamados implementa os chamados de manutenção abertos pelo
// inquilino (routes/chamadoRoutes.js). Ver docs/migration/04-alugueis.md §8.
package chamados

import (
	"context"
	"sort"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, ch *models.ChamadoManutencao) error {
	return r.db.WithContext(ctx).Create(ch).Error
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.ChamadoManutencao, error) {
	var ch models.ChamadoManutencao
	if err := r.db.WithContext(ctx).First(&ch, id).Error; err != nil {
		return nil, err
	}
	return &ch, nil
}

func (r *Repository) Save(ctx context.Context, ch *models.ChamadoManutencao) error {
	return r.db.WithContext(ctx).Save(ch).Error
}

func (r *Repository) ListByCliente(ctx context.Context, clienteAluguelID uint) ([]models.ChamadoManutencao, error) {
	var out []models.ChamadoManutencao
	err := r.db.WithContext(ctx).
		Where("cliente_aluguel_id = ?", clienteAluguelID).
		Order("created_at DESC").
		Find(&out).Error
	return out, err
}

type ListFiltro struct {
	Status     string
	Prioridade string
}

// ListAdmin lista todos os chamados (opcionalmente filtrados) ordenados por
// prioridade (urgente>alta>media>outros) — o `CASE` SQL do Node é replicado
// em memória via models.PrioridadeOrdem, evitando SQL específico de dialeto.
func (r *Repository) ListAdmin(ctx context.Context, f ListFiltro) ([]models.ChamadoManutencao, error) {
	q := r.db.WithContext(ctx).Model(&models.ChamadoManutencao{})
	if f.Status != "" {
		q = q.Where("status = ?", f.Status)
	}
	if f.Prioridade != "" {
		q = q.Where("prioridade = ?", f.Prioridade)
	}
	var out []models.ChamadoManutencao
	if err := q.Find(&out).Error; err != nil {
		return nil, err
	}
	sort.SliceStable(out, func(i, j int) bool {
		return models.PrioridadeOrdem(out[i].Prioridade) < models.PrioridadeOrdem(out[j].Prioridade)
	})
	return out, nil
}

func (r *Repository) FindInquilino(ctx context.Context, id uint) (*models.ClienteAluguel, error) {
	var c models.ClienteAluguel
	if err := r.db.WithContext(ctx).First(&c, id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

// Resumo conta chamados por status/prioridade (contadores globais do tenant
// do contexto — ver 04-spec Gotcha 7 quanto a padronização de isolamento).
func (r *Repository) Resumo(ctx context.Context) (total, abertos, emAndamento, resolvidos, urgentes int64, err error) {
	base := r.db.WithContext(ctx).Model(&models.ChamadoManutencao{})
	if err = base.Count(&total).Error; err != nil {
		return
	}
	if err = r.db.WithContext(ctx).Model(&models.ChamadoManutencao{}).Where("status = ?", "aberto").Count(&abertos).Error; err != nil {
		return
	}
	if err = r.db.WithContext(ctx).Model(&models.ChamadoManutencao{}).Where("status = ?", "em_andamento").Count(&emAndamento).Error; err != nil {
		return
	}
	if err = r.db.WithContext(ctx).Model(&models.ChamadoManutencao{}).Where("status = ?", "resolvido").Count(&resolvidos).Error; err != nil {
		return
	}
	err = r.db.WithContext(ctx).Model(&models.ChamadoManutencao{}).Where("prioridade = ?", "urgente").Count(&urgentes).Error
	return
}
