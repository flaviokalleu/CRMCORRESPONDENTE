package imoveis

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"

	"gorm.io/datatypes"

	"crmimob/internal/models"
)

var (
	ErrDadosInvalidos = errors.New("imoveis: dados inválidos")
	ErrNaoEncontrado  = errors.New("imoveis: imóvel não encontrado")
)

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

func parseFloatPtr(s *string) *float64 {
	if s == nil || strings.TrimSpace(*s) == "" {
		return nil
	}
	v, err := strconv.ParseFloat(strings.TrimSpace(*s), 64)
	if err != nil {
		return nil
	}
	return &v
}

func parseFloat(s *string) float64 {
	if v := parseFloatPtr(s); v != nil {
		return *v
	}
	return 0
}

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

func applyImovelInput(im *models.Imovel, in ImovelInput) {
	if in.NomeImovel != nil {
		im.NomeImovel = *in.NomeImovel
	}
	if in.DescricaoImovel != nil {
		im.DescricaoImovel = in.DescricaoImovel
	}
	if in.Endereco != nil {
		im.Endereco = *in.Endereco
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
		im.Tags = in.Tags
	}
	if in.ValorAvaliacao != nil {
		im.ValorAvaliacao = parseFloatPtr(in.ValorAvaliacao)
	}
	if in.ValorVenda != nil {
		im.ValorVenda = parseFloat(in.ValorVenda)
	}
	if in.Localizacao != nil {
		im.Localizacao = in.Localizacao
	}
	if in.Exclusivo != nil {
		im.Exclusivo = parseBoolVal(in.Exclusivo)
	}
	if in.TemInquilino != nil {
		im.TemInquilino = parseBoolVal(in.TemInquilino)
	}
	if in.SituacaoImovel != nil {
		im.SituacaoImovel = *in.SituacaoImovel
	}
	if in.Observacoes != nil {
		im.Observacoes = in.Observacoes
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
	im := &models.Imovel{TenantID: tenantID}
	applyImovelInput(im, in)
	if im.NomeImovel == "" || im.Endereco == "" || im.Tipo == "" {
		return nil, ErrDadosInvalidos
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
	applyImovelInput(im, in)
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
