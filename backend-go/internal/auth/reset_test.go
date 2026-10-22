package auth

import (
	"strings"
	"testing"
)

func TestValidateNewPassword(t *testing.T) {
	if err := ValidateNewPassword("1234567"); err == nil {
		t.Fatal("senha de 7 caracteres deveria ser recusada")
	}
	if err := ValidateNewPassword("12345678"); err != nil {
		t.Fatalf("senha de 8 caracteres deveria passar: %v", err)
	}
	// Conta caracteres, não bytes: 8 letras acentuadas passam.
	if err := ValidateNewPassword("áéíóúãõç"); err != nil {
		t.Fatalf("8 caracteres acentuados deveriam passar: %v", err)
	}
}

func TestResetTokenIsRandomAndHashed(t *testing.T) {
	a, err := newResetToken()
	if err != nil {
		t.Fatal(err)
	}
	b, _ := newResetToken()
	if a == b || len(a) != 64 {
		t.Fatalf("tokens deveriam ser aleatórios com 64 hex: %q %q", a, b)
	}
	h := hashResetToken(a)
	if len(h) != 64 || h == a || h != hashResetToken(a) {
		t.Fatalf("hash deveria ser SHA-256 hex determinístico e diferente do token")
	}
}

func TestResetEmailEscapesName(t *testing.T) {
	html := resetEmailHTML("<script>", "http://x/redefinir-senha?token=abc")
	if strings.Contains(html, "<script>") {
		t.Fatal("nome não foi escapado no e-mail")
	}
	if !strings.Contains(html, "redefinir-senha?token=abc") {
		t.Fatal("link ausente no e-mail")
	}
}
