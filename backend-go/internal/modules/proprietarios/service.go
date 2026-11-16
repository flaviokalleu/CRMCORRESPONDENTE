package proprietarios

import (
	"context"
	"errors"
	"strings"

	"crmimob/internal/models"
	"crmimob/internal/validacao"
)

var ErrNotFound = errors.New("proprietário não encontrado")

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

func (s *Service) List(ctx context.Context) ([]models.Proprietario, error) {
	return s.repo.List(ctx)
}

// validar: antes só o nome era conferido; telefone "abc" e textos com mais de
// 255 caracteres (erro 500 do banco) passavam.
func validar(req CreateRequest) *validacao.ErroCampo {
	return validacao.Primeiro(
		validacao.Texto("name", req.Name, "Nome do proprietário", true),
		validacao.TelefoneOpcional("phone", req.Phone),
		validacao.Texto("phone", req.Phone, "Telefone", false),
		validacao.Texto("address", req.Address, "Endereço", false),
	)
}

func aplicar(p *models.Proprietario, req CreateRequest) {
	p.Name = strings.TrimSpace(req.Name)
	p.Phone, p.Address = nil, nil
	if v := strings.TrimSpace(req.Phone); v != "" {
		p.Phone = &v
	}
	if v := strings.TrimSpace(req.Address); v != "" {
		p.Address = &v
	}
}

func (s *Service) Create(ctx context.Context, req CreateRequest) (*models.Proprietario, error) {
	if e := validar(req); e != nil {
		return nil, e
	}
	p := &models.Proprietario{}
	aplicar(p, req)
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

// Update troca nome, telefone e endereço (não existia: não dava para
// corrigir um telefone digitado errado).
func (s *Service) Update(ctx context.Context, id uint, req CreateRequest) (*models.Proprietario, error) {
	if e := validar(req); e != nil {
		return nil, e
	}
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	aplicar(p, req)
	if err := s.repo.Save(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Service) Delete(ctx context.Context, id uint) error {
	n, err := s.repo.Delete(ctx, id)
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
