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

	// GORM nunca interpreta SQL cru: o callback global de tenant (internal/tenant)
	// só enxerga statements que ele monta, então não alcança o SELECT interno do
	// EXISTS abaixo. Por isso, e só aqui, o filtro de tenant é escrito à mão —
	// correlacionado com pessoas.tenant_id da linha externa, não com um parâmetro,
	// para funcionar não importa qual seja o tenant do chamador. Sem isso, uma
	// ficha de outro tenant apontando para esta pessoa faria a pessoa aparecer no
	// filtro de papel do tenant errado (não há FK composta ligando o tenant da
	// ficha ao da pessoa — ver migrations/0004_pessoas.up.sql).
	// cliente_aluguels.tenant_id e proprietario.tenant_id são anuláveis; a
	// comparação "=" não casa com NULL, então uma ficha sem tenant simplesmente
	// não conta para nenhum tenant — comportamento intencional, não bug.
	switch papel {
	case "comprador":
		q = q.Where("EXISTS (SELECT 1 FROM clientes c WHERE c.pessoa_id = pessoas.id AND c.tenant_id = pessoas.tenant_id)")
	case "inquilino":
		q = q.Where("EXISTS (SELECT 1 FROM cliente_aluguels ca WHERE ca.pessoa_id = pessoas.id AND ca.tenant_id = pessoas.tenant_id)")
	case "proprietario":
		q = q.Where("EXISTS (SELECT 1 FROM proprietario p WHERE p.pessoa_id = pessoas.id AND p.tenant_id = pessoas.tenant_id)")
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

// findByCPFQuery monta a query de busca por CPF. Separado de FindByCPF para
// ser inspecionável em teste com DryRun, no mesmo espírito de listQuery.
func (r *Repository) findByCPFQuery(ctx context.Context, cpf string) *gorm.DB {
	return r.db.WithContext(ctx).Where("cpf = ?", cpf)
}

// FindByCPF devolve (nil, nil) quando não há pessoa com aquele CPF no tenant —
// "não existe" é resposta esperada no fluxo de cadastro, não erro.
func (r *Repository) FindByCPF(ctx context.Context, cpf string) (*models.Pessoa, error) {
	var p models.Pessoa
	err := r.findByCPFQuery(ctx, cpf).First(&p).Error
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

// papeisTabelaQuery monta a query que verifica, dentro de um conjunto de
// pessoas, quais têm ficha na tabela do modelo dado. Separada de PapeisEmLote
// para ser inspecionável em teste com DryRun, no mesmo espírito de listQuery
// — em especial para garantir que o callback global de tenant (que só enxerga
// query construída via GORM, não SQL cru) segue sendo aplicado aqui.
func (r *Repository) papeisTabelaQuery(ctx context.Context, tabela any, pessoaIDs []uint) *gorm.DB {
	return r.db.WithContext(ctx).Model(tabela).Where("pessoa_id IN ?", pessoaIDs)
}

// PapeisEmLote deriva os papéis de várias pessoas de uma só vez: 3 consultas
// no total (uma por tabela de papel), não 3 por pessoa. Existe para que
// List possa devolver "papeis" em GET /pessoas sem cair num N+1 — a versão
// por pessoa (Papeis) é usada só pelos endpoints de pessoa única.
func (r *Repository) PapeisEmLote(ctx context.Context, pessoaIDs []uint) (map[uint]models.Papeis, error) {
	out := make(map[uint]models.Papeis, len(pessoaIDs))
	for _, id := range pessoaIDs {
		out[id] = models.Papeis{}
	}
	if len(pessoaIDs) == 0 {
		return out, nil
	}

	marcar := func(tabela any, marcar func(*models.Papeis)) error {
		var comFicha []uint
		if err := r.papeisTabelaQuery(ctx, tabela, pessoaIDs).Pluck("pessoa_id", &comFicha).Error; err != nil {
			return err
		}
		for _, id := range comFicha {
			p := out[id]
			marcar(&p)
			out[id] = p
		}
		return nil
	}

	if err := marcar(&models.Cliente{}, func(p *models.Papeis) { p.Comprador = true }); err != nil {
		return nil, err
	}
	if err := marcar(&models.ClienteAluguel{}, func(p *models.Papeis) { p.Inquilino = true }); err != nil {
		return nil, err
	}
	if err := marcar(&models.Proprietario{}, func(p *models.Papeis) { p.Proprietario = true }); err != nil {
		return nil, err
	}

	return out, nil
}
