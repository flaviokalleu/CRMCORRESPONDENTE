// Package repasses implementa o repasse PIX ao proprietário nos aluguéis
// recorrentes (`routes/repasseRoutes.js`, 03-spec §"Fluxo de repasse ao
// proprietário"). Depende apenas de leituras pontuais em `cliente_aluguels`/
// `cobranca_aluguels` (ver repository.go) — o módulo de aluguéis em si
// (CRUD de ClienteAluguel/CobrancaAluguel) é implementado por outro agente.
package repasses

import (
	"context"
	"errors"
	"math"
	"strconv"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/integrations/asaas"
	"crmimob/internal/models"
)

var (
	ErrRepasseNotFound  = errors.New("repasse não encontrado")
	ErrJaRealizado      = errors.New("repasse já foi realizado")
	ErrClienteAluguelNF = errors.New("cliente aluguel não encontrado")
)

type Service struct {
	repo *Repository
	db   *gorm.DB
}

func NewService(repo *Repository, db *gorm.DB) *Service { return &Service{repo: repo, db: db} }

func round2(v float64) float64 { return math.Round(v*100) / 100 }

func (s *Service) clientForTenant(ctx context.Context, tenantID *uint) (*asaas.Client, error) {
	if tenantID == nil {
		return asaas.NewClientForTenant(nil), nil
	}
	var t models.Tenant
	if err := s.db.WithContext(ctx).First(&t, *tenantID).Error; err != nil {
		return nil, err
	}
	return asaas.NewClientForTenant(t.AsaasAPIKey), nil
}

func (s *Service) List(ctx context.Context, f ListFilter) ([]models.RepasseProprietario, error) {
	return s.repo.List(ctx, f)
}

// GerarMes cria (idempotente) os repasses do mês para cobranças CONFIRMED/RECEIVED,
// e dispara PIX quando `enviarPix=true` e o proprietário tiver chave cadastrada.
// Espelha `repasseService.processarRepasse` (03-spec §"Fluxo de repasse").
func (s *Service) GerarMes(ctx context.Context, tenantID *uint, mes string, enviarPix bool) (GerarResponse, error) {
	cobrancas, err := s.repo.cobrancasConfirmadasDoMes(ctx, mes)
	if err != nil {
		return GerarResponse{}, err
	}

	resp := GerarResponse{}
	var client *asaas.Client
	if enviarPix {
		client, err = s.clientForTenant(ctx, tenantID)
		if err != nil {
			return GerarResponse{}, err
		}
	}

	for _, cob := range cobrancas {
		// Idempotência: um repasse por cobranca_aluguel_id (uniqueIndex).
		if existing, err := s.repo.FindByCobrancaAluguelID(ctx, cob.ID); err == nil {
			resp.Repasses = append(resp.Repasses, *existing)
			continue
		}

		cliente, err := s.repo.clienteAluguel(ctx, cob.ClienteAluguelID)
		if err != nil {
			resp.Erros = append(resp.Erros, "cliente_aluguel "+strconv.FormatUint(uint64(cob.ClienteAluguelID), 10)+": "+err.Error())
			continue
		}

		valorAluguel := cob.Valor
		if valorAluguel == 0 {
			valorAluguel = cliente.ValorAluguel
		}
		taxaPerc := cliente.TaxaAdministracao
		if taxaPerc == 0 {
			taxaPerc = 10
		}
		valorTaxa := round2(valorAluguel * taxaPerc / 100)
		valorRepasse := round2(valorAluguel - valorTaxa)
		comissaoCorretor := round2(valorAluguel * cliente.CorretorPercentual / 100)

		r := &models.RepasseProprietario{
			ClienteAluguelID:            cob.ClienteAluguelID,
			CobrancaAluguelID:           cob.ID,
			ValorAluguel:                valorAluguel,
			TaxaAdministracaoPercentual: taxaPerc,
			ValorTaxa:                   valorTaxa,
			ValorRepasse:                valorRepasse,
			CorretorPercentual:          cliente.CorretorPercentual,
			ComissaoCorretor:            comissaoCorretor,
			MesReferencia:               mes,
			Status:                      models.RepasseStatusPendente,
			TransferStatus:              models.RepasseTransferPendente,
			TenantID:                    tenantID,
		}

		if cliente.ProprietarioPix == "" {
			r.TransferStatus = models.RepasseTransferSemPix
		} else if enviarPix {
			r.TransferStatus = models.RepasseTransferProcessando
		}

		if err := s.repo.Create(ctx, r); err != nil {
			resp.Erros = append(resp.Erros, err.Error())
			continue
		}

		if enviarPix && cliente.ProprietarioPix != "" {
			transfer, err := client.CreateTransfer(ctx, valorRepasse, cliente.ProprietarioPix, "",
				"Repasse aluguel "+mes)
			if err != nil {
				_ = s.repo.Update(ctx, r.ID, map[string]any{
					"transfer_status": models.RepasseTransferFalhou,
					"transfer_error":  err.Error(),
					"updated_at":      time.Now(),
				})
				resp.Erros = append(resp.Erros, err.Error())
			} else {
				now := time.Now()
				_ = s.repo.Update(ctx, r.ID, map[string]any{
					"status":            models.RepasseStatusRealizado,
					"transfer_status":   models.RepasseTransferRealizado,
					"asaas_transfer_id": transfer.ID,
					"data_repasse":      now,
					"updated_at":        now,
				})
				resp.TransferenciasPix++
			}
		}

		saved, _ := s.repo.FindByID(ctx, r.ID)
		if saved != nil {
			resp.Repasses = append(resp.Repasses, *saved)
		}
	}

	resp.Message = "Repasses processados"
	return resp, nil
}

// Transferir reenvia o PIX de um repasse FALHOU/SEM_PIX (bloqueado se já REALIZADO).
func (s *Service) Transferir(ctx context.Context, tenantID *uint, id uint) (*models.RepasseProprietario, error) {
	r, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrRepasseNotFound
	}
	if r.Status == models.RepasseStatusRealizado {
		return nil, ErrJaRealizado
	}

	cliente, err := s.repo.clienteAluguel(ctx, r.ClienteAluguelID)
	if err != nil || cliente.ProprietarioPix == "" {
		return nil, ErrClienteAluguelNF
	}

	client, err := s.clientForTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	transfer, err := client.CreateTransfer(ctx, r.ValorRepasse, cliente.ProprietarioPix, "", "Repasse aluguel "+r.MesReferencia)
	now := time.Now()
	if err != nil {
		_ = s.repo.Update(ctx, id, map[string]any{
			"transfer_status": models.RepasseTransferFalhou,
			"transfer_error":  err.Error(),
			"updated_at":      now,
		})
		return nil, err
	}
	_ = s.repo.Update(ctx, id, map[string]any{
		"status":            models.RepasseStatusRealizado,
		"transfer_status":   models.RepasseTransferRealizado,
		"asaas_transfer_id": transfer.ID,
		"data_repasse":      now,
		"updated_at":        now,
	})
	return s.repo.FindByID(ctx, id)
}

// Confirmar marca REALIZADO manualmente (sem PIX via Asaas).
func (s *Service) Confirmar(ctx context.Context, id uint, observacao string) (*models.RepasseProprietario, error) {
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		return nil, ErrRepasseNotFound
	}
	now := time.Now()
	updates := map[string]any{
		"status":          models.RepasseStatusRealizado,
		"transfer_status": models.RepasseTransferRealizado,
		"data_repasse":    now,
		"updated_at":      now,
	}
	if observacao != "" {
		updates["observacao"] = observacao
	}
	if err := s.repo.Update(ctx, id, updates); err != nil {
		return nil, err
	}
	return s.repo.FindByID(ctx, id)
}

// Resumo agrega os totais do mês (aluguel/taxa/repasse/comissão).
func (s *Service) Resumo(ctx context.Context, mes string) (ResumoResponse, error) {
	rows, err := s.repo.List(ctx, ListFilter{MesReferencia: mes})
	if err != nil {
		return ResumoResponse{}, err
	}
	resp := ResumoResponse{Mes: mes, Repasses: rows}
	for _, r := range rows {
		resp.TotalAluguel += r.ValorAluguel
		resp.TotalTaxa += r.ValorTaxa
		resp.TotalRepasse += r.ValorRepasse
		resp.TotalComissao += r.ComissaoCorretor
	}
	return resp, nil
}

// MultaJuros calcula multa/juros de mora das cobranças OVERDUE de um
// ClienteAluguel (`reguaCobrancaService.calcularMultaJuros`, 03-spec §"Multa e juros").
func (s *Service) MultaJuros(ctx context.Context, clienteAluguelID uint) ([]MultaJurosItem, error) {
	cliente, err := s.repo.clienteAluguel(ctx, clienteAluguelID)
	if err != nil {
		return nil, ErrClienteAluguelNF
	}
	cobrancas, err := s.repo.cobrancasOverdue(ctx, clienteAluguelID)
	if err != nil {
		return nil, err
	}

	percMulta := cliente.PercentualMulta
	if percMulta == 0 {
		percMulta = 2
	}
	percJuros := cliente.PercentualJurosMora
	if percJuros == 0 {
		percJuros = 1
	}

	items := make([]MultaJurosItem, 0, len(cobrancas))
	for _, cob := range cobrancas {
		diasAtraso := int(time.Since(cob.DataVencimento).Hours() / 24)
		if diasAtraso < 0 {
			diasAtraso = 0
		}
		valorMulta := round2(cob.Valor * percMulta / 100)
		// Juros de mora: percentual ao mês, pro-rata por dia (aproximação 30 dias/mês).
		valorJuros := round2(cob.Valor * (percJuros / 100 / 30) * float64(diasAtraso))
		items = append(items, MultaJurosItem{
			CobrancaID:      cob.ID,
			Valor:           cob.Valor,
			DiasAtraso:      diasAtraso,
			PercentualMulta: percMulta,
			PercentualJuros: percJuros,
			ValorMulta:      valorMulta,
			ValorJuros:      valorJuros,
			ValorTotal:      round2(cob.Valor + valorMulta + valorJuros),
		})
	}
	return items, nil
}
