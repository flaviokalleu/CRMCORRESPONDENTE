package pessoas

import (
	"context"
	"strings"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"crmimob/internal/models"
	"crmimob/internal/tenant"
)

func dryRunDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(postgres.Open("host=localhost user=test dbname=test"), &gorm.Config{
		DryRun: true, DisableAutomaticPing: true, SkipDefaultTransaction: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := tenant.RegisterCallbacks(db); err != nil {
		t.Fatal(err)
	}
	return db
}

func ctxComTenant() context.Context {
	id := uint(42)
	return tenant.With(context.Background(), tenant.Scope{TenantID: &id})
}

// A busca por CPF precisa ser filtrada por tenant, senão um tenant enxerga o
// CPF de outro. O filtro vem dos callbacks globais, não de WHERE manual.
func TestFindByCPFFiltraPorTenant(t *testing.T) {
	db := dryRunDB(t)
	stmt := db.WithContext(ctxComTenant()).
		Where("cpf = ?", "11111111111").
		First(&models.Pessoa{}).Statement
	sql := stmt.SQL.String()
	if !strings.Contains(sql, "tenant_id") {
		t.Fatalf("busca por CPF sem filtro de tenant: %s", sql)
	}
	if !strings.Contains(sql, "cpf") {
		t.Fatalf("busca por CPF sem filtro de cpf: %s", sql)
	}
}

func TestListFiltraPorTenantEBusca(t *testing.T) {
	db := dryRunDB(t)
	repo := NewRepository(db)
	stmt := repo.listQuery(ctxComTenant(), "", "silva").Find(&[]struct{}{}).Statement
	sql := stmt.SQL.String()
	if !strings.Contains(sql, "tenant_id") {
		t.Fatalf("List sem filtro de tenant: %s", sql)
	}
	if !strings.Contains(strings.ToLower(sql), "ilike") {
		t.Fatalf("List sem busca textual: %s", sql)
	}
}
