package clientes

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5/pgconn"

	"crmimob/internal/models"
	"crmimob/internal/validacao"
)

// ErrosCampos junta todos os problemas do formulário de uma vez, cada um com o
// campo da tela (o mesmo id do input) e a mensagem em português simples. O
// handler devolve 400 com { error, campo, details:[{field,message}] }.
//
// Antes só nome/e-mail/CPF eram conferidos e o resto ia direto para o banco:
// texto maior que a coluna, data com ano de 5 dígitos ou responsável que não
// existe viravam erro 500 ("Erro interno"), e CPF com dígito errado, e-mail sem
// domínio ou nascimento no futuro eram gravados sem aviso.
type ErrosCampos []*validacao.ErroCampo

func (e ErrosCampos) Error() string { return e[0].Mensagem }

// Unwrap mantém errors.Is(err, ErrDadosInvalidos) para quem já tratava assim.
func (e ErrosCampos) Unwrap() error { return ErrDadosInvalidos }

var (
	estadosCivis = map[string]bool{"solteiro": true, "casado": true, "divorciado": true, "viuvo": true, "uniao_estavel": true}
	tiposRenda   = map[string]bool{"formal": true, "informal": true, "mista": true}
)

// Limites das colunas varchar de `clientes`.
var limites = map[string]int{"origem": 80, "interesse": 160}

// mudou diz se o valor enviado difere do gravado. No PUT o formulário completo
// reenvia todos os campos: regra de formato só vale para o que a pessoa mexeu,
// senão um cadastro antigo com CPF de teste nunca mais poderia ser salvo.
func mudou(novo string, atual *string) bool {
	return atual == nil || strings.TrimSpace(*atual) != novo
}

// validarInput confere o que chegou do formulário. `atual` é nil na criação.
func validarInput(in ClienteInput, atual *models.Cliente) error {
	var erros ErrosCampos
	add := func(e *validacao.ErroCampo) {
		if e != nil {
			erros = append(erros, e)
		}
	}
	criando := atual == nil
	pega := func(p *string) (string, bool) {
		if p == nil {
			return "", false
		}
		return strings.TrimSpace(*p), true
	}
	campoAtual := func(f func(*models.Cliente) *string) *string {
		if atual == nil {
			return nil
		}
		return f(atual)
	}

	// Obrigatórios: na criação sempre; na edição, só se vierem (não dá para apagar).
	if v, ok := pega(in.Nome); ok || criando {
		if v == "" {
			add(&validacao.ErroCampo{Campo: "nome", Mensagem: "Escreva o nome do cliente."})
		} else {
			add(validacao.Texto("nome", v, "O nome", false))
		}
	}
	if v, ok := pega(in.Email); ok || criando {
		v = strings.ToLower(v)
		switch {
		case v == "":
			add(&validacao.ErroCampo{Campo: "email", Mensagem: "Escreva o e-mail do cliente."})
		case mudou(v, campoAtual(func(c *models.Cliente) *string { return c.Email })):
			if e := validacao.Email(v); e != nil {
				add(&validacao.ErroCampo{Campo: "email", Mensagem: "Confira o e-mail. Exemplo: maria@email.com"})
			}
		}
	}
	if v, ok := pega(in.CPF); ok || criando {
		v = normalizeCPF(v)
		switch {
		case v == "":
			add(&validacao.ErroCampo{Campo: "cpf", Mensagem: "Escreva o CPF do cliente."})
		case mudou(v, campoAtual(func(c *models.Cliente) *string { return c.CPF })):
			add(validacao.CPF("cpf", v))
		}
	}

	type texto struct {
		campo, rotulo string
		valor         *string
		atual         *string
	}
	opcionais := []texto{
		{"telefone", "Telefone", in.Telefone, campoAtual(func(c *models.Cliente) *string { return c.Telefone })},
		{"naturalidade", "A naturalidade", in.Naturalidade, nil},
		{"profissao", "A profissão", in.Profissao, nil},
		{"origem", "A origem", in.Origem, nil},
		{"interesse", "O interesse", in.Interesse, nil},
		{"numero_pis", "O PIS", in.NumeroPis, nil},
		{"conjuge_nome", "O nome do cônjuge", in.ConjugeNome, nil},
		{"conjuge_profissao", "A profissão do cônjuge", in.ConjugeProfissao, nil},
		{"fiador_nome", "O nome do fiador", in.FiadorNome, nil},
	}
	for _, t := range opcionais {
		v, ok := pega(t.valor)
		if !ok || v == "" {
			continue
		}
		max := limites[t.campo]
		if max == 0 {
			max = validacao.MaxTexto
		}
		if utf8.RuneCountInString(v) > max {
			add(validacao.TextoLongo(t.campo, v, t.rotulo, max))
		}
	}

	// Telefone do titular é obrigatório na tela; no backend, se vier, precisa de DDD.
	if v, ok := pega(in.Telefone); ok && v != "" && mudou(v, campoAtual(func(c *models.Cliente) *string { return c.Telefone })) {
		add(validacao.TelefoneOpcional("telefone", v))
	}
	for _, t := range []texto{
		{"conjuge_telefone", "", in.ConjugeTelefone, campoAtual(func(c *models.Cliente) *string { return c.ConjugeTelefone })},
		{"fiador_telefone", "", in.FiadorTelefone, campoAtual(func(c *models.Cliente) *string { return c.FiadorTelefone })},
	} {
		if v, ok := pega(t.valor); ok && mudou(v, t.atual) {
			add(validacao.TelefoneOpcional(t.campo, v))
		}
	}
	for _, t := range []texto{
		{"conjuge_email", "", in.ConjugeEmail, campoAtual(func(c *models.Cliente) *string { return c.ConjugeEmail })},
		{"fiador_email", "", in.FiadorEmail, campoAtual(func(c *models.Cliente) *string { return c.FiadorEmail })},
	} {
		if v, ok := pega(t.valor); ok && mudou(strings.ToLower(v), t.atual) {
			add(validacao.EmailOpcional(t.campo, v))
		}
	}
	for _, t := range []texto{
		{"conjuge_cpf", "", in.ConjugeCPF, campoAtual(func(c *models.Cliente) *string { return c.ConjugeCPF })},
		{"fiador_cpf", "", in.FiadorCPF, campoAtual(func(c *models.Cliente) *string { return c.FiadorCPF })},
	} {
		if v, ok := pega(t.valor); ok && mudou(normalizeCPF(v), t.atual) {
			add(validacao.CPF(t.campo, v))
		}
	}

	// Datas: AAAA-MM-DD, nunca no futuro, nunca antes de 1900.
	hoje := time.Now().Format("2006-01-02")
	for _, t := range []texto{
		{"data_nascimento", "Data de nascimento", in.DataNascimento, campoAtual(func(c *models.Cliente) *string { return c.DataNascimento })},
		{"data_admissao", "Data de admissão", in.DataAdmissao, campoAtual(func(c *models.Cliente) *string { return c.DataAdmissao })},
		{"conjuge_data_nascimento", "Nascimento do cônjuge", in.ConjugeDataNascimento, campoAtual(func(c *models.Cliente) *string { return c.ConjugeDataNascimento })},
		{"conjuge_data_admissao", "Admissão do cônjuge", in.ConjugeDataAdmissao, campoAtual(func(c *models.Cliente) *string { return c.ConjugeDataAdmissao })},
		{"data_criacao", "Data do cadastro", in.DataCriacao, nil},
	} {
		v, ok := pega(t.valor)
		if !ok || v == "" {
			continue
		}
		v = formatDateOnly(v)
		if !mudou(v, t.atual) {
			continue
		}
		if e := validacao.Data(t.campo, v, t.rotulo); e != nil {
			add(&validacao.ErroCampo{Campo: t.campo, Mensagem: t.rotulo + ": data inválida. Use dia/mês/ano."})
		} else if v > hoje {
			add(&validacao.ErroCampo{Campo: t.campo, Mensagem: t.rotulo + " não pode ser no futuro."})
		}
	}

	// Renda: número pt-BR, sem letras nem negativo.
	for _, t := range []texto{
		{"valor_renda", "Renda mensal", in.ValorRenda, nil},
		{"conjuge_valor_renda", "Renda do cônjuge", in.ConjugeValorRenda, nil},
	} {
		if v, ok := pega(t.valor); ok && v != "" {
			_, e := validacao.Valor(t.campo, v, t.rotulo, false)
			add(e)
		}
	}

	if v, ok := pega(in.EstadoCivil); ok && v != "" && !estadosCivis[strings.ToLower(v)] {
		add(&validacao.ErroCampo{Campo: "estado_civil", Mensagem: "Escolha o estado civil na lista."})
	}
	for _, t := range []texto{{"renda_tipo", "", in.RendaTipo, nil}, {"conjuge_renda_tipo", "", in.ConjugeRendaTipo, nil}} {
		if v, ok := pega(t.valor); ok && v != "" && !tiposRenda[strings.ToLower(v)] {
			add(&validacao.ErroCampo{Campo: t.campo, Mensagem: "Escolha o tipo de renda na lista."})
		}
	}

	if len(erros) > 0 {
		return erros
	}
	return nil
}

// conflitoUnico traduz a violação das UNIQUE globais de clientes (cpf, email)
// no erro do campo. Elas valem para TODAS as empresas, e a checagem prévia
// passa pelo filtro de tenant — então um CPF de outra empresa só aparece aqui.
func conflitoUnico(err error) error {
	var pg *pgconn.PgError
	if !errors.As(err, &pg) || pg.Code != "23505" {
		return err
	}
	if strings.Contains(pg.ConstraintName, "email") {
		return ErrosCampos{{Campo: "email", Mensagem: "Já existe um cliente com este e-mail."}}
	}
	return ErrosCampos{{Campo: "cpf", Mensagem: "Já existe um cliente com este CPF."}}
}

// emailEmUso / cpfEmUso procuram duplicidade SÓ dentro da empresa: cada
// imobiliária tem a sua carteira (o mesmo cliente pode ser atendido por duas),
// e uma busca global revelaria a uma empresa que o CPF existe em outra (LGPD).
// A UNIQUE do banco também é por empresa (migração 0019).
func (r *Repository) emailEmUso(ctx context.Context, tenantID uint, email string, excluirID uint) bool {
	var n int64
	r.db.WithContext(ctx).Raw("SELECT count(*) FROM clientes WHERE tenant_id = ? AND lower(email) = lower(?) AND id <> ?", tenantID, email, excluirID).Scan(&n)
	return n > 0
}

func (r *Repository) cpfEmUso(ctx context.Context, tenantID uint, cpf string, excluirID uint) bool {
	var n int64
	r.db.WithContext(ctx).Raw("SELECT count(*) FROM clientes WHERE tenant_id = ? AND cpf = ? AND id <> ?", tenantID, cpf, excluirID).Scan(&n)
	return n > 0
}

// usuarioDaEmpresa confere se o responsável escolhido existe na mesma empresa.
func (r *Repository) usuarioDaEmpresa(ctx context.Context, userID uint, tenantID uint) bool {
	var n int64
	r.db.WithContext(ctx).Raw("SELECT count(*) FROM users WHERE id = ? AND tenant_id = ?", userID, tenantID).Scan(&n)
	return n > 0
}

// dataDoCadastro converte "AAAA-MM-DD" em meio-dia no fuso local: meia-noite
// UTC virava o dia ANTERIOR no horário de Brasília (05/10 aparecia 04/10).
func dataDoCadastro(s string) (time.Time, bool) {
	t, err := time.ParseInLocation("2006-01-02", formatDateOnly(s), time.Local)
	if err != nil {
		return time.Time{}, false
	}
	return t.Add(12 * time.Hour), true
}
