package pessoas

import (
	"context"
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

var (
	ErrPapelInvalido   = errors.New("papel inválido")
	ErrNomeObrigatorio = errors.New("nome é obrigatório")
	ErrPapelJaExiste   = errors.New("pessoa já tem esse papel")
	ErrNaoEncontrada   = errors.New("pessoa não encontrada")
)

type Service struct {
	repo *Repository
	db   *gorm.DB
}

func NewService(repo *Repository, db *gorm.DB) *Service {
	return &Service{repo: repo, db: db}
}

func papelValido(p string) bool {
	return p == PapelComprador || p == PapelInquilino || p == PapelProprietario
}

func ptrOuNil(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

// parseDatePtr parseia uma data "YYYY-MM-DD" vinda do request. Data vazia ou
// mal formada vira nil silenciosamente — mesmo contrato de
// alugueis.parseDatePtr, seguido aqui para manter o comportamento consistente
// entre os módulos que recebem data de nascimento como string do frontend.
// Não é tratada como erro de validação porque data de nascimento não é campo
// obrigatório em nenhum dos três papéis.
func parseDatePtr(s string) *time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

// formatDatePtr é o inverso de parseDatePtr: formata um *time.Time como
// "YYYY-MM-DD" (time.Time.Format, não string), que é o formato armazenado em
// models.Cliente.DataNascimento (VARCHAR(10) legado). nil entra, nil sai.
func formatDatePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format("2006-01-02")
	return &s
}

// List devolve as pessoas do filtro já COM os papéis derivados — a tela
// /pessoas do frontend usa "papeis" de cada item para desenhar os badges de
// papel, e buscar isso pessoa a pessoa seria um N+1 (uma query de papéis por
// linha da lista). Por isso os papéis são resolvidos em lote
// (repo.PapeisEmLote), em 3 consultas totais para a página inteira.
func (s *Service) List(ctx context.Context, papel, busca string) ([]PessoaComPapeis, error) {
	pessoas, err := s.repo.List(ctx, papel, busca)
	if err != nil {
		return nil, err
	}

	ids := make([]uint, len(pessoas))
	for i, p := range pessoas {
		ids[i] = p.ID
	}
	papeisPorID, err := s.repo.PapeisEmLote(ctx, ids)
	if err != nil {
		return nil, err
	}

	out := make([]PessoaComPapeis, len(pessoas))
	for i, p := range pessoas {
		out[i] = PessoaComPapeis{Pessoa: p, Papeis: papeisPorID[p.ID]}
	}
	return out, nil
}

// Buscar procura por CPF. Devolve (nil, nil) quando não existe — o frontend usa
// isso para decidir entre "criar nova" e "adicionar papel a quem já existe".
func (s *Service) Buscar(ctx context.Context, cpf string) (*PessoaComPapeis, error) {
	p, err := s.repo.FindByCPF(ctx, cpf)
	if err != nil || p == nil {
		return nil, err
	}
	papeis, err := s.repo.Papeis(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	return &PessoaComPapeis{Pessoa: *p, Papeis: papeis}, nil
}

// BuscarPorID devolve a pessoa com seus papéis, ou ErrNaoEncontrada.
func (s *Service) BuscarPorID(ctx context.Context, id uint) (*PessoaComPapeis, error) {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNaoEncontrada
		}
		return nil, err
	}
	papeis, err := s.repo.Papeis(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	return &PessoaComPapeis{Pessoa: *p, Papeis: papeis}, nil
}

// Criar grava identidade e ficha na MESMA transação. Se a ficha falhar, a
// pessoa não é criada — é isso que impede pessoas e ficha de divergirem.
func (s *Service) Criar(ctx context.Context, req CriarRequest) (*PessoaComPapeis, error) {
	if !papelValido(req.Papel) {
		return nil, ErrPapelInvalido
	}
	if strings.TrimSpace(req.Nome) == "" {
		return nil, ErrNomeObrigatorio
	}

	var out *PessoaComPapeis

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		txRepo := NewRepository(tx)

		var pessoa *models.Pessoa
		if cpf := strings.TrimSpace(req.CPF); cpf != "" {
			existente, err := txRepo.FindByCPF(ctx, cpf)
			if err != nil {
				return err
			}
			pessoa = existente
		}

		if pessoa == nil {
			pessoa = &models.Pessoa{
				Nome:           strings.TrimSpace(req.Nome),
				CPF:            ptrOuNil(req.CPF),
				Email:          ptrOuNil(req.Email),
				Telefone:       ptrOuNil(req.Telefone),
				DataNascimento: parseDatePtr(req.DataNascimento),
			}
			if err := txRepo.Create(ctx, pessoa); err != nil {
				return err
			}
		}

		papeis, err := txRepo.Papeis(ctx, pessoa.ID)
		if err != nil {
			return err
		}
		if jaTem(papeis, req.Papel) {
			return ErrPapelJaExiste
		}

		fichaID, err := criarFicha(ctx, tx, pessoa, req.Papel)
		if err != nil {
			return err
		}

		papeis, err = txRepo.Papeis(ctx, pessoa.ID)
		if err != nil {
			return err
		}
		out = &PessoaComPapeis{Pessoa: *pessoa, Papeis: papeis, FichaID: &fichaID}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}

func jaTem(p models.Papeis, papel string) bool {
	switch papel {
	case PapelComprador:
		return p.Comprador
	case PapelInquilino:
		return p.Inquilino
	case PapelProprietario:
		return p.Proprietario
	}
	return false
}

// fichaComprador monta a ficha de clientes a partir da identidade.
// clientes.data_nascimento é VARCHAR(10) legado (*string), diferente de
// pessoas.data_nascimento que é DATE (*time.Time) — por isso formata de volta
// para string aqui.
func fichaComprador(p *models.Pessoa) models.Cliente {
	return models.Cliente{
		PessoaID:       &p.ID,
		Nome:           &p.Nome,
		CPF:            p.CPF,
		Email:          p.Email,
		Telefone:       p.Telefone,
		Status:         "aguardando_aprovacao",
		DataNascimento: formatDatePtr(p.DataNascimento),
	}
}

// fichaInquilino monta a ficha de cliente_aluguels a partir da identidade.
// cliente_aluguels.data_nascimento já é DATE (*time.Time), igual a
// pessoas.data_nascimento, então o valor é copiado direto, sem conversão.
func fichaInquilino(p *models.Pessoa) models.ClienteAluguel {
	return models.ClienteAluguel{
		PessoaID:       &p.ID,
		Nome:           p.Nome,
		CPF:            p.CPF,
		Email:          p.Email,
		Telefone:       p.Telefone,
		DataNascimento: p.DataNascimento,
	}
}

// fichaProprietario monta a ficha de proprietario a partir da identidade.
// proprietario não tem coluna de data de nascimento.
func fichaProprietario(p *models.Pessoa) models.Proprietario {
	return models.Proprietario{
		PessoaID: &p.ID,
		Name:     p.Nome,
		Phone:    p.Telefone,
	}
}

// criarFicha abre a ficha mínima do papel, copiando a identidade, e devolve
// o id da linha criada — GORM preenche o campo ID da struct depois do
// Create, então basta ler de volta. As fichas mantêm nome/cpf/email/
// telefone/data de nascimento como cópia de leitura: pessoas é a fonte da
// verdade, mas os módulos que consultam as fichas continuam funcionando.
func criarFicha(ctx context.Context, tx *gorm.DB, p *models.Pessoa, papel string) (uint, error) {
	switch papel {
	case PapelComprador:
		c := fichaComprador(p)
		if err := tx.WithContext(ctx).Create(&c).Error; err != nil {
			return 0, err
		}
		return c.ID, nil

	case PapelInquilino:
		ca := fichaInquilino(p)
		if err := tx.WithContext(ctx).Create(&ca).Error; err != nil {
			return 0, err
		}
		return ca.ID, nil

	case PapelProprietario:
		pr := fichaProprietario(p)
		if err := tx.WithContext(ctx).Create(&pr).Error; err != nil {
			return 0, err
		}
		return pr.ID, nil
	}
	return 0, ErrPapelInvalido
}
