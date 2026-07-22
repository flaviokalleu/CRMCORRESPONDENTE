package imoveis

import (
	"context"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// Filters replica os query params de listarImoveis (§2.3): categoria→tipo,
// localizacao (iLike), busca (Op.or em colunas REAIS do model — o Node busca
// em titulo/descricao/bairro/cidade, que não existem; aqui corrigimos para
// nome_imovel/descricao_imovel/endereco/tipo/localizacao, ver gotcha §6.10).
type Filters struct {
	Categoria   string
	Localizacao string
	Busca       string
	// ApenasDisponiveis restringe a "situacao_imovel = 'disponivel'" — usado
	// pela vitrine PÚBLICA para nunca vazar imóveis vendidos/reservados a
	// visitantes anônimos. Handlers internos (staff autenticado) deixam false.
	ApenasDisponiveis bool
}

func (r *Repository) List(ctx context.Context, f Filters) ([]models.Imovel, error) {
	q := r.db.WithContext(ctx).Model(&models.Imovel{})
	if f.Categoria != "" {
		q = q.Where("tipo = ?", f.Categoria)
	}
	if f.Localizacao != "" {
		q = q.Where("localizacao ILIKE ?", "%"+f.Localizacao+"%")
	}
	if f.Busca != "" {
		like := "%" + f.Busca + "%"
		q = q.Where(
			"nome_imovel ILIKE ? OR descricao_imovel ILIKE ? OR endereco ILIKE ? OR tipo ILIKE ? OR localizacao ILIKE ?",
			like, like, like, like, like,
		)
	}
	if f.ApenasDisponiveis {
		q = q.Where("situacao_imovel = ?", "disponivel")
	}
	var imoveis []models.Imovel
	err := q.Order(`"createdAt" DESC`).Find(&imoveis).Error
	return imoveis, err
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Imovel, error) {
	var im models.Imovel
	if err := r.db.WithContext(ctx).First(&im, id).Error; err != nil {
		return nil, err
	}
	return &im, nil
}

func (r *Repository) Create(ctx context.Context, im *models.Imovel) error {
	return r.db.WithContext(ctx).Create(im).Error
}

func (r *Repository) Save(ctx context.Context, im *models.Imovel) error {
	return r.db.WithContext(ctx).Save(im).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Imovel{}, id).Error
}

// Semelhantes devolve até `limit` imóveis com a mesma localizacao, excluindo o próprio id.
func (r *Repository) Semelhantes(ctx context.Context, id uint, localizacao string, limit int) ([]models.Imovel, error) {
	var imoveis []models.Imovel
	err := r.db.WithContext(ctx).
		Where("localizacao = ? AND id <> ?", localizacao, id).
		Limit(limit).
		Find(&imoveis).Error
	return imoveis, err
}
