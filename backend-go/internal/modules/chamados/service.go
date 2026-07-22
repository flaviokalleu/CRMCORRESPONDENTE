package chamados

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/datatypes"

	"crmimob/internal/models"
)

var ErrNotFound = errors.New("chamado não encontrado")

type Service struct {
	repo       *Repository
	whatsapp   WhatsAppSender
	adminPhone string // DEFAULT_PHONE_NUMBER do Node — configurável via wiring
}

func NewService(repo *Repository, whatsapp WhatsAppSender, adminPhone string) *Service {
	if whatsapp == nil {
		whatsapp = NoopWhatsAppSender{}
	}
	return &Service{repo: repo, whatsapp: whatsapp, adminPhone: adminPhone}
}

// Abrir cria o chamado do inquilino logado (puxa aluguel_id do cadastro) e
// notifica o admin via WhatsApp (best-effort — falha não bloqueia).
func (s *Service) Abrir(ctx context.Context, clienteAluguelID uint, req AbrirRequest) (*models.ChamadoManutencao, error) {
	inquilino, err := s.repo.FindInquilino(ctx, clienteAluguelID)
	if err != nil {
		return nil, ErrNotFound
	}

	prioridade := req.Prioridade
	if prioridade == "" {
		prioridade = "media"
	}

	ch := &models.ChamadoManutencao{
		ClienteAluguelID: clienteAluguelID,
		AluguelID:        inquilino.AluguelID,
		Titulo:           req.Titulo,
		Descricao:        req.Descricao,
		Prioridade:       prioridade,
		Status:           "aberto",
		Fotos:            datatypes.JSON([]byte("[]")),
	}
	if req.Categoria != "" {
		ch.Categoria = &req.Categoria
	}

	if err := s.repo.Create(ctx, ch); err != nil {
		return nil, err
	}

	if s.adminPhone != "" && inquilino.TenantID != nil {
		msg := fmt.Sprintf("Novo chamado de manutenção de %s: %s (%s)", inquilino.Nome, req.Titulo, prioridade)
		_ = s.whatsapp.SendMessage(*inquilino.TenantID, s.adminPhone, msg) // best-effort
	}

	return ch, nil
}

func (s *Service) ListMeusChamados(ctx context.Context, clienteAluguelID uint) ([]models.ChamadoManutencao, error) {
	return s.repo.ListByCliente(ctx, clienteAluguelID)
}

func (s *Service) ListAdmin(ctx context.Context, f ListFiltro) ([]models.ChamadoManutencao, error) {
	return s.repo.ListAdmin(ctx, f)
}

// Atualizar aplica update parcial; ao resolver grava data_resolucao e
// notifica o inquilino via WhatsApp (best-effort).
func (s *Service) Atualizar(ctx context.Context, id uint, req AtualizarRequest) (*models.ChamadoManutencao, error) {
	ch, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrNotFound
	}
	if req.Status != "" {
		ch.Status = req.Status
		if req.Status == "resolvido" {
			now := time.Now()
			ch.DataResolucao = &now
		}
	}
	if req.RespostaAdmin != "" {
		ch.RespostaAdmin = &req.RespostaAdmin
	}
	if err := s.repo.Save(ctx, ch); err != nil {
		return nil, err
	}

	if req.Status == "resolvido" {
		if inquilino, err := s.repo.FindInquilino(ctx, ch.ClienteAluguelID); err == nil && inquilino.Telefone != nil && inquilino.TenantID != nil {
			msg := fmt.Sprintf("Seu chamado \"%s\" foi resolvido.", ch.Titulo)
			_ = s.whatsapp.SendMessage(*inquilino.TenantID, *inquilino.Telefone, msg) // best-effort
		}
	}

	return ch, nil
}

func (s *Service) Resumo(ctx context.Context) (*Resumo, error) {
	total, abertos, emAndamento, resolvidos, urgentes, err := s.repo.Resumo(ctx)
	if err != nil {
		return nil, err
	}
	return &Resumo{
		Total:       int(total),
		Abertos:     int(abertos),
		EmAndamento: int(emAndamento),
		Resolvidos:  int(resolvidos),
		Urgentes:    int(urgentes),
	}, nil
}
