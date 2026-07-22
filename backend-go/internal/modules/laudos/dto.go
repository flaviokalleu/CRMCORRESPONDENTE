// Package laudos implementa o CRUD de laudos de avaliação de imóvel
// (`/api/laudos/*`), incluindo upload de arquivos e estatísticas agregadas.
// Ver docs/migration/06-dashboards-vendas-config.md §"Laudos".
package laudos

import "time"

// LaudoResponse é o shape devolvido pela API — Laudo + campos calculados
// (status/diasParaVencimento), como no `getStatus()`/`getDiasParaVencimento()`
// do model Node.
type LaudoResponse struct {
	ID                 uint                   `json:"id"`
	Parceiro           string                 `json:"parceiro"`
	TipoImovel         string                 `json:"tipo_imovel"`
	ValorSolicitado    float64                `json:"valor_solicitado"`
	ValorLiberado      *float64               `json:"valor_liberado,omitempty"`
	Vencimento         time.Time              `json:"vencimento"`
	Endereco           string                 `json:"endereco"`
	Observacoes        *string                `json:"observacoes,omitempty"`
	Arquivos           map[string][]ArquivoDTO `json:"arquivos,omitempty"`
	UserID             uint                   `json:"user_id"`
	TenantID           uint                   `json:"tenant_id"`
	CreatedAt          time.Time              `json:"created_at"`
	UpdatedAt          time.Time              `json:"updated_at"`
	Status             string                 `json:"status"`
	DiasParaVencimento int                    `json:"diasParaVencimento"`
}

// ArquivoDTO é o metadado de um arquivo anexado (serializado no JSONB `arquivos`).
type ArquivoDTO struct {
	Filename     string `json:"filename"`
	OriginalName string `json:"originalname"`
	Path         string `json:"path"`
	Size         int64  `json:"size"`
	MimeType     string `json:"mimetype"`
}

// ListFilters replica os filtros de GET /api/laudos/.
type ListFilters struct {
	Page       int
	Limit      int
	Search     string
	Parceiro   string
	TipoImovel string
	Status     string // vencidos|vencendo|vigentes|todos
}

// Pagination é o bloco `pagination` da resposta de listagem.
type Pagination struct {
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalPages int   `json:"totalPages"`
}

// EstatisticasResponse é o payload de GET /api/laudos/relatorios/estatisticas.
type EstatisticasResponse struct {
	Resumo           ResumoEstatisticas    `json:"resumo"`
	LaudosPorTipo    []TipoCount           `json:"laudosPorTipo"`
	LaudosPorParceiro []ParceiroStats      `json:"laudosPorParceiro"`
	Valores          ValoresTotais         `json:"valores"`
}

type ResumoEstatisticas struct {
	TotalLaudos int64 `json:"totalLaudos"`
	Vencidos    int64 `json:"vencidos"`
	Vencendo    int64 `json:"vencendo"`
	Vigentes    int64 `json:"vigentes"`
}

type TipoCount struct {
	TipoImovel string `json:"tipo_imovel"`
	Count      int64  `json:"count"`
}

type ParceiroStats struct {
	Parceiro        string  `json:"parceiro"`
	Count           int64   `json:"count"`
	ValorSolicitado float64 `json:"valor_solicitado"`
	ValorLiberado   float64 `json:"valor_liberado"`
}

type ValoresTotais struct {
	TotalSolicitado float64 `json:"total_solicitado"`
	TotalLiberado   float64 `json:"total_liberado"`
}
