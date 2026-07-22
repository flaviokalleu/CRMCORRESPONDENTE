package models

import (
	"strconv"
	"strings"
	"time"
)

// Cliente espelha a tabela `clientes` (Sequelize model Cliente). É o model mais
// extenso do sistema: identificação, financeiro, cônjuge, fiador, documentos,
// formulários Caixa e status/tenant. Ver docs/migration/02-clientes-imoveis-uploads.md §3.
//
// GOTCHAS replicados de propósito (ver §6 do spec):
//   - `valor_renda`/`conjuge_valor_renda` são VARCHAR (não numeric), armazenados
//     formatados em pt-BR ("1.234,56"). Nunca tratar como float64 no struct —
//     use ParseRenda para converter quando precisar agregar/ordenar.
//   - Datas (`data_nascimento`, `data_admissao`, cônjuge) são VARCHAR(10)
//     "YYYY-MM-DD", não time.Time.
//   - `status` default é gravado SEM acento ("aguardando_aprovacao"), normalizado
//     em relação ao model Node original (que tinha o default acentuado).
type Cliente struct {
	ID uint `gorm:"primaryKey" json:"id"`

	// 3.1 Identificação / pessoais
	Nome           *string `gorm:"column:nome" json:"nome"`
	Email          *string `gorm:"column:email;uniqueIndex" json:"email"`
	Telefone       *string `gorm:"column:telefone" json:"telefone"`
	CPF            *string `gorm:"column:cpf;uniqueIndex" json:"cpf"`
	EstadoCivil    *string `gorm:"column:estado_civil" json:"estado_civil"`
	Naturalidade   *string `gorm:"column:naturalidade" json:"naturalidade"`
	Profissao      *string `gorm:"column:profissao" json:"profissao"`
	DataNascimento *string `gorm:"column:data_nascimento" json:"data_nascimento"` // VARCHAR(10) YYYY-MM-DD
	DataAdmissao   *string `gorm:"column:data_admissao" json:"data_admissao"`     // VARCHAR(10) YYYY-MM-DD

	// 3.2 Financeiros / trabalhistas
	ValorRenda                 *string `gorm:"column:valor_renda" json:"valor_renda"` // ⚠️ VARCHAR, formatado pt-BR
	RendaTipo                  *string `gorm:"column:renda_tipo" json:"renda_tipo"`
	PossuiCarteiraMaisTresAnos *bool   `gorm:"column:possui_carteira_mais_tres_anos" json:"possui_carteira_mais_tres_anos"`
	NumeroPis                  *string `gorm:"column:numero_pis" json:"numero_pis"`
	PossuiDependente           *bool   `gorm:"column:possui_dependente" json:"possui_dependente"`

	// 3.3 Cônjuge
	ConjugeNome           *string `gorm:"column:conjuge_nome" json:"conjuge_nome"`
	ConjugeEmail          *string `gorm:"column:conjuge_email" json:"conjuge_email"`
	ConjugeTelefone       *string `gorm:"column:conjuge_telefone" json:"conjuge_telefone"`
	ConjugeCPF            *string `gorm:"column:conjuge_cpf" json:"conjuge_cpf"`
	ConjugeProfissao      *string `gorm:"column:conjuge_profissao" json:"conjuge_profissao"`
	ConjugeDataNascimento *string `gorm:"column:conjuge_data_nascimento" json:"conjuge_data_nascimento"`
	ConjugeValorRenda     *string `gorm:"column:conjuge_valor_renda" json:"conjuge_valor_renda"` // ⚠️ mesmo gotcha
	ConjugeRendaTipo      *string `gorm:"column:conjuge_renda_tipo" json:"conjuge_renda_tipo"`
	ConjugeDataAdmissao   *string `gorm:"column:conjuge_data_admissao" json:"conjuge_data_admissao"`

	// 3.4 Fiador
	PossuiFiador    bool    `gorm:"column:possui_fiador;default:false;not null" json:"possui_fiador"`
	FiadorNome      *string `gorm:"column:fiador_nome" json:"fiador_nome"`
	FiadorCPF       *string `gorm:"column:fiador_cpf" json:"fiador_cpf"`
	FiadorTelefone  *string `gorm:"column:fiador_telefone" json:"fiador_telefone"`
	FiadorEmail     *string `gorm:"column:fiador_email" json:"fiador_email"`
	FiadorDocumentos *string `gorm:"column:fiador_documentos" json:"fiador_documentos"` // TEXT — caminho do PDF

	// 3.5 Documentos (caminhos relativos a uploads/, ver documentTypeMap abaixo)
	DocumentosPessoais   *string `gorm:"column:documentos_pessoais" json:"documentos_pessoais"`
	ExtratoBancario      *string `gorm:"column:extrato_bancario" json:"extrato_bancario"`
	DocumentosDependente *string `gorm:"column:documentos_dependente" json:"documentos_dependente"`
	DocumentosConjuge    *string `gorm:"column:documentos_conjuge" json:"documentos_conjuge"`

	// 3.6 Formulários Caixa / aprovação
	PossuiFormulariosCaixa bool    `gorm:"column:possui_formularios_caixa;default:false;not null" json:"possui_formularios_caixa"`
	FormulariosCaixa       *string `gorm:"column:formularios_caixa" json:"formularios_caixa"` // TEXT
	TelaAprovacao          *string `gorm:"column:tela_aprovacao" json:"tela_aprovacao"`         // TEXT — path OU JSON legado (§6.8)

	// 3.7 Status / relacionamentos / tenant
	Status   string `gorm:"column:status;default:aguardando_aprovacao" json:"status"`
	UserID   *uint  `gorm:"column:user_id" json:"user_id"`
	TenantID uint   `gorm:"column:tenant_id;not null;index" json:"tenant_id"` // clientes SEMPRE têm tenant

	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updated_at"`

	// Associações (carregadas via Preload quando necessário — não persistidas)
	User  *User  `gorm:"foreignKey:UserID;references:ID" json:"user,omitempty"`
	Notas []Nota `gorm:"foreignKey:ClienteID;references:ID" json:"notas,omitempty"`
}

func (Cliente) TableName() string { return "clientes" }

// StatusValidos replica o enum STATUS_VALIDOS da rota Node (§2.1.1). Usado para
// validar PATCH /clientes/:id/status e o builder de criação/atualização.
var StatusValidos = []string{
	"aguardando_aprovacao",
	"proposta_apresentada",
	"documentacao_pendente",
	"visita_efetuada",
	"aguardando_cancelamento_qv",
	"condicionado",
	"cliente_aprovado",
	"reprovado",
	"reserva",
	"conferencia_documento",
	"nao_descondiciona",
	"conformidade",
	"concluido",
	"nao_deu_continuidade",
	"aguardando_reserva_orcamentaria",
	"fechamento_proposta",
	"processo_em_aberto",
	"aprovado",
	"em_andamento",
	"finalizado",
	"cancelado",
}

// IsStatusValido confere se o status pertence ao enum STATUS_VALIDOS.
func IsStatusValido(status string) bool {
	for _, s := range StatusValidos {
		if s == status {
			return true
		}
	}
	return false
}

// DocumentTypeMap replica o mapeamento fieldname multipart → coluna DB (§2.1.2).
// Chave = ":tipo" usado nas rotas de documento; valor = nome lógico do campo.
var DocumentTypeMap = map[string]string{
	"documentosPessoais":   "documentos_pessoais",
	"extratoBancario":      "extrato_bancario",
	"documentosDependente": "documentos_dependente",
	"documentosConjuge":    "documentos_conjuge",
	"fiadorDocumentos":     "fiador_documentos",
	"formulariosCaixa":     "formularios_caixa",
	"tela_aprovacao":       "tela_aprovacao",
}

// IsValidDocumentType confere se ":tipo" é uma chave válida de DocumentTypeMap.
func IsValidDocumentType(tipo string) bool {
	_, ok := DocumentTypeMap[tipo]
	return ok
}

// ParseRenda normaliza um valor monetário pt-BR ("1.234,56") ou já-numérico
// ("1234.56") armazenado em valor_renda/conjuge_valor_renda e devolve o float64
// equivalente. Necessário porque a coluna é VARCHAR — ver gotcha §6.1.
func ParseRenda(s string) (float64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, nil
	}
	// Remove separador de milhar (".") e troca decimal (",") por ".".
	// Só aplica a troca de milhar se houver vírgula (formato pt-BR "1.234,56");
	// caso contrário assume que já está em formato numérico ("1234.56").
	if strings.Contains(s, ",") {
		s = strings.ReplaceAll(s, ".", "")
		s = strings.ReplaceAll(s, ",", ".")
	}
	return strconv.ParseFloat(s, 64)
}
