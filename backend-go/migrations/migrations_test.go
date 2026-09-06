package migrations

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

// Opt-in: creates and drops only a uniquely named disposable database.
func TestIdentityMigrations(t *testing.T) {
	if os.Getenv("TEST_MIGRATIONS") != "1" {
		t.Skip("set TEST_MIGRATIONS=1 with local PostgreSQL available")
	}
	ctx := context.Background()
	values, err := godotenv.Read("../.env")
	if err != nil {
		t.Fatal(err)
	}
	cfg, err := pgx.ParseConfig("")
	if err != nil {
		t.Fatal(err)
	}
	cfg.Host = values["DB_HOST"]
	cfg.User = values["DB_USERNAME"]
	cfg.Password = values["DB_PASSWORD"]
	cfg.Database = values["DB_NAME"]
	cfg.TLSConfig = nil
	admin, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close(ctx)
	name := fmt.Sprintf("crm_migration_test_%d", time.Now().UnixNano())
	if _, err = admin.Exec(ctx, "CREATE DATABASE "+pgx.Identifier{name}.Sanitize()); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := admin.Exec(ctx, "DROP DATABASE "+pgx.Identifier{name}.Sanitize()); err != nil {
			t.Error(err)
		}
	}()
	cfg.Database = name
	db, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close(ctx)
	exec := func(s string) {
		t.Helper()
		if _, err := db.Exec(ctx, s); err != nil {
			t.Fatal(err)
		}
	}
	migration := func(pattern string) {
		t.Helper()
		paths, _ := filepath.Glob(pattern)
		if len(paths) != 1 {
			t.Fatalf("migration %s", pattern)
		}
		b, err := os.ReadFile(paths[0])
		if err != nil {
			t.Fatal(err)
		}
		exec(string(b))
	}
	scalar := func(q string, want int) {
		t.Helper()
		var got int
		if err := db.QueryRow(ctx, q).Scan(&got); err != nil {
			t.Fatal(err)
		}
		if got != want {
			t.Fatalf("%s: got %d, want %d", q, got, want)
		}
	}
	for i := 1; i <= 5; i++ {
		migration(fmt.Sprintf("%04d_*.up.sql", i))
	}
	exec("SET search_path TO public")
	exec(`INSERT INTO tenants (id,nome,slug,email) VALUES (9001,'Teste','migration-test','test@example.invalid');
 INSERT INTO clientes (created_at,updated_at,tenant_id,nome,cpf,email) VALUES (now(),now(),1,'Comprador','123.456.789-01','same@example.invalid');
 INSERT INTO cliente_aluguels (created_at,updated_at,tenant_id,nome,cpf) VALUES (now(),now(),1,'Inquilino','12345678901'),(now(),now(),9001,'Outro tenant','12345678901');
 INSERT INTO proprietario (tenant_id,name,address) VALUES (1,'Sem CPF','Endereco preservado');`)
	migration("0006_*.up.sql")
	scalar("SELECT count(*) FROM pessoas WHERE cpf='12345678901'", 2)
	scalar("SELECT count(*) FROM clientes c JOIN cliente_aluguels a ON c.pessoa_id=a.pessoa_id AND c.tenant_id=a.tenant_id", 1)
	scalar("SELECT count(*) FROM proprietario WHERE pessoa_id IS NOT NULL AND address='Endereco preservado'", 1)
	migration("0006_*.up.sql")
	scalar("SELECT count(*) FROM pessoas", 3)
	migration("0007_*.up.sql")
	exec("INSERT INTO clientes (created_at,updated_at,tenant_id,nome,email) VALUES (now(),now(),9001,'Outro','same@example.invalid')")
	if _, err := db.Exec(ctx, "INSERT INTO clientes (created_at,updated_at,tenant_id,nome,email) VALUES (now(),now(),1,'Duplicado','same@example.invalid')"); err == nil {
		t.Fatal("same-tenant duplicate accepted")
	}
	b, _ := os.ReadFile("0007_clientes_email_por_tenant.down.sql")
	if _, err := db.Exec(ctx, string(b)); err == nil {
		t.Fatal("unsafe downgrade accepted")
	}
	exec("ROLLBACK")
	scalar("SELECT count(*) FROM pg_indexes WHERE indexname='clientes_tenant_email_key'", 1)
	exec("DELETE FROM clientes WHERE tenant_id=9001")
	migration("0007_*.down.sql")
	migration("0007_*.up.sql")
	migration("0006_*.down.sql")
	scalar("SELECT count(*) FROM pessoas", 3)
	// Invalid legacy data must fail atomically, leaving every source untouched.
	exec("INSERT INTO clientes (created_at,updated_at,tenant_id,nome,cpf) VALUES (now(),now(),1,'Invalido','123')")
	b, _ = os.ReadFile("0006_backfill_pessoas.up.sql")
	if _, err := db.Exec(ctx, string(b)); err == nil {
		t.Fatal("invalid CPF accepted")
	}
	exec("ROLLBACK")
	scalar("SELECT count(*) FROM clientes WHERE cpf='123' AND pessoa_id IS NULL", 1)
}
