package models

import (
	"context"
	"strings"
	"testing"

	"crmimob/internal/tenant"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestPessoaTableName(t *testing.T) {
	if got := (Pessoa{}).TableName(); got != "pessoas" {
		t.Fatalf("TableName = %q, quero \"pessoas\"", got)
	}
}

// TestPessoaRespeitaTenantCallback verifica que o callback de tenant do
// internal/tenant se aplica a Pessoa. Pessoa precisa de tenant_id (visível
// ao callback via reflection) para herdar isolamento automático — se o
// callback não engajasse, queries contra a tabela pessoas vazariam dados
// entre tenants.
func TestPessoaRespeitaTenantCallback(t *testing.T) {
	db, err := gorm.Open(postgres.Open("host=localhost user=test dbname=test"), &gorm.Config{
		DryRun: true, DisableAutomaticPing: true, SkipDefaultTransaction: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := tenant.RegisterCallbacks(db); err != nil {
		t.Fatal(err)
	}
	tenantID := uint(42)
	ctx := tenant.With(context.Background(), tenant.Scope{TenantID: &tenantID})

	q := db.WithContext(ctx).Model(&Pessoa{}).Where("id = ?", 123).Find(&Pessoa{})
	if q.Error != nil {
		t.Fatal(q.Error)
	}
	sql := q.Statement.SQL.String()
	where := strings.SplitN(sql, "WHERE", 2)
	if len(where) != 2 || !strings.Contains(where[1], "tenant_id") {
		t.Fatalf("Pessoa query missing tenant_id filter: %s", sql)
	}
}
