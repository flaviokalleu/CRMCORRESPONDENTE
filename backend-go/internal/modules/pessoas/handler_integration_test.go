package pessoas

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/models"
)

// newTestRouter monta um *gin.Engine só com o handler de pessoas montado sob
// /api, sem o middleware real de auth/tenant (ver internal/server/router.go)
// — só um stub que injeta um *models.User no contexto Gin, na mesma chave
// (auth.CtxUser) que auth.Required() usaria, porque Handler.Criar agora
// exige actor (Fix 1 do relatório final: Cliente.UserID precisa vir de
// alguém). O isolamento de tenant continua ativo por fora disso, pelos
// callbacks do GORM (registrados por integrationDB), acionados por qualquer
// db.WithContext(ctx) que o service faça — daí o contexto de cada requisição
// ser trocado por integrationCtx() antes do ServeHTTP, no mesmo espírito de
// internal/tenant/scope_test.go.
func newTestRouter(db *gorm.DB) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	api := r.Group("/api")
	api.Use(func(c *gin.Context) {
		c.Set(auth.CtxUser, &models.User{ID: 1, IsAdministrador: true})
		c.Next()
	})
	h := NewHandler(NewService(NewRepository(db), db))
	h.Register(api)
	return r
}

// TestRotaBuscarNaoCaiNoGetPorID é a verificação central de ordenação de rota
// pedida na tarefa: GET /pessoas/buscar precisa cair em Buscar, não em Get
// com :id="buscar". Não depende do banco — a rota erra antes de qualquer
// chamada ao service (cpf vazio), então a distinção entre os dois handlers
// aparece só na mensagem de erro:
//   - Buscar sem ?cpf devolve 400 "cpf é obrigatório"
//   - Get com :id="buscar" devolveria 400 "id inválido" (falha no ParseUint)
//
// Perturbação para validar o teste: renomear a rota "/pessoas/buscar" para
// registrar DEPOIS de "/pessoas/:id" não muda o resultado (Gin prioriza nó
// estático), mas trocar h.Buscar por h.Get no Register faz este teste falhar
// com "id inválido" em vez de "cpf é obrigatório" — confirmado manualmente
// durante o desenvolvimento (ver relatório da tarefa).
func TestRotaBuscarNaoCaiNoGetPorID(t *testing.T) {
	db := integrationDB(t)
	r := newTestRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/pessoas/buscar", nil)
	req = req.WithContext(integrationCtx())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, queria %d (body=%s)", w.Code, http.StatusBadRequest, w.Body.String())
	}
	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("resposta não é JSON: %v (body=%s)", err, w.Body.String())
	}
	if body["error"] != "cpf é obrigatório" {
		t.Fatalf(`error = %q, queria "cpf é obrigatório" (se veio "id inválido", a rota /pessoas/buscar caiu em Get(:id))`, body["error"])
	}
}

// TestHandlerBuscarRetorna200ComNullQuandoNaoEncontra cobre o contrato
// "não existe não é erro": CPF sem nenhuma pessoa correspondente devolve 200
// com corpo null, nunca 404 nem 500.
func TestHandlerBuscarRetorna200ComNullQuandoNaoEncontra(t *testing.T) {
	db := integrationDB(t)
	r := newTestRouter(db)

	const cpf = "90099988877"
	t.Cleanup(func() { limparPorCPF(t, db, cpf) })

	req := httptest.NewRequest(http.MethodGet, "/api/pessoas/buscar?cpf="+cpf, nil)
	req = req.WithContext(integrationCtx())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, queria 200 (body=%s)", w.Code, w.Body.String())
	}
	if got := bytes.TrimSpace(w.Body.Bytes()); string(got) != "null" {
		t.Fatalf("body = %q, queria \"null\"", got)
	}
}

// TestHandlerCriarPapelInvalidoRetorna400 cobre a validação de papel exposta
// via HTTP (ErrPapelInvalido -> 400).
func TestHandlerCriarPapelInvalidoRetorna400(t *testing.T) {
	db := integrationDB(t)
	r := newTestRouter(db)

	corpo := `{"papel":"inexistente","nome":"Papel Invalido HTTP"}`
	req := httptest.NewRequest(http.MethodPost, "/api/pessoas", bytes.NewBufferString(corpo))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(integrationCtx())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, queria 400 (body=%s)", w.Code, w.Body.String())
	}
}

// TestHandlerCriarPapelDuplicadoRetorna409 cobre ErrPapelJaExiste -> 409 via
// HTTP: cria uma vez (201) e repete o mesmo papel para o mesmo CPF (409).
func TestHandlerCriarPapelDuplicadoRetorna409(t *testing.T) {
	db := integrationDB(t)
	r := newTestRouter(db)

	const cpf = "90088877766"
	t.Cleanup(func() { limparPorCPF(t, db, cpf) })

	corpo := `{"papel":"comprador","nome":"Papel Duplicado HTTP","cpf":"` + cpf + `"}`

	req1 := httptest.NewRequest(http.MethodPost, "/api/pessoas", bytes.NewBufferString(corpo))
	req1.Header.Set("Content-Type", "application/json")
	req1 = req1.WithContext(integrationCtx())
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)
	if w1.Code != http.StatusCreated {
		t.Fatalf("primeira criação: status = %d, queria 201 (body=%s)", w1.Code, w1.Body.String())
	}

	req2 := httptest.NewRequest(http.MethodPost, "/api/pessoas", bytes.NewBufferString(corpo))
	req2.Header.Set("Content-Type", "application/json")
	req2 = req2.WithContext(integrationCtx())
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusConflict {
		t.Fatalf("segunda criação (papel duplicado): status = %d, queria 409 (body=%s)", w2.Code, w2.Body.String())
	}
}
