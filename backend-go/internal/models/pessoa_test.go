package models

import "testing"

func TestPessoaTableName(t *testing.T) {
	if got := (Pessoa{}).TableName(); got != "pessoas" {
		t.Fatalf("TableName = %q, quero \"pessoas\"", got)
	}
}

// Pessoa precisa de tenant_id para herdar o isolamento automático dos
// callbacks de internal/tenant (ver internal/tenant/scope.go: shouldApply
// devolve false para modelos sem esse campo).
func TestPessoaTemTenantID(t *testing.T) {
	p := Pessoa{TenantID: 7}
	if p.TenantID != 7 {
		t.Fatalf("TenantID = %d, quero 7", p.TenantID)
	}
}
