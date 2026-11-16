package notas

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"crmimob/internal/models"
)

var (
	ErrClienteNaoEncontrado = errors.New("notas: cliente não encontrado")
	ErrUsuarioNaoEncontrado = errors.New("notas: usuário não encontrado")
	ErrNaoEncontrada        = errors.New("notas: nota não encontrada")
	ErrTextoInvalido        = errors.New("Escreva a nota (até 5.000 caracteres).")
)

// MaxTexto limita a nota: a coluna é text, mas um colar acidental de um
// documento inteiro não deve virar nota.
const MaxTexto = 5000

func textoValido(t string) (string, bool) {
	t = strings.TrimSpace(t)
	return t, t != "" && utf8.RuneCountInString(t) <= MaxTexto
}

// Editar troca o texto de uma nota (antes não havia como corrigir uma nota).
func (s *Service) Editar(ctx context.Context, id uint, texto string) (*models.Nota, error) {
	t, ok := textoValido(texto)
	if !ok {
		return nil, ErrTextoInvalido
	}
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		return nil, ErrNaoEncontrada
	}
	if err := s.repo.AtualizarTexto(ctx, id, t); err != nil {
		return nil, err
	}
	return s.repo.FindByID(ctx, id)
}

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

// Create valida criado_por_id + existência do cliente e cria a nota. O disparo
// de WhatsApp (POST /api/whatsapp/notificarNotaAdicionada, não bloqueante) fica
// fora do escopo desta tarefa — ver internal/integrations/whatsapp (módulo
// separado); aqui só deixamos o hook documentado.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*models.Nota, error) {
	t, ok := textoValido(req.Texto)
	if !ok {
		return nil, ErrTextoInvalido
	}
	req.Texto = t
	if _, err := s.repo.FindCliente(ctx, req.ClienteID); err != nil {
		return nil, ErrClienteNaoEncontrado
	}
	if req.CriadoPorID != nil {
		if _, err := s.repo.FindUser(ctx, *req.CriadoPorID); err != nil {
			return nil, ErrUsuarioNaoEncontrado
		}
	}

	n := &models.Nota{
		ClienteID:    req.ClienteID,
		ProcessoID:   req.ProcessoID,
		Texto:        req.Texto,
		CriadoPorID:  req.CriadoPorID,
		Nova:         req.Nova,
		Destinatario: req.Destinatario,
	}
	if n.Nova == nil {
		t := true
		n.Nova = &t
	}
	if req.DataCriacao != nil {
		n.DataCriacao = *req.DataCriacao
	} else {
		n.DataCriacao = time.Now()
	}

	if err := s.repo.Create(ctx, n); err != nil {
		return nil, err
	}
	// TODO(integração whatsapp): disparar notificarNotaAdicionada de forma
	// não bloqueante quando internal/integrations/whatsapp existir.
	return n, nil
}

func (s *Service) Get(ctx context.Context, id uint) (*models.Nota, error) {
	n, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrNaoEncontrada
	}
	return n, nil
}

func (s *Service) Concluir(ctx context.Context, id uint) (*models.Nota, error) {
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		return nil, ErrNaoEncontrada
	}
	if err := s.repo.MarkConcluida(ctx, id); err != nil {
		return nil, err
	}
	return s.repo.FindByID(ctx, id)
}

func (s *Service) Delete(ctx context.Context, id uint) error {
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		return ErrNaoEncontrada
	}
	return s.repo.Delete(ctx, id)
}

// ByCliente devolve as notas de um cliente enriquecidas com criador_nome (§2.4).
func (s *Service) ByCliente(ctx context.Context, clienteID uint) ([]ClienteNotaResponse, error) {
	list, err := s.repo.ByCliente(ctx, clienteID)
	if err != nil {
		return nil, err
	}
	out := make([]ClienteNotaResponse, 0, len(list))
	for _, n := range list {
		nome := ""
		if n.Criador != nil {
			nome = n.Criador.FirstName + " " + n.Criador.LastName
		}
		out = append(out, ClienteNotaResponse{
			ID: n.ID, ClienteID: n.ClienteID, ProcessoID: n.ProcessoID, Texto: n.Texto,
			Nova: n.Nova, Destinatario: n.Destinatario, DataCriacao: n.DataCriacao, CriadorNome: nome,
		})
	}
	return out, nil
}
