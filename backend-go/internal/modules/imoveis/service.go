package imoveis

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"

	"gorm.io/datatypes"

	"crmimob/internal/models"
	"crmimob/internal/validacao"
)

var (
	ErrDadosInvalidos = errors.New("imoveis: dados inválidos")
	ErrNaoEncontrado  = errors.New("imoveis: imóvel não encontrado")
)

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

func parseIntVal(s *string) int {
	if s == nil {
		return 0
	}
	v, err := strconv.Atoi(strings.TrimSpace(*s))
	if err != nil {
		return 0
	}
	return v
}

func parseBoolVal(s *string) bool {
	if s == nil {
		return false
	}
	v := strings.TrimSpace(*s)
	return v == "true" || v == "1"
}

// validarImovel confere os campos recebidos (só os enviados — PUT parcial) e
// devolve o primeiro erro com o campo da tela. Antes, letras e negativos
// viravam 0 em silêncio e textos longos estouravam a coluna varchar(255).
func validarImovel(in ImovelInput) *validacao.ErroCampo {
	txt := func(p *string, campo, rotulo string) *validacao.ErroCampo {
		if p == nil {
			return nil
		}
		return validacao.Texto(campo, *p, rotulo, false)
	}
	if e := validacao.Primeiro(
		txt(in.NomeImovel, "nome_imovel", "Nome do imóvel"),
		txt(in.Tipo, "tipo", "Tipo"),
		txt(in.Endereco, "endereco", "Endereço"),
		txt(in.Localizacao, "localizacao", "Cidade"),
		txt(in.Tags, "tags", "Palavras-chave"),
		txt(in.SituacaoImovel, "situacao_imovel", "Situação"),
	); e != nil {
		return e
	}
	if in.DescricaoImovel != nil {
		if e := validacao.TextoLongo("descricao_imovel", *in.DescricaoImovel, "Descrição", 10000); e != nil {
			return e
		}
	}
	if in.Observacoes != nil {
		if e := validacao.TextoLongo("observacoes", *in.Observacoes, "Anotações", 10000); e != nil {
			return e
		}
	}
	if in.Quartos != nil {
		if _, e := validacao.Inteiro("quartos", *in.Quartos, "Quartos", 0, 99); e != nil {
			return e
		}
	}
	if in.Banheiro != nil {
		if _, e := validacao.Inteiro("banheiro", *in.Banheiro, "Banheiros", 0, 99); e != nil {
			return e
		}
	}
	if in.ValorVenda != nil {
		if _, e := validacao.Valor("valor_venda", *in.ValorVenda, "Valor de venda", false); e != nil {
			return e
		}
	}
	if in.ValorAvaliacao != nil {
		if _, e := validacao.Valor("valor_avaliacao", *in.ValorAvaliacao, "Valor de avaliação", false); e != nil {
			return e
		}
	}
	return nil
}

func applyImovelInput(im *models.Imovel, in ImovelInput) {
	// Texto vazio em campo opcional = apagar (a edição manda "" ao limpar).
	opcional := func(p *string) *string {
		if p == nil || strings.TrimSpace(*p) == "" {
			return nil
		}
		v := strings.TrimSpace(*p)
		return &v
	}
	if in.NomeImovel != nil {
		im.NomeImovel = strings.TrimSpace(*in.NomeImovel)
	}
	if in.DescricaoImovel != nil {
		im.DescricaoImovel = opcional(in.DescricaoImovel)
	}
	if in.Endereco != nil {
		im.Endereco = strings.TrimSpace(*in.Endereco)
	}
	if in.Tipo != nil {
		im.Tipo = *in.Tipo
	}
	if in.Quartos != nil {
		im.Quartos = parseIntVal(in.Quartos)
	}
	if in.Banheiro != nil {
		im.Banheiro = parseIntVal(in.Banheiro)
	}
	if in.Tags != nil {
		im.Tags = opcional(in.Tags)
	}
	if in.ValorAvaliacao != nil {
		im.ValorAvaliacao, _ = validacao.Valor("", *in.ValorAvaliacao, "x", false)
	}
	if in.ValorVenda != nil {
		if v, _ := validacao.Valor("", *in.ValorVenda, "x", false); v != nil {
			im.ValorVenda = *v
		} else {
			im.ValorVenda = 0
		}
	}
	if in.Localizacao != nil {
		im.Localizacao = opcional(in.Localizacao)
	}
	if in.Exclusivo != nil {
		im.Exclusivo = parseBoolVal(in.Exclusivo)
	}
	if in.TemInquilino != nil {
		im.TemInquilino = parseBoolVal(in.TemInquilino)
	}
	if in.SituacaoImovel != nil && strings.TrimSpace(*in.SituacaoImovel) != "" {
		im.SituacaoImovel = *in.SituacaoImovel
	}
	if in.Observacoes != nil {
		im.Observacoes = opcional(in.Observacoes)
	}
}

func (s *Service) List(ctx context.Context, f Filters) ([]models.Imovel, error) {
	return s.repo.List(ctx, f)
}

func (s *Service) Busca(ctx context.Context, busca string) ([]models.Imovel, error) {
	if strings.TrimSpace(busca) == "" {
		return nil, ErrDadosInvalidos
	}
	return s.repo.List(ctx, Filters{Busca: busca})
}

func (s *Service) Get(ctx context.Context, id uint) (*models.Imovel, error) {
	im, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	return im, nil
}

func (s *Service) Create(ctx context.Context, in ImovelInput, tenantID *uint) (*models.Imovel, error) {
	if e := validarImovel(in); e != nil {
		return nil, e
	}
	im := &models.Imovel{TenantID: tenantID, SituacaoImovel: "disponivel"}
	applyImovelInput(im, in)
	if e := validacao.Primeiro(
		validacao.Texto("nome_imovel", im.NomeImovel, "Nome do imóvel", true),
		validacao.Texto("tipo", im.Tipo, "Tipo", true),
		validacao.Texto("endereco", im.Endereco, "Endereço", true),
	); e != nil {
		return nil, e
	}
	if err := s.repo.Create(ctx, im); err != nil {
		return nil, err
	}
	return im, nil
}

func (s *Service) Update(ctx context.Context, id uint, in ImovelInput) (*models.Imovel, error) {
	im, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	if e := validarImovel(in); e != nil {
		return nil, e
	}
	applyImovelInput(im, in)
	if e := validacao.Primeiro(
		validacao.Texto("nome_imovel", im.NomeImovel, "Nome do imóvel", true),
		validacao.Texto("tipo", im.Tipo, "Tipo", true),
		validacao.Texto("endereco", im.Endereco, "Endereço", true),
	); e != nil {
		return nil, e
	}
	if err := s.repo.Save(ctx, im); err != nil {
		return nil, err
	}
	return im, nil
}

func (s *Service) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		return ErrNaoEncontrado
	}
	// Nota (gotcha §6.13): hard delete não remove arquivos do disco.
	return s.repo.Delete(ctx, id)
}

func (s *Service) Semelhantes(ctx context.Context, id uint) ([]models.Imovel, error) {
	im, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	loc := ""
	if im.Localizacao != nil {
		loc = *im.Localizacao
	}
	return s.repo.Semelhantes(ctx, id, loc, 6)
}

// AppendImagePaths adiciona caminhos de imagem ao array JSON `imagens`,
// preservando os já existentes (organizeAndConvertImages incremental, §2.3).
func (s *Service) AppendImagePaths(ctx context.Context, id uint, novosPaths []string) error {
	im, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return ErrNaoEncontrado
	}
	var atuais []string
	if len(im.Imagens) > 0 {
		_ = json.Unmarshal(im.Imagens, &atuais)
	}
	atuais = append(atuais, novosPaths...)
	raw, err := json.Marshal(atuais)
	if err != nil {
		return err
	}
	im.Imagens = datatypes.JSON(raw)
	return s.repo.Save(ctx, im)
}

func (s *Service) SetDocumentacao(ctx context.Context, id uint, path string) error {
	im, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return ErrNaoEncontrado
	}
	im.Documentacao = &path
	return s.repo.Save(ctx, im)
}

func (s *Service) SetImagemCapa(ctx context.Context, id uint, path string) error {
	im, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return ErrNaoEncontrado
	}
	im.ImagemCapa = &path
	return s.repo.Save(ctx, im)
}
