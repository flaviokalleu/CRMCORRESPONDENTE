package clientes

import (
	"context"

	"crmimob/internal/models"
)

// --- Repositório ---
//
// Nenhum método aqui filtra tenant_id: os callbacks de internal/tenant injetam
// o tenant no INSERT e no WHERE de todo model que tenha a coluna, desde que o
// contexto tenha passado por middleware.ResolveTenant (ver tenant/scope.go).

func (r *Repository) CriarAvaliacao(ctx context.Context, a *models.ClienteAvaliacao) error {
	return r.db.WithContext(ctx).Create(a).Error
}

func (r *Repository) SalvarAvaliacao(ctx context.Context, a *models.ClienteAvaliacao) error {
	return r.db.WithContext(ctx).Save(a).Error
}

func (r *Repository) ListarAvaliacoes(ctx context.Context, clienteID uint) ([]models.ClienteAvaliacao, error) {
	var out []models.ClienteAvaliacao
	err := r.db.WithContext(ctx).
		Where("cliente_id = ?", clienteID).
		Order("created_at DESC").
		Find(&out).Error
	return out, err
}

func (r *Repository) BuscarAvaliacao(ctx context.Context, clienteID, avaliacaoID uint) (*models.ClienteAvaliacao, error) {
	var a models.ClienteAvaliacao
	err := r.db.WithContext(ctx).
		Where("id = ? AND cliente_id = ?", avaliacaoID, clienteID).
		First(&a).Error
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// --- Serviço ---

// aplicaInput copia o formulário sobre o registro. Fica num lugar só para que
// criar e editar não divirjam com o tempo.
func aplicaInput(a *models.ClienteAvaliacao, in AvaliacaoInput, pct *float64) {
	a.Resultado = in.Resultado
	a.CodigoProposta = &in.CodigoProposta
	a.CodigoAvaliacao = &in.CodigoAvaliacao
	a.CodigoCorrespondente = in.CodigoCorrespondente
	a.RespostaSiric = in.RespostaSiric
	a.MotivoReprovacao = in.MotivoReprovacao
	a.CondicaoAprovacao = in.CondicaoAprovacao
	a.ValorPrestacaoPossivel = in.ValorPrestacaoPossivel
	a.ProtocoloCadastro = in.ProtocoloCadastro
	a.AgenciaRelacionamento = in.AgenciaRelacionamento
	a.ValidadeInicio = in.ValidadeInicio
	a.ValidadeFim = in.ValidadeFim
	a.OrigemRecurso = in.OrigemRecurso
	a.Modalidade = in.Modalidade
	a.Produto = in.Produto
	a.ValorImovel = in.ValorImovel
	a.ValorFinanciamento = in.ValorFinanciamento
	a.Prestacao = in.Prestacao
	a.Indexador = in.Indexador
	a.SistemaAmortizacao = in.SistemaAmortizacao
	a.PrazoMeses = in.PrazoMeses
	a.SistemaOriginador = in.SistemaOriginador
	a.RendaUtilizada = in.RendaUtilizada
	a.PercentualRenda = pct
}

func (s *Service) CriarAvaliacao(ctx context.Context, clienteID uint, in AvaliacaoInput, actor *models.User) (*models.ClienteAvaliacao, error) {
	if err := in.Validar(); err != nil {
		return nil, err
	}
	pct, err := PercentualDaAvaliacao(in)
	if err != nil {
		return nil, err
	}
	c, err := s.repo.FindByID(ctx, clienteID)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	if !CanAccessClient(actor, c) {
		return nil, ErrSemPermissao
	}
	a := &models.ClienteAvaliacao{ClienteID: clienteID, TenantID: c.TenantID, CriadoPor: &actor.ID}
	aplicaInput(a, in, pct)
	if err := s.repo.CriarAvaliacao(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *Service) AtualizarAvaliacao(ctx context.Context, clienteID, avaliacaoID uint, in AvaliacaoInput, actor *models.User) (*models.ClienteAvaliacao, error) {
	if err := in.Validar(); err != nil {
		return nil, err
	}
	pct, err := PercentualDaAvaliacao(in)
	if err != nil {
		return nil, err
	}
	c, err := s.repo.FindByID(ctx, clienteID)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	if !CanAccessClient(actor, c) {
		return nil, ErrSemPermissao
	}
	a, err := s.repo.BuscarAvaliacao(ctx, clienteID, avaliacaoID)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	aplicaInput(a, in, pct)
	if err := s.repo.SalvarAvaliacao(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *Service) ListarAvaliacoes(ctx context.Context, clienteID uint, actor *models.User) ([]models.ClienteAvaliacao, error) {
	c, err := s.repo.FindByID(ctx, clienteID)
	if err != nil {
		return nil, ErrNaoEncontrado
	}
	if !CanAccessClient(actor, c) {
		return nil, ErrSemPermissao
	}
	return s.repo.ListarAvaliacoes(ctx, clienteID)
}
