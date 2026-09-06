package pessoas

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"crmimob/internal/models"
	"crmimob/internal/tenant"
)

// Não há harness de teste de integração em backend-go (nenhum outro pacote
// conecta num banco real em teste). Este arquivo é o primeiro e propositalmente
// mínimo: conecta no Postgres de desenvolvimento do .env — mesma leitura de
// configuração que cmd/dbq/main.go já faz — e PULA (t.Skip) se o banco não
// estiver acessível, para que `go test ./...` continue passando numa máquina
// sem Postgres rodando.

// loadDotEnvParaTeste replica cmd/dbq/main.go:loadDotEnv — lê backend-go/.env
// sem sobrescrever variáveis já definidas no ambiente. Duplicado aqui (em vez
// de importado) porque cmd/dbq é package main.
func loadDotEnvParaTeste(path string) {
	b, err := os.ReadFile(path)
	if err != nil {
		return
	}
	for _, line := range strings.Split(string(b), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		k, v = strings.TrimSpace(k), strings.Trim(strings.TrimSpace(v), `"'`)
		if os.Getenv(k) == "" {
			_ = os.Setenv(k, v)
		}
	}
}

func envOuPadrao(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

// integrationDB conecta no banco real (backend-go/.env, mesma DSN de
// cmd/dbq) e regista os callbacks de tenant, iguais aos de produção
// (internal/database.Connect). Pula o teste se a conexão falhar.
func integrationDB(t *testing.T) *gorm.DB {
	t.Helper()
	loadDotEnvParaTeste("../../../.env")

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		envOuPadrao("DB_HOST", "localhost"), envOuPadrao("DB_PORT", "5432"),
		os.Getenv("DB_USERNAME"), os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"), envOuPadrao("DB_SSLMODE", "disable"))

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Silent),
	})
	if err != nil {
		t.Skipf("banco indisponível, pulando teste de integração: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Skipf("banco indisponível, pulando teste de integração: %v", err)
	}
	if err := sqlDB.Ping(); err != nil {
		t.Skipf("banco indisponível, pulando teste de integração: %v", err)
	}
	if err := tenant.RegisterCallbacks(db); err != nil {
		t.Fatalf("registrar callbacks de tenant: %v", err)
	}
	return db
}

// integrationCtx usa o tenant 1, que existe no seed base do banco de
// desenvolvimento (ver instrução da tarefa).
func integrationCtx() context.Context {
	id := uint(1)
	return tenant.With(context.Background(), tenant.Scope{TenantID: &id})
}

// limparPorCPF apaga, nesta ordem (fichas antes da identidade, por causa da FK
// pessoa_id), qualquer linha de teste que tenha sobrado com o CPF dado. Usado
// em t.Cleanup para não deixar lixo no banco de desenvolvimento mesmo quando o
// teste falha no meio do caminho.
//
// clientes e cliente_aluguels têm coluna cpf própria, mas proprietario NÃO
// tem coluna cpf (só id, name, address, phone, tenant_id, pessoa_id) — suas
// linhas são apagadas por pessoa_id, via subquery em pessoas.cpf.
func limparPorCPF(t *testing.T, db *gorm.DB, cpf string) {
	t.Helper()
	for _, tabela := range []string{"cliente_aluguels", "clientes"} {
		if err := db.Exec(fmt.Sprintf("DELETE FROM %s WHERE cpf = ?", tabela), cpf).Error; err != nil {
			t.Errorf("cleanup: apagar de %s: %v", tabela, err)
		}
	}
	if err := db.Exec("DELETE FROM proprietario WHERE pessoa_id IN (SELECT id FROM pessoas WHERE cpf = ?)", cpf).Error; err != nil {
		t.Errorf("cleanup: apagar de proprietario: %v", err)
	}
	if err := db.Exec("DELETE FROM pessoas WHERE cpf = ?", cpf).Error; err != nil {
		t.Errorf("cleanup: apagar de pessoas: %v", err)
	}
}

// TestCriarIntegracaoRollbackQuandoFichaFalha é a garantia central da tarefa:
// se a ficha não pode ser gravada, a pessoa também não fica gravada.
//
// Mecanismo para forçar a falha da ficha SEM alterar código de produção: o
// tenant já tem uma ficha em clientes com um CPF fixo (pré-semeada por este
// teste). clientes_tenant_cpf_key é único por (tenant_id, cpf), então o
// INSERT que fichaComprador faz para uma pessoa NOVA com o mesmo CPF viola a
// constraint e falha de verdade no Postgres — não é um erro simulado.
func TestCriarIntegracaoRollbackQuandoFichaFalha(t *testing.T) {
	db := integrationDB(t)
	ctx := integrationCtx()
	svc := NewService(NewRepository(db), db)

	const cpf = "90011122233"
	t.Cleanup(func() { limparPorCPF(t, db, cpf) })

	nomeConflitante := "Cliente Preexistente Rollback Test"
	cpfVal := cpf
	clienteExistente := models.Cliente{
		Nome:   &nomeConflitante,
		CPF:    &cpfVal,
		Status: "aguardando_aprovacao",
	}
	if err := db.WithContext(ctx).Create(&clienteExistente).Error; err != nil {
		t.Fatalf("setup: criar cliente conflitante: %v", err)
	}

	_, err := svc.Criar(ctx, CriarRequest{
		Papel: PapelComprador,
		Nome:  "Pessoa Deve Ser Revertida",
		CPF:   cpf,
	})
	if err == nil {
		t.Fatal("Criar = nil, queria erro de constraint ao gravar ficha com CPF já usado por outra ficha do tenant")
	}

	var count int64
	if err := db.WithContext(ctx).Model(&models.Pessoa{}).Where("cpf = ?", cpf).Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("rollback não aconteceu: %d linha(s) em pessoas com cpf=%q sobreviveram à falha da ficha", count, cpf)
	}
}

// TestCriarIntegracaoReaproveitaIdentidadePorCPF cobre o segundo comportamento
// central: um segundo Criar com o mesmo CPF, papel diferente, reaproveita a
// mesma linha em pessoas em vez de duplicá-la.
func TestCriarIntegracaoReaproveitaIdentidadePorCPF(t *testing.T) {
	db := integrationDB(t)
	ctx := integrationCtx()
	svc := NewService(NewRepository(db), db)

	const cpf = "90022233344"
	t.Cleanup(func() { limparPorCPF(t, db, cpf) })

	primeira, err := svc.Criar(ctx, CriarRequest{Papel: PapelComprador, Nome: "Reaproveitamento CPF", CPF: cpf})
	if err != nil {
		t.Fatalf("criar comprador: %v", err)
	}

	segunda, err := svc.Criar(ctx, CriarRequest{Papel: PapelInquilino, Nome: "Reaproveitamento CPF", CPF: cpf})
	if err != nil {
		t.Fatalf("criar inquilino reaproveitando cpf: %v", err)
	}
	if segunda.ID != primeira.ID {
		t.Fatalf("esperava reaproveitar pessoa id %d, veio id %d (criou identidade nova em vez de reaproveitar)", primeira.ID, segunda.ID)
	}
	if !segunda.Papeis.Comprador || !segunda.Papeis.Inquilino {
		t.Fatalf("papeis = %+v, queria comprador=true e inquilino=true", segunda.Papeis)
	}

	var count int64
	if err := db.WithContext(ctx).Model(&models.Pessoa{}).Where("cpf = ?", cpf).Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("esperava exatamente 1 pessoa com cpf=%q, achei %d", cpf, count)
	}
}

// TestListIntegracaoDevolvePapeisSemNMaisUm cobre o contrato que a tela
// /pessoas do frontend depende: GET /pessoas precisa devolver "papeis" por
// pessoa (não só a identidade), resolvido em lote — testar List sem isso não
// pegaria uma regressão que faria os badges de papel sumirem da lista.
func TestListIntegracaoDevolvePapeisSemNMaisUm(t *testing.T) {
	db := integrationDB(t)
	ctx := integrationCtx()
	svc := NewService(NewRepository(db), db)

	const cpf = "90044455566"
	t.Cleanup(func() { limparPorCPF(t, db, cpf) })

	criada, err := svc.Criar(ctx, CriarRequest{Papel: PapelComprador, Nome: "Lista Com Papeis", CPF: cpf})
	if err != nil {
		t.Fatalf("criar comprador: %v", err)
	}
	if _, err := svc.Criar(ctx, CriarRequest{Papel: PapelProprietario, Nome: "Lista Com Papeis", CPF: cpf}); err != nil {
		t.Fatalf("criar proprietario: %v", err)
	}

	lista, err := svc.List(ctx, "", cpf)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(lista) != 1 {
		t.Fatalf("len(lista) = %d, queria 1", len(lista))
	}
	got := lista[0]
	if got.ID != criada.ID {
		t.Fatalf("id = %d, queria %d", got.ID, criada.ID)
	}
	if !got.Papeis.Comprador || !got.Papeis.Proprietario || got.Papeis.Inquilino {
		t.Fatalf("papeis = %+v, queria comprador=true proprietario=true inquilino=false", got.Papeis)
	}
}

// TestCriarIntegracaoPapelDuplicadoNaoEscreveNada cobre o terceiro
// comportamento central: pedir um papel que a pessoa já tem devolve
// ErrPapelJaExiste e não grava uma segunda ficha.
func TestCriarIntegracaoPapelDuplicadoNaoEscreveNada(t *testing.T) {
	db := integrationDB(t)
	ctx := integrationCtx()
	svc := NewService(NewRepository(db), db)

	const cpf = "90033344455"
	t.Cleanup(func() { limparPorCPF(t, db, cpf) })

	if _, err := svc.Criar(ctx, CriarRequest{Papel: PapelComprador, Nome: "Papel Duplicado", CPF: cpf}); err != nil {
		t.Fatalf("criar comprador: %v", err)
	}

	_, err := svc.Criar(ctx, CriarRequest{Papel: PapelComprador, Nome: "Papel Duplicado", CPF: cpf})
	if !errors.Is(err, ErrPapelJaExiste) {
		t.Fatalf("erro = %v, quero ErrPapelJaExiste", err)
	}

	var count int64
	if err := db.WithContext(ctx).Model(&models.Cliente{}).Where("cpf = ?", cpf).Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("esperava exatamente 1 ficha de cliente com cpf=%q, achei %d (papel duplicado escreveu algo)", cpf, count)
	}
}
