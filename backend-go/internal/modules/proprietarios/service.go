package proprietarios

import (
	"context"
	"errors"

	"crmimob/internal/models"
)

var ErrNotFound = errors.New("proprietário não encontrado")

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

func (s *Service) List(ctx context.Context) ([]models.Proprietario, error) {
	return s.repo.List(ctx)
}

func (s *Service) Create(ctx context.Context, req CreateRequest) (*models.Proprietario, error) {
	p := &models.Proprietario{Name: req.Name}
	if req.Phone != "" {
		p.Phone = &req.Phone
	}
	if req.Address != "" {
		p.Address = &req.Address
	}
	if err := s.repo.Create(ctx, p); err != nil {
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
