// Package pessoas implementa o núcleo de identidade compartilhado pelas três
// fichas de papel (clientes, cliente_aluguels, proprietario).
//
// Isolamento por tenant é automático: models.Pessoa tem tenant_id, então os
// callbacks de internal/tenant injetam o filtro em toda query feita com
// db.WithContext(ctx). Não escrever WHERE tenant_id à mão.
package pessoas

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// listQuery monta a query de listagem. Separado de List para ser inspecionável
// em teste com DryRun.
func (r *Repository) listQuery(ctx context.Context, papel, busca string) *gorm.DB {
	q := r.db.WithContext(ctx).Model(&models.Pessoa{})

	switch papel {
	case "comprador":
		q = q.Where("EXISTS (SELECT 1 FROM clientes c WHERE c.pessoa_id = pessoas.id)")
	case "inquilino":
		q = q.Where("EXISTS (SELECT 1 FROM cliente_aluguels ca WHERE ca.pessoa_id = pessoas.id)")
	case "proprietario":
		q = q.Where("EXISTS (SELECT 1 FROM proprietario p WHERE p.pessoa_id = pessoas.id)")
	}

	if busca != "" {
		like := "%" + busca + "%"
		q = q.Where("nome ILIKE ? OR cpf ILIKE ? OR email ILIKE ?", like, like, like)
	}

	return q.Order("nome ASC")
}

func (r *Repository) List(ctx context.Context, papel, busca string) ([]models.Pessoa, error) {
	var out []models.Pessoa
	err := r.listQuery(ctx, papel, busca).Find(&out).Error
	return out, err
}

func (r *Repository) FindByID(ctx context.Context, id uint) (*models.Pessoa, error) {
	var p models.Pessoa
	if err := r.db.WithContext(ctx).First(&p, id).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

// FindByCPF devolve (nil, nil) quando não há pessoa com aquele CPF no tenant —
// "não existe" é resposta esperada no fluxo de cadastro, não erro.
func (r *Repository) FindByCPF(ctx context.Context, cpf string) (*models.Pessoa, error) {
	var p models.Pessoa
	err := r.db.WithContext(ctx).Where("cpf = ?", cpf).First(&p).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *Repository) Create(ctx context.Context, p *models.Pessoa) error {
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *Repository) Update(ctx context.Context, p *models.Pessoa) error {
	return r.db.WithContext(ctx).Save(p).Error
}

// Papeis deriva os papéis da pessoa pela existência de ficha em cada tabela.
// Não há coluna de papel: a ficha É o papel.
func (r *Repository) Papeis(ctx context.Context, pessoaID uint) (models.Papeis, error) {
	var out models.Papeis
	db := r.db.WithContext(ctx)

	var n int64
	if err := db.Model(&models.Cliente{}).Where("pessoa_id = ?", pessoaID).Count(&n).Error; err != nil {
		return out, err
	}
	out.Comprador = n > 0

	if err := db.Model(&models.ClienteAluguel{}).Where("pessoa_id = ?", pessoaID).Count(&n).Error; err != nil {
		return out, err
	}
	out.Inquilino = n > 0

	if err := db.Model(&models.Proprietario{}).Where("pessoa_id = ?", pessoaID).Count(&n).Error; err != nil {
		return out, err
	}
	out.Proprietario = n > 0

	return out, nil
}
