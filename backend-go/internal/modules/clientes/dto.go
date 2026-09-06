package clientes

import (
	"time"

	"crmimob/internal/models"
)

// ClienteResponse é o shape devolvido nas rotas de leitura — inclui o campo
// derivado `valor_renda_formatado` que o Node sempre anexa nas respostas de
// cliente (ver spec §2.1, POST/GET/PATCH). NotasCount é usado na listagem.
type ClienteResponse struct {
	*models.Cliente
	ValorRendaFormatado string `json:"valor_renda_formatado"`
	NotasCount          int    `json:"notasCount,omitempty"`
}

func toResponse(c *models.Cliente) ClienteResponse {
	formatado := ""
	if c.ValorRenda != nil {
		formatado = *c.ValorRenda
	}
	return ClienteResponse{Cliente: c, ValorRendaFormatado: formatado, NotasCount: len(c.Notas)}
}

// ListQuery replica os query params de GET /api/clientes (§2.1).
type ListQuery struct {
	Recentes bool
	Page     int
	Limit    int
	Search   string
	Status   string
	Corretor string
	Inicio   *time.Time
	Fim      *time.Time
}

// ListResponse replica `{ success, clientes, pagination }`.
type ListResponse struct {
	Success    bool              `json:"success"`
	Clientes   []ClienteResponse `json:"clientes"`
	Pagination Pagination        `json:"pagination"`
}

type Pagination struct {
	Total int64 `json:"total"`
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
	Pages int   `json:"pages"`
}

// ClienteInput é o payload aceito no multipart/form-data de POST/PUT (§3.8 —
// buildClienteData). Todos os campos são strings cruas do form; a normalização
// (trim, lowercase, só-dígitos, formatação monetária) acontece no service.
type ClienteInput struct {
	Nome           *string
	Email          *string
	Telefone       *string
	CPF            *string
	EstadoCivil    *string
	Naturalidade   *string
	Profissao      *string
	DataNascimento *string
	DataAdmissao   *string

	ValorRenda                 *string
	RendaTipo                  *string
	PossuiCarteiraMaisTresAnos *string // "true"/"1"/"0"/"false"
	NumeroPis                  *string
	PossuiDependente           *string

	ConjugeNome           *string
	ConjugeEmail          *string
	ConjugeTelefone       *string
	ConjugeCPF            *string
	ConjugeProfissao      *string
	ConjugeDataNascimento *string
	ConjugeValorRenda     *string
	ConjugeRendaTipo      *string
	ConjugeDataAdmissao   *string

	PossuiFiador   *string
	FiadorNome     *string
	FiadorCPF      *string
	FiadorTelefone *string
	FiadorEmail    *string

	PossuiFormulariosCaixa *string

	Status      *string // ignorado no update se quem chama for corretor
	UserID      *string // aceita "user_id" OU "userId"
	DataCriacao *string
}

// StatusUpdateRequest é o body de PATCH /clientes/:id/status.
type StatusUpdateRequest struct {
	Status string `json:"status" binding:"required"`
}
