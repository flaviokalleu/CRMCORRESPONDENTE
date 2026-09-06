package pessoas

import (
	"context"
	"errors"
	"testing"
	"time"

	"crmimob/internal/models"
)

func TestCriarRejeitaPapelInvalido(t *testing.T) {
	svc := NewService(nil, nil)
	// actor nil: a validação de papel retorna antes de qualquer uso do actor.
	_, err := svc.Criar(context.Background(), CriarRequest{Papel: "sindico", Nome: "Ana"}, nil)
	if !errors.Is(err, ErrPapelInvalido) {
		t.Fatalf("erro = %v, quero ErrPapelInvalido", err)
	}
}

func TestCriarRejeitaNomeVazio(t *testing.T) {
	svc := NewService(nil, nil)
	_, err := svc.Criar(context.Background(), CriarRequest{Papel: PapelComprador, Nome: "   "}, nil)
	if !errors.Is(err, ErrNomeObrigatorio) {
		t.Fatalf("erro = %v, quero ErrNomeObrigatorio", err)
	}
}

func TestPapelValido(t *testing.T) {
	casos := map[string]bool{
		PapelComprador: true, PapelInquilino: true, PapelProprietario: true,
		"": false, "sindico": false, "Comprador": false,
	}
	for papel, quero := range casos {
		if got := papelValido(papel); got != quero {
			t.Errorf("papelValido(%q) = %v, quero %v", papel, got, quero)
		}
	}
}

// --- Conversão de data de nascimento (Pessoa.DataNascimento é *time.Time;
// Cliente.DataNascimento é *string legado; ClienteAluguel.DataNascimento é
// *time.Time como Pessoa) ---

func TestParseDatePtrParseiaDataValida(t *testing.T) {
	got := parseDatePtr("1990-05-20")
	if got == nil {
		t.Fatal("parseDatePtr = nil, queria data parseada")
	}
	want := time.Date(1990, 5, 20, 0, 0, 0, 0, time.UTC)
	if !got.Equal(want) {
		t.Fatalf("parseDatePtr = %v, quero %v", got, want)
	}
}

func TestParseDatePtrVazioOuInvalidoRetornaNil(t *testing.T) {
	casos := []string{"", "   ", "20-05-1990", "1990/05/20", "not-a-date"}
	for _, c := range casos {
		if got := parseDatePtr(c); got != nil {
			t.Errorf("parseDatePtr(%q) = %v, quero nil", c, got)
		}
	}
}

func TestFormatDatePtrFormataData(t *testing.T) {
	d := time.Date(1990, 5, 20, 0, 0, 0, 0, time.UTC)
	got := formatDatePtr(&d)
	if got == nil {
		t.Fatal("formatDatePtr = nil, queria string formatada")
	}
	if *got != "1990-05-20" {
		t.Fatalf("formatDatePtr = %q, quero \"1990-05-20\"", *got)
	}
}

func TestFormatDatePtrNilRetornaNil(t *testing.T) {
	if got := formatDatePtr(nil); got != nil {
		t.Fatalf("formatDatePtr(nil) = %v, quero nil", *got)
	}
}

// --- fichaComprador/fichaInquilino: são chamadas por criarFicha, que por sua
// vez é chamada por Criar — testá-las diretamente exercita o código de
// produção real, sem precisar simular o INSERT via DryRun. ---

func TestFichaCompradorFormataDataNascimentoComoString(t *testing.T) {
	nasc := time.Date(1990, 5, 20, 0, 0, 0, 0, time.UTC)
	p := &models.Pessoa{ID: 7, Nome: "Ana", DataNascimento: &nasc}
	actor := &models.User{ID: 42}

	c := fichaComprador(p, actor)
	if c.DataNascimento == nil {
		t.Fatal("Cliente.DataNascimento = nil, queria \"1990-05-20\"")
	}
	if *c.DataNascimento != "1990-05-20" {
		t.Fatalf("Cliente.DataNascimento = %q, quero \"1990-05-20\"", *c.DataNascimento)
	}
	if c.PessoaID == nil || *c.PessoaID != p.ID {
		t.Fatalf("Cliente.PessoaID = %v, quero %d", c.PessoaID, p.ID)
	}
}

func TestFichaCompradorSemDataNascimentoNaoQuebra(t *testing.T) {
	p := &models.Pessoa{ID: 7, Nome: "Ana"}
	c := fichaComprador(p, &models.User{ID: 1})
	if c.DataNascimento != nil {
		t.Fatalf("Cliente.DataNascimento = %v, quero nil", *c.DataNascimento)
	}
}

// TestFichaCompradorPreencheUserIDComOAutor cobre o Fix 1 do relatório final:
// sem UserID, a ficha nasce órfã (user_id NULL) e clientes.CanAccessClient
// nunca deixa o corretor que acabou de criá-la voltar a acessá-la.
func TestFichaCompradorPreencheUserIDComOAutor(t *testing.T) {
	p := &models.Pessoa{ID: 7, Nome: "Ana"}
	actor := &models.User{ID: 99}

	c := fichaComprador(p, actor)
	if c.UserID == nil {
		t.Fatal("Cliente.UserID = nil, queria o id do autor (99)")
	}
	if *c.UserID != 99 {
		t.Fatalf("Cliente.UserID = %d, quero 99", *c.UserID)
	}
}

func TestFichaCompradorSemActorDeixaUserIDNil(t *testing.T) {
	p := &models.Pessoa{ID: 7, Nome: "Ana"}
	c := fichaComprador(p, nil)
	if c.UserID != nil {
		t.Fatalf("Cliente.UserID = %v, quero nil quando não há actor", *c.UserID)
	}
}

func TestFichaInquilinoMantemDataComoTime(t *testing.T) {
	nasc := time.Date(1990, 5, 20, 0, 0, 0, 0, time.UTC)
	p := &models.Pessoa{ID: 7, Nome: "Ana", DataNascimento: &nasc}

	ca := fichaInquilino(p)
	if ca.DataNascimento == nil {
		t.Fatal("ClienteAluguel.DataNascimento = nil, queria a data copiada")
	}
	if !ca.DataNascimento.Equal(nasc) {
		t.Fatalf("ClienteAluguel.DataNascimento = %v, quero %v", ca.DataNascimento, nasc)
	}
}

func TestCriarFichaPapelInvalidoRetornaErro(t *testing.T) {
	db := dryRunDB(t)
	p := &models.Pessoa{ID: 7, Nome: "Ana"}
	if _, err := criarFicha(ctxComTenant(), db, p, "sindico", &models.User{ID: 1}); !errors.Is(err, ErrPapelInvalido) {
		t.Fatalf("erro = %v, quero ErrPapelInvalido", err)
	}
}
