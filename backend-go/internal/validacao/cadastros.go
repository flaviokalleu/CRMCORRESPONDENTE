package validacao

import (
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

// Regras dos cadastros de imóveis, aluguéis, inquilinos e proprietários.
// Mesma ideia de usuario.go: mensagem em português simples + o campo da tela.

// Texto confere obrigatório e tamanho máximo (colunas varchar(255)).
func Texto(campo, valor, rotulo string, obrigatorio bool) *ErroCampo {
	if obrigatorio && strings.TrimSpace(valor) == "" {
		return &ErroCampo{campo, rotulo + ": preencha este campo."}
	}
	if utf8.RuneCountInString(valor) > MaxTexto {
		return &ErroCampo{campo, rotulo + " pode ter no máximo 255 caracteres."}
	}
	return nil
}

// Obrigatorio só confere se veio algo (campos text, sem limite de 255).
func Obrigatorio(campo, valor, rotulo string) *ErroCampo {
	if strings.TrimSpace(valor) == "" {
		return &ErroCampo{campo, rotulo + ": preencha este campo."}
	}
	return nil
}

// TextoLongo limita campos text (descrições) para não aceitar lixo sem fim.
func TextoLongo(campo, valor, rotulo string, max int) *ErroCampo {
	if utf8.RuneCountInString(valor) > max {
		return &ErroCampo{campo, rotulo + " pode ter no máximo " + strconv.Itoa(max) + " caracteres."}
	}
	return nil
}

// Valor converte texto em número (aceita "1500", "1500.50" e "1.500,50") e
// recusa letras e negativos. vazio=ok quando não obrigatório (devolve nil).
func Valor(campo, valor, rotulo string, obrigatorio bool) (*float64, *ErroCampo) {
	s := strings.TrimSpace(strings.ReplaceAll(valor, "R$", ""))
	s = strings.ReplaceAll(s, " ", "")
	if s == "" {
		if obrigatorio {
			return nil, &ErroCampo{campo, rotulo + ": preencha este campo."}
		}
		return nil, nil
	}
	if strings.Contains(s, ",") {
		s = strings.ReplaceAll(s, ".", "")
		s = strings.ReplaceAll(s, ",", ".")
	}
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil, &ErroCampo{campo, rotulo + ": use só números. Exemplo: 1.500,00"}
	}
	if v < 0 {
		return nil, &ErroCampo{campo, rotulo + " não pode ser negativo."}
	}
	if obrigatorio && v == 0 {
		return nil, &ErroCampo{campo, rotulo + ": preencha este campo."}
	}
	if v > 1e11 {
		return nil, &ErroCampo{campo, rotulo + " está alto demais. Confira o número."}
	}
	return &v, nil
}

// Inteiro converte e confere a faixa [min, max]. Vazio vira 0.
func Inteiro(campo, valor, rotulo string, min, max int) (int, *ErroCampo) {
	s := strings.TrimSpace(valor)
	if s == "" {
		return 0, nil
	}
	v, err := strconv.Atoi(s)
	if err != nil || v < min || v > max {
		return 0, &ErroCampo{campo, rotulo + ": use um número de " + strconv.Itoa(min) + " a " + strconv.Itoa(max) + "."}
	}
	return v, nil
}

// Faixa confere um inteiro já convertido.
func Faixa(campo string, v int, rotulo string, min, max int) *ErroCampo {
	if v < min || v > max {
		return &ErroCampo{campo, rotulo + ": use um número de " + strconv.Itoa(min) + " a " + strconv.Itoa(max) + "."}
	}
	return nil
}

func soDigitos(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// CPF valida os dígitos verificadores. Vazio é aceito (campo opcional).
func CPF(campo, valor string) *ErroCampo {
	d := soDigitos(valor)
	if strings.TrimSpace(valor) == "" {
		return nil
	}
	erro := &ErroCampo{campo, "CPF inválido. Confira os 11 números."}
	if len(d) != 11 || strings.Count(d, string(d[0])) == 11 {
		return erro
	}
	for t := 9; t < 11; t++ {
		soma := 0
		for i := 0; i < t; i++ {
			soma += int(d[i]-'0') * (t + 1 - i)
		}
		dv := (soma * 10) % 11 % 10
		if dv != int(d[t]-'0') {
			return erro
		}
	}
	return nil
}

// TelefoneOpcional: vazio ok; preenchido precisa de DDD.
func TelefoneOpcional(campo, valor string) *ErroCampo {
	if strings.TrimSpace(valor) == "" {
		return nil
	}
	if e := Telefone(valor); e != nil {
		return &ErroCampo{campo, e.Mensagem}
	}
	return nil
}

// EmailOpcional: vazio ok.
func EmailOpcional(campo, valor string) *ErroCampo {
	if strings.TrimSpace(valor) == "" {
		return nil
	}
	if e := Email(strings.TrimSpace(valor)); e != nil {
		return &ErroCampo{campo, e.Mensagem}
	}
	return nil
}

// Data aceita AAAA-MM-DD (input type=date). Vazio ok.
func Data(campo, valor, rotulo string) *ErroCampo {
	if strings.TrimSpace(valor) == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", strings.TrimSpace(valor))
	if err != nil || t.Year() < 1900 || t.Year() > 2200 {
		return &ErroCampo{campo, rotulo + ": data inválida."}
	}
	return nil
}
