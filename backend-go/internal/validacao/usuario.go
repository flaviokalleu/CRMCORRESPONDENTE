// Package validacao reúne as regras dos dados de pessoas da equipe (tabela
// users): administrador, corretor e correspondente. As mensagens já saem em
// português simples, prontas para aparecer embaixo do campo na tela, e o
// campo vai junto (`campo`) para o front saber onde mostrar.
package validacao

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

// MaxTexto é o tamanho das colunas varchar(255) de users.
const MaxTexto = 255

// ErroCampo é um erro de validação ligado a um campo do formulário.
type ErroCampo struct {
	Campo    string
	Mensagem string
}

func (e *ErroCampo) Error() string { return e.Mensagem }

var (
	reUsuario = regexp.MustCompile(`^[a-z0-9._@-]{3,60}$`)
	reEmail   = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
)

// NormalizarEmail tira espaços e deixa minúsculo: o login compara o e-mail
// exatamente, então "Joao@Email.com" gravado assim nunca conseguiria entrar.
func NormalizarEmail(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

// Email confere formato e tamanho. Vazio é erro (e-mail é o login).
func Email(s string) *ErroCampo {
	if s == "" {
		return &ErroCampo{"email", "Escreva o e-mail."}
	}
	if utf8.RuneCountInString(s) > MaxTexto || !reEmail.MatchString(s) {
		return &ErroCampo{"email", "Confira o e-mail. Exemplo: joao@email.com"}
	}
	return nil
}

// Usuario aceita só letras minúsculas sem acento, números e . _ - @.
func Usuario(s string) *ErroCampo {
	if s == "" {
		return &ErroCampo{"username", "Escolha um nome de usuário."}
	}
	if !reUsuario.MatchString(s) {
		return &ErroCampo{"username", "Use de 3 a 60 letras minúsculas sem acento, números, ponto, hífen ou sublinhado."}
	}
	return nil
}

// Telefone exige DDD (10 ou 11 dígitos; 12–13 com o 55 do país).
func Telefone(s string) *ErroCampo {
	n := 0
	for _, r := range s {
		if r >= '0' && r <= '9' {
			n++
		}
	}
	if n < 10 || n > 13 {
		return &ErroCampo{"telefone", "Escreva o telefone com DDD. Exemplo: (61) 99999-9999"}
	}
	return nil
}

// Senha: mínimo de 6 caracteres (mesma regra do cadastro).
func Senha(s string) *ErroCampo {
	if utf8.RuneCountInString(s) < 6 {
		return &ErroCampo{"password", "A senha precisa ter pelo menos 6 caracteres."}
	}
	if len(s) > 72 { // limite do bcrypt
		return &ErroCampo{"password", "A senha pode ter no máximo 72 caracteres."}
	}
	return nil
}

// Tamanho barra textos maiores que a coluna (antes virava erro 500).
func Tamanho(campo, valor, rotulo string) *ErroCampo {
	if utf8.RuneCountInString(valor) > MaxTexto {
		return &ErroCampo{campo, rotulo + " pode ter no máximo 255 caracteres."}
	}
	return nil
}

// Primeiro devolve o primeiro erro não nulo.
func Primeiro(erros ...*ErroCampo) *ErroCampo {
	for _, e := range erros {
		if e != nil {
			return e
		}
	}
	return nil
}

// ErrEmailEmUso e ErrUsuarioEmUso: e-mail/usuário já pertencem a alguém.
var (
	ErrEmailEmUso   = &ErroCampo{"email", "Este e-mail já está cadastrado. Use outro."}
	ErrUsuarioEmUso = &ErroCampo{"username", "Este nome de usuário já existe. Escolha outro."}
)

// EmUso procura e-mail e usuário em TODAS as empresas — a tabela users tem
// UNIQUE global nas duas colunas. A busca antiga passava pelo filtro de
// tenant do GORM e não via quem é de outra empresa, então o INSERT batia na
// constraint e a tela recebia erro 500. SQL cru não passa pelo filtro.
// Campos vazios são ignorados; excluirID 0 = nenhum.
func EmUso(ctx context.Context, db *gorm.DB, email, username string, excluirID uint) *ErroCampo {
	if email != "" {
		var n int64
		db.WithContext(ctx).Raw("SELECT count(*) FROM users WHERE lower(email) = lower(?) AND id <> ?", email, excluirID).Scan(&n)
		if n > 0 {
			return ErrEmailEmUso
		}
	}
	if username != "" {
		var n int64
		db.WithContext(ctx).Raw("SELECT count(*) FROM users WHERE lower(username) = lower(?) AND id <> ?", username, excluirID).Scan(&n)
		if n > 0 {
			return ErrUsuarioEmUso
		}
	}
	return nil
}

// ConflitoUnico traduz a violação de UNIQUE (dois cliques em "Cadastrar",
// por exemplo, chegando juntos) no erro do campo certo. nil se não for isso.
func ConflitoUnico(err error) *ErroCampo {
	var pg *pgconn.PgError
	if !errors.As(err, &pg) || pg.Code != "23505" {
		return nil
	}
	if strings.Contains(pg.ConstraintName, "username") {
		return ErrUsuarioEmUso
	}
	return ErrEmailEmUso
}
