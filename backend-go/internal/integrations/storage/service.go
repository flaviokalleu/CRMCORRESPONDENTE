// Package storage implementa o equivalente Go de storageService.js: contagem
// de uso de storage por tenant, resolução de limites (override do tenant ??
// plano da subscription ativa ?? default) e incremento/decremento atômico do
// contador `tenants.storage_used_bytes`. Ver
// docs/migration/02-clientes-imoveis-uploads.md §5.4 e §6.4/§6.12.
package storage

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"crmimob/internal/models"
)

// ErrTenantNotFound é devolvido quando o tenant não existe (fail-open é
// responsabilidade do middleware que chama este serviço, não deste pacote).
var ErrTenantNotFound = errors.New("storage: tenant não encontrado")

type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

// Info é o shape devolvido por GET /api/storage-usage (contrato preservado).
type Info struct {
	UsadoMB       float64 `json:"usado_mb"`
	UsadoBytes    int64   `json:"usado_bytes"`
	LimiteMB      int     `json:"limite_mb"`
	LimiteArquivoMB int   `json:"limite_arquivo_mb"`
	Percentual    float64 `json:"percentual"`
	Ilimitado     bool    `json:"ilimitado"`
	DisponivelMB  float64 `json:"disponivel_mb"`
}

// GetStorageInfo monta o resumo de uso/limite de um tenant.
func (s *Service) GetStorageInfo(ctx context.Context, tenantID uint) (*Info, error) {
	var t models.Tenant
	if err := s.db.WithContext(ctx).First(&t, tenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrTenantNotFound
		}
		return nil, err
	}

	limits, err := resolveLimits(ctx, s.db, tenantID)
	if err != nil {
		return nil, err
	}

	usadoBytes := t.StorageUsedBytes
	usadoMB := float64(usadoBytes) / (1024 * 1024)

	info := &Info{
		UsadoMB:         round2(usadoMB),
		UsadoBytes:      usadoBytes,
		LimiteMB:        limits.MaxStorageMB,
		LimiteArquivoMB: limits.MaxFileSizeMB,
		Ilimitado:       limits.Unlimited,
	}
	if limits.Unlimited {
		info.Percentual = 0
		info.DisponivelMB = -1 // sem limite
	} else {
		info.Percentual = round2(usadoMB / float64(limits.MaxStorageMB) * 100)
		disponivel := float64(limits.MaxStorageMB) - usadoMB
		if disponivel < 0 {
			disponivel = 0
		}
		info.DisponivelMB = round2(disponivel)
	}
	return info, nil
}

// GetLimits expõe a resolução de limites (usada pelo middleware de upload para
// checar Content-Length antes do parse do multipart).
func (s *Service) GetLimits(ctx context.Context, tenantID uint) (Limits, error) {
	return resolveLimits(ctx, s.db, tenantID)
}

// IncrementStorage soma `deltaBytes` ao contador do tenant de forma atômica
// (UPDATE ... SET storage_used_bytes = storage_used_bytes + ?), evitando
// race conditions de leitura-modificação-escrita sob concorrência.
func (s *Service) IncrementStorage(ctx context.Context, tenantID uint, deltaBytes int64) error {
	if deltaBytes <= 0 {
		return nil
	}
	return s.db.WithContext(ctx).Model(&models.Tenant{}).
		Where("id = ?", tenantID).
		UpdateColumn("storage_used_bytes", gorm.Expr("storage_used_bytes + ?", deltaBytes)).Error
}

// DecrementStorage subtrai `deltaBytes` do contador do tenant, atomicamente,
// nunca deixando o contador ir abaixo de zero (GREATEST(0, ...)).
func (s *Service) DecrementStorage(ctx context.Context, tenantID uint, deltaBytes int64) error {
	if deltaBytes <= 0 {
		return nil
	}
	return s.db.WithContext(ctx).Model(&models.Tenant{}).
		Where("id = ?", tenantID).
		UpdateColumn("storage_used_bytes", gorm.Expr("GREATEST(0, storage_used_bytes - ?)", deltaBytes)).Error
}

func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}
