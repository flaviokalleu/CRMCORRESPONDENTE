package fluxocaixa

import (
	"context"

	"crmimob/internal/modules/financeiro/despesas"
	"crmimob/internal/modules/financeiro/receitas"
)

// Service agrega os somatórios de Receita/Despesa para o dashboard financeiro.
// Reaproveita os repositories dos módulos irmãos (mesmo escopo de pacote:
// internal/modules/financeiro) — todas as queries usam WithContext(ctx), logo
// o filtro de tenant é aplicado uniformemente (corrige o vazamento do Node,
// 03-spec gotcha §6).
type Service struct {
	repo          *Repository
	receitasRepo  *receitas.Repository
	despesasRepo  *despesas.Repository
}

func NewService(repo *Repository, receitasRepo *receitas.Repository, despesasRepo *despesas.Repository) *Service {
	return &Service{repo: repo, receitasRepo: receitasRepo, despesasRepo: despesasRepo}
}

func (s *Service) Dashboard(ctx context.Context) (DashboardResponse, error) {
	totalReceitas, err := s.receitasRepo.Sum(ctx)
	if err != nil {
		return DashboardResponse{}, err
	}
	totalDespesas, err := s.despesasRepo.Sum(ctx)
	if err != nil {
		return DashboardResponse{}, err
	}
	pendencias, err := s.repo.CountPendencias(ctx)
	if err != nil {
		return DashboardResponse{}, err
	}
	return DashboardResponse{
		TotalReceitas: totalReceitas,
		TotalDespesas: totalDespesas,
		Lucro:         totalReceitas - totalDespesas,
		Pendencias:    pendencias,
	}, nil
}
