package pessoas

import "crmimob/internal/models"

// Papéis aceitos por CriarRequest.Papel.
const (
	PapelComprador    = "comprador"
	PapelInquilino    = "inquilino"
	PapelProprietario = "proprietario"
)

// CriarRequest é o corpo de POST /api/pessoas. Cria (ou reaproveita) a
// identidade e abre a ficha do papel pedido, na mesma transação.
//
// DataNascimento fica como string ("YYYY-MM-DD", formato enviado pelo
// frontend) mesmo com models.Pessoa.DataNascimento sendo *time.Time — o
// parse para time.Time acontece no service, não no DTO.
type CriarRequest struct {
	Papel string `json:"papel" binding:"required"`

	Nome           string `json:"nome" binding:"required"`
	CPF            string `json:"cpf"`
	Email          string `json:"email"`
	Telefone       string `json:"telefone"`
	DataNascimento string `json:"data_nascimento"`
}

// PessoaComPapeis é o que a API devolve: a identidade mais os papéis derivados.
//
// FichaID só é preenchido por Criar — é o id da ficha (clientes /
// cliente_aluguels / proprietario, conforme o papel) recém-criada na mesma
// transação, para o frontend poder linkar direto na tela de edição daquele
// papel sem precisar de uma segunda chamada. Buscar/BuscarPorID não
// preenchem esse campo (fica nil / omitido do JSON): não fazem sentido para
// uma pessoa já existente, que pode ter várias fichas — uma por papel — e
// nenhuma delas é "a" ficha da consulta.
type PessoaComPapeis struct {
	models.Pessoa
	Papeis  models.Papeis `json:"papeis"`
	FichaID *uint         `json:"ficha_id,omitempty"`
}
