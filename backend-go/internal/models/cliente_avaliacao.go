package models

import "time"

// Resultados possíveis de uma avaliação do SIOPI. Correspondem às três telas
// que o correspondente recebe: "DADOS DA AVALIAÇÃO" (aprovada), "Condicionada"
// e "Reprovado".
const (
	ResultadoAprovada     = "aprovada"
	ResultadoCondicionada = "condicionada"
	ResultadoReprovada    = "reprovada"
)

// ClienteAvaliacao é um registro do que a Caixa respondeu sobre uma proposta.
//
// O Resultado é gravado na avaliação em vez de ser relido do cliente: o status
// do cliente muda com o tempo, e uma avaliação antiga precisa continuar dizendo
// o que ela foi.
//
// CPF e nome do cliente aparecem nas telas do SIOPI mas não são colunas aqui —
// já estão em `clientes`, e duplicá-los criaria duas verdades sobre o mesmo dado.
type ClienteAvaliacao struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	ClienteID uint   `gorm:"column:cliente_id;not null;index" json:"cliente_id"`
	TenantID  uint   `gorm:"column:tenant_id;not null;index" json:"tenant_id"`
	CriadoPor *uint  `gorm:"column:criado_por" json:"criado_por"`
	Resultado string `gorm:"column:resultado;not null" json:"resultado"`

	// Comuns às três telas.
	CodigoProposta       *string    `gorm:"column:codigo_proposta" json:"codigo_proposta"`
	CodigoAvaliacao      *string    `gorm:"column:codigo_avaliacao" json:"codigo_avaliacao"`
	CodigoCorrespondente *string    `gorm:"column:codigo_correspondente" json:"codigo_correspondente"`
	RespostaSiric        *time.Time `gorm:"column:resposta_siric" json:"resposta_siric"`

	// Tela "Reprovado".
	MotivoReprovacao *string `gorm:"column:motivo_reprovacao" json:"motivo_reprovacao"`

	// Tela "Condicionada".
	CondicaoAprovacao      *string  `gorm:"column:condicao_aprovacao" json:"condicao_aprovacao"`
	ValorPrestacaoPossivel *float64 `gorm:"column:valor_prestacao_possivel" json:"valor_prestacao_possivel"`

	// Tela "DADOS DA AVALIAÇÃO".
	ProtocoloCadastro     *string    `gorm:"column:protocolo_cadastro" json:"protocolo_cadastro"`
	AgenciaRelacionamento *string    `gorm:"column:agencia_relacionamento" json:"agencia_relacionamento"`
	ValidadeInicio        *time.Time `gorm:"column:validade_inicio" json:"validade_inicio"`
	ValidadeFim           *time.Time `gorm:"column:validade_fim" json:"validade_fim"`
	OrigemRecurso         *string    `gorm:"column:origem_recurso" json:"origem_recurso"`
	Modalidade            *string    `gorm:"column:modalidade" json:"modalidade"`
	Produto               *string    `gorm:"column:produto" json:"produto"`
	ValorImovel           *float64   `gorm:"column:valor_imovel" json:"valor_imovel"`
	ValorFinanciamento    *float64   `gorm:"column:valor_financiamento" json:"valor_financiamento"`
	Prestacao             *float64   `gorm:"column:prestacao" json:"prestacao"`
	Indexador             *string    `gorm:"column:indexador" json:"indexador"`
	SistemaAmortizacao    *string    `gorm:"column:sistema_amortizacao" json:"sistema_amortizacao"`
	PrazoMeses            *int       `gorm:"column:prazo_meses" json:"prazo_meses"`
	SistemaOriginador     *string    `gorm:"column:sistema_originador" json:"sistema_originador"`

	// Cálculo do CRM. RendaUtilizada é a renda que o BANCO usou, que pode
	// divergir legitimamente de clientes.valor_renda — os dois são preservados.
	RendaUtilizada  *float64 `gorm:"column:renda_utilizada" json:"renda_utilizada"`
	PercentualRenda *float64 `gorm:"column:percentual_renda" json:"percentual_renda"`

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`
}

func (ClienteAvaliacao) TableName() string { return "cliente_avaliacoes" }

// ResultadoPorStatus mapeia o status do cliente para o formato de tela que o
// SIOPI devolve. O segundo retorno é false para todo status que não representa
// uma decisão de avaliação — esses não pedem registro nenhum.
func ResultadoPorStatus(status string) (string, bool) {
	switch status {
	case "cliente_aprovado", "aprovado":
		return ResultadoAprovada, true
	case "condicionado":
		return ResultadoCondicionada, true
	case "reprovado":
		return ResultadoReprovada, true
	}
	return "", false
}
