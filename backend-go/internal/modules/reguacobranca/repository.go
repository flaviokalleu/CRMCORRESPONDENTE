// Package reguacobranca implementa a automação de cobrança via WhatsApp
// (services/reguaCobrancaService.js): 5 etapas fixas (D-5/D-1/D+1/D+7/D+15)
// relativas ao dia de vencimento do inquilino. Não gera cobrança financeira
// — isso é papel do Asaas/CobrancaAluguel. Ver
// docs/migration/04-alugueis.md §Régua de cobrança.
package reguacobranca

import (
	"context"
	"time"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

type Repository struct{ db *gorm.DB }

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

// ListInquilinosAtivos lista todos os inquilinos (a régua roda para todos —
// o cron do Node não filtra por tenant explicitamente; ver 04-spec Gotcha 7,
// aqui optamos por padronizar via callback de tenant quando chamado com
// contexto de um tenant específico, e por "todos os tenants" quando chamado
// pelo job global sem tenant no contexto).
func (r *Repository) ListInquilinos(ctx context.Context) ([]models.ClienteAluguel, error) {
	var out []models.ClienteAluguel
	err := r.db.WithContext(ctx).Find(&out).Error
	return out, err
}

// JaEnviada verifica idempotência: já existe ReguaCobranca para esta etapa +
// mês de referência com mensagem_enviada=true.
func (r *Repository) JaEnviada(ctx context.Context, clienteAluguelID uint, etapa, mesReferencia string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.ReguaCobranca{}).
		Where("cliente_aluguel_id = ? AND etapa = ? AND mes_referencia = ? AND mensagem_enviada = ?",
			clienteAluguelID, etapa, mesReferencia, true).
		Count(&count).Error
	return count > 0, err
}

func (r *Repository) Registrar(ctx context.Context, rc *models.ReguaCobranca) error {
	return r.db.WithContext(ctx).Create(rc).Error
}

// CobrancaEmAbertoDoMes busca uma CobrancaAluguel PENDING/OVERDUE do
// inquilino no mês de referência, para obter o `invoice_url` do link enviado
// na mensagem.
func (r *Repository) CobrancaEmAbertoDoMes(ctx context.Context, clienteAluguelID uint, mesReferencia string) (*models.CobrancaAluguel, error) {
	inicio, err := time.Parse("2006-01", mesReferencia)
	if err != nil {
		return nil, err
	}
	fim := inicio.AddDate(0, 1, 0)
	var cob models.CobrancaAluguel
	err = r.db.WithContext(ctx).
		Where("cliente_aluguel_id = ? AND status IN ? AND data_vencimento >= ? AND data_vencimento < ?",
			clienteAluguelID, []string{"PENDING", "OVERDUE"}, inicio, fim).
		Order("data_vencimento DESC").
		First(&cob).Error
	if err != nil {
		return nil, err
	}
	return &cob, nil
}
