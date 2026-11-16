package tenants

import (
	"context"
	"strings"
	"unicode/utf8"

	"crmimob/internal/validacao"
)

// validarCadastro confere o formulário público de /registro antes de gravar.
// Antes só o slug e o tamanho mínimo da senha eram conferidos: nome de
// empresa com mais de 255 letras, senha acima de 72 bytes (limite do bcrypt)
// ou e-mail de um usuário já existente em outra empresa caíam no INSERT e a
// tela recebia "Erro ao criar organização" (500). O campo volta junto para a
// tela marcar o lugar certo.
func (s *Service) validarCadastro(ctx context.Context, req *RegisterRequest) *validacao.ErroCampo {
	e, a := req.Empresa, req.Admin
	e.Nome = strings.TrimSpace(e.Nome)
	a.FirstName = strings.TrimSpace(a.FirstName)
	a.LastName = strings.TrimSpace(a.LastName)
	a.Email = validacao.NormalizarEmail(a.Email)
	if e.Email = validacao.NormalizarEmail(e.Email); e.Email == "" {
		e.Email = a.Email
	}
	switch {
	case utf8.RuneCountInString(e.Nome) < 2:
		return &validacao.ErroCampo{Campo: "empresa", Mensagem: "Informe o nome da imobiliária."}
	case utf8.RuneCountInString(e.Nome) > validacao.MaxTexto:
		return &validacao.ErroCampo{Campo: "empresa", Mensagem: "O nome da imobiliária pode ter no máximo 255 caracteres."}
	case a.FirstName == "":
		return &validacao.ErroCampo{Campo: "nome", Mensagem: "Informe nome e sobrenome."}
	case utf8.RuneCountInString(a.FirstName) > validacao.MaxTexto || utf8.RuneCountInString(a.LastName) > validacao.MaxTexto:
		return &validacao.ErroCampo{Campo: "nome", Mensagem: "O nome pode ter no máximo 255 caracteres."}
	}
	if err := validacao.Email(a.Email); err != nil {
		return err
	}
	if a.Telefone != "" {
		if err := validacao.Telefone(a.Telefone); err != nil {
			return err
		}
	}
	if err := validacao.Senha(a.Password); err != nil {
		return err
	}
	// users.email/username são UNIQUE em todas as empresas.
	return validacao.EmUso(ctx, s.repo.db, a.Email, a.Email, 0)
}
