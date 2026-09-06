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
//
// Passa por findByCPFQuery — o mesmo método que FindByCPF chama internamente
// — em vez de reconstruir a query à mão, para que quebrar a construção real
// (coluna errada, filtro removido) derrube este teste.
func TestFindByCPFFiltraPorTenant(t *testing.T) {
	db := dryRunDB(t)
	repo := NewRepository(db)
	stmt := repo.findByCPFQuery(ctxComTenant(), "11111111111").First(&models.Pessoa{}).Statement
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

// O filtro por papel usa EXISTS com SQL cru, que o callback global de tenant
// não alcança (ver comentário em listQuery). Este teste garante que cada
// subquery de papel correlaciona tanto por pessoa_id quanto por tenant_id
// contra a linha externa — sem isso, uma ficha de outro tenant vazaria a
// pessoa para o filtro de papel errado.
func TestListFiltroPapelCorrelacionaTenant(t *testing.T) {
	casos := []struct {
		papel  string
		tabela string
		alias  string
	}{
		{papel: "comprador", tabela: "clientes", alias: "c"},
		{papel: "inquilino", tabela: "cliente_aluguels", alias: "ca"},
		{papel: "proprietario", tabela: "proprietario", alias: "p"},
	}
	for _, tc := range casos {
		t.Run(tc.papel, func(t *testing.T) {
			db := dryRunDB(t)
			repo := NewRepository(db)
			stmt := repo.listQuery(ctxComTenant(), tc.papel, "").Find(&[]struct{}{}).Statement
			sql := stmt.SQL.String()

			wantTabela := "FROM " + tc.tabela + " " + tc.alias
			if !strings.Contains(sql, wantTabela) {
				t.Fatalf("papel %q: esperava subquery em %q, sql: %s", tc.papel, wantTabela, sql)
			}
			wantPessoa := tc.alias + ".pessoa_id = pessoas.id"
			if !strings.Contains(sql, wantPessoa) {
				t.Fatalf("papel %q: esperava correlação por pessoa_id, sql: %s", tc.papel, sql)
			}
			wantTenant := tc.alias + ".tenant_id = pessoas.tenant_id"
			if !strings.Contains(sql, wantTenant) {
				t.Fatalf("papel %q: esperava correlação por tenant_id, sql: %s", tc.papel, sql)
			}
		})
	}
}

// TestPapeisTabelaQueryFiltraPorTenantEPessoa garante que a consulta em lote
// usada por PapeisEmLote (chamada por List, para montar a coluna "Papéis" da
// tela /pessoas sem N+1) continua passando pelo callback global de tenant —
// diferente do EXISTS de listQuery, aqui a query é construída via GORM
// (Model+Where), então o callback deveria injetar o filtro sozinho.
func TestPapeisTabelaQueryFiltraPorTenantEPessoa(t *testing.T) {
	casos := []struct {
		tabela     any
		nomeTabela string
	}{
		{&models.Cliente{}, "clientes"},
		{&models.ClienteAluguel{}, "cliente_aluguels"},
		{&models.Proprietario{}, "proprietario"},
	}
	for _, tc := range casos {
		t.Run(tc.nomeTabela, func(t *testing.T) {
			db := dryRunDB(t)
			repo := NewRepository(db)
			stmt := repo.papeisTabelaQuery(ctxComTenant(), tc.tabela, []uint{1, 2, 3}).Find(&[]struct{}{}).Statement
			sql := stmt.SQL.String()

			if !strings.Contains(sql, `FROM "`+tc.nomeTabela+`"`) {
				t.Fatalf("esperava consulta em %q, sql: %s", tc.nomeTabela, sql)
			}
			if !strings.Contains(sql, "pessoa_id") {
				t.Fatalf("esperava filtro por pessoa_id, sql: %s", sql)
			}
			if !strings.Contains(sql, "tenant_id") {
				t.Fatalf("esperava filtro de tenant (via callback global), sql: %s", sql)
			}
		})
	}
}
