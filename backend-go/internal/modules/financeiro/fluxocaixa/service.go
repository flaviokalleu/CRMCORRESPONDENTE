package fluxocaixa

import (
	"context"
	"time"

	"crmimob/internal/modules/financeiro/despesas"
	"crmimob/internal/modules/financeiro/receitas"
)

// Service agrega os somatórios de Receita/Despesa para o dashboard financeiro.
// Reaproveita os repositories dos módulos irmãos (mesmo escopo de pacote:
// internal/modules/financeiro) — todas as queries usam WithContext(ctx), logo
// o filtro de tenant é aplicado uniformemente (corrige o vazamento do Node,
// 03-spec gotcha §6).
type Service struct {
	repo         *Repository
	receitasRepo *receitas.Repository
	despesasRepo *despesas.Repository
}

func NewService(repo *Repository, receitasRepo *receitas.Repository, despesasRepo *despesas.Repository) *Service {
	return &Service{repo: repo, receitasRepo: receitasRepo, despesasRepo: despesasRepo}
}

func (s *Service) Dashboard(ctx context.Context) (DashboardResponse, error) {
	return s.DashboardFiltered(ctx, nil, nil)
}

func (s *Service) DashboardFiltered(ctx context.Context, inicio, fim *time.Time) (DashboardResponse, error) {
	var totalReceitas float64
	var err error
	if inicio != nil && fim != nil {
		totalReceitas, err = s.receitasRepo.SumBetween(ctx, *inicio, *fim)
	} else {
		totalReceitas, err = s.receitasRepo.Sum(ctx)
	}
	if err != nil {
		return DashboardResponse{}, err
	}
	var totalDespesas float64
	if inicio != nil && fim != nil {
		totalDespesas, err = s.despesasRepo.SumBetween(ctx, *inicio, *fim)
	} else {
		totalDespesas, err = s.despesasRepo.Sum(ctx)
	}
	if err != nil {
		return DashboardResponse{}, err
	}
	pendencias, err := s.repo.CountPendencias(ctx)
	if err != nil {
		return DashboardResponse{}, err
	}
	lucro := totalReceitas - totalDespesas
	anchor := time.Now()
	if fim != nil {
		anchor = fim.Add(-time.Nanosecond)
	}
	series, err := s.monthlySeries(ctx, anchor)
	if err != nil {
		return DashboardResponse{}, err
	}
	projectionStart := time.Now()
	projectionEnd := projectionStart.AddDate(0, 0, 30)
	entradas, saidas, err := s.repo.Projection(ctx, projectionStart, projectionEnd)
	if err != nil {
		return DashboardResponse{}, err
	}
	return DashboardResponse{
		TotalReceitas: totalReceitas,
		TotalDespesas: totalDespesas,
		Lucro:         lucro,
		Pendencias:    pendencias,
		MonthlySeries: series,
		Projection: CashProjection{
			Entradas: entradas, Saidas: saidas, SaldoProjetado: lucro + entradas - saidas, Dias: 30,
		},
	}, nil
}

func (s *Service) monthlySeries(ctx context.Context, anchor time.Time) ([]MonthlyCashPoint, error) {
	monthStart := time.Date(anchor.Year(), anchor.Month(), 1, 0, 0, 0, 0, anchor.Location())
	start := monthStart.AddDate(0, -5, 0)
	end := monthStart.AddDate(0, 1, 0)
	receitasRows, err := s.receitasRepo.ListBetween(ctx, start, end)
	if err != nil {
		return nil, err
	}
	despesasRows, err := s.despesasRepo.ListBetween(ctx, start, end)
	if err != nil {
		return nil, err
	}
	series := make([]MonthlyCashPoint, 6)
	meses := [...]string{"Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"}
	for i := range series {
		month := start.AddDate(0, i, 0)
		series[i].Label = meses[int(month.Month())-1]
	}
	indexOf := func(value time.Time) int {
		return (value.Year()-start.Year())*12 + int(value.Month()) - int(start.Month())
	}
	for _, item := range receitasRows {
		if index := indexOf(item.Data); index >= 0 && index < len(series) {
			series[index].Receitas += item.Valor
		}
	}
	for _, item := range despesasRows {
		if index := indexOf(item.Data); index >= 0 && index < len(series) {
			series[index].Despesas += item.Valor
		}
	}
	return series, nil
}
