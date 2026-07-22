package models

import (
	"time"

	"gorm.io/datatypes"
)

// Laudo espelha a tabela `laudos` — avaliação/parecer de imóvel para um parceiro
// (banco/correspondente), com validade e valores solicitado/liberado.
// Ver docs/migration/06-dashboards-vendas-config.md §"Laudos".
//
// GOTCHA (§8): o model Node NÃO tinha `tenant_id` (escopo global + user_id).
// Corrigido deliberadamente aqui: `tenant_id` é obrigatório e filtrado sempre
// via db.WithContext(ctx) (callbacks GORM de internal/tenant).
type Laudo struct {
	ID uint `gorm:"primaryKey" json:"id"`

	Parceiro    string  `gorm:"column:parceiro;size:255;not null;index" json:"parceiro"`
	TipoImovel  string  `gorm:"column:tipo_imovel;not null;index" json:"tipo_imovel"` // casa|apartamento

	ValorSolicitado float64  `gorm:"column:valor_solicitado;not null" json:"valor_solicitado"` // DECIMAL(15,2) >0
	ValorLiberado   *float64 `gorm:"column:valor_liberado" json:"valor_liberado,omitempty"`     // DECIMAL(15,2) >=0

	Vencimento time.Time `gorm:"column:vencimento;not null;index" json:"vencimento"`
	Endereco   string    `gorm:"column:endereco;not null" json:"endereco"`
	Observacoes *string  `gorm:"column:observacoes" json:"observacoes,omitempty"`

	// Arquivos: JSONB { categoria: [{filename, originalname, path, size, mimetype}] }
	Arquivos datatypes.JSON `gorm:"column:arquivos" json:"arquivos,omitempty"`

	UserID   uint  `gorm:"column:user_id;not null;index" json:"user_id"`
	TenantID uint  `gorm:"column:tenant_id;not null;index" json:"tenant_id"` // novo — corrige gotcha §8

	CreatedAt time.Time `gorm:"column:created_at;index" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`

	User *User `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
}

func (Laudo) TableName() string { return "laudos" }

// Tipos de imóvel aceitos pelo laudo.
const (
	LaudoTipoImovelCasa        = "casa"
	LaudoTipoImovelApartamento = "apartamento"
)

// IsTipoImovelValido confere se o tipo pertence ao enum casa/apartamento.
func IsTipoImovelValido(tipo string) bool {
	return tipo == LaudoTipoImovelCasa || tipo == LaudoTipoImovelApartamento
}

// Status calculados de vencimento (não persistidos — derivados em runtime).
const (
	LaudoStatusVencido  = "vencido"
	LaudoStatusVencendo = "vencendo"
	LaudoStatusVigente  = "vigente"
)

// DiasParaVencimento devolve a diferença em dias inteiros entre `vencimento` e
// `agora` (negativo = já venceu). Porta `getDiasParaVencimento()` do model Node.
func (l Laudo) DiasParaVencimento(agora time.Time) int {
	d := l.Vencimento.Truncate(24 * time.Hour).Sub(agora.Truncate(24 * time.Hour))
	return int(d.Hours() / 24)
}

// Status devolve vencido/vencendo/vigente conforme os dias restantes até o
// vencimento. Porta `getStatus()` do model Node: vencido (dias<0), vencendo
// (0<=dias<=30), vigente (dias>30).
func (l Laudo) Status(agora time.Time) string {
	dias := l.DiasParaVencimento(agora)
	switch {
	case dias < 0:
		return LaudoStatusVencido
	case dias <= 30:
		return LaudoStatusVencendo
	default:
		return LaudoStatusVigente
	}
}

// LaudoArquivoMeta é um item da lista de arquivos por categoria em `arquivos` (JSONB).
type LaudoArquivoMeta struct {
	Filename     string `json:"filename"`
	OriginalName string `json:"originalname"`
	Path         string `json:"path"`
	Size         int64  `json:"size"`
	MimeType     string `json:"mimetype"`
}
