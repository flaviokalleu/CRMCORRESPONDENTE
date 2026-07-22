package lembretes

import (
	"context"
	"errors"
	"time"

	"crmimob/internal/models"
)

var (
	ErrDuplicado     = errors.New("lembretes: já existe um lembrete com este título nesta data")
	ErrNaoEncontrado = errors.New("lembretes: não encontrado")
)

// saoPauloLocation replica a conversão para America/Sao_Paulo (moment-timezone
// no Node, §2.5). Se o tzdata não estiver disponível no ambiente, cai em UTC
// (fail-soft — não derruba a aplicação).
func saoPauloLocation() *time.Location {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		return time.UTC
	}
	return loc
}

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

type CreateInput struct {
	Titulo    string
	Descricao *string
	Data      time.Time
}

func (s *Service) Create(ctx context.Context, in CreateInput) (*models.Lembrete, error) {
	dataSP := in.Data.In(saoPauloLocation())
	dataStr := dataSP.Format("2006-01-02")

	if _, err := s.repo.FindByTituloData(ctx, in.Titulo, dataStr); err == nil {
		return nil, ErrDuplicado
	}

	l := &models.Lembrete{Titulo: in.Titulo, Descricao: in.Descricao, Data: dataSP}
	if err := s.repo.Create(ctx, l); err != nil {
		return nil, err
	}
	return l, nil
}

func (s *Service) All(ctx context.Context) ([]models.Lembrete, error) { return s.repo.All(ctx) }

func (s *Service) Get(ctx context.Context, id uint) (*models.Lembrete, error) {
	l, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	return l, nil
}

// UpdateStatus replica `concluido = (status === 'concluido')` (§2.5).
func (s *Service) UpdateStatus(ctx context.Context, id uint, status string) (*models.Lembrete, error) {
	l, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	l.Concluido = status == "concluido"
	if err := s.repo.Save(ctx, l); err != nil {
		return nil, err
	}
	return l, nil
}

func (s *Service) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		return ErrNaoEncontrado
	}
	return s.repo.Delete(ctx, id)
}
