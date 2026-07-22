package alugueis

import (
	"errors"
	"time"
)

// ErrAsaasNotConfigured indica ausência de chave Asaas configurada para o
// tenant — equivalente ao Node não bloquear a criação do inquilino quando
// `ASAAS_API_KEY` não está setada (04-spec §2, POST /clientealuguel).
var ErrAsaasNotConfigured = errors.New("asaas: integração não configurada")

// ErrAsaasNotImplemented é devolvido pelo stub padrão enquanto a integração
// real (internal/integrations/asaas, em construção por outro agente) não é
// conectada. Ver docs/migration/wiring/04-alugueis.md.
var ErrAsaasNotImplemented = errors.New("asaas: integração ainda não implementada")

// AsaasCustomer/AsaasSubscription/AsaasCharge são os shapes mínimos que este
// módulo precisa da API Asaas — a implementação real fica em
// internal/integrations/asaas, que deve satisfazer AsaasClient.
type AsaasCustomer struct {
	ID string
}

type AsaasSubscription struct {
	ID     string
	Status string
}

type AsaasCharge struct {
	ID            string
	Status        string // PENDING/CONFIRMED/OVERDUE/...
	BillingType   string
	InvoiceURL    string
	BankSlipURL   string
	PixQrCode     string
	Value         float64
	DueDate       time.Time
	SubscriptionID string
}

// AsaasClient é a interface que este módulo depende para operações de
// cliente/assinatura/cobrança no Asaas. A implementação concreta (chave por
// tenant, HTTP real) é responsabilidade de internal/integrations/asaas — este
// pacote apenas consome a interface (inversão de dependência), permitindo
// testar/rodar sem a integração pronta.
type AsaasClient interface {
	CriarCliente(apiKey string, nome, cpf, email, telefone string) (*AsaasCustomer, error)
	CriarAssinatura(apiKey string, customerID string, valor float64, proximoVencimento time.Time, descricao string) (*AsaasSubscription, error)
	AtualizarAssinatura(apiKey string, subscriptionID string, novoValor float64) error
	CancelarAssinatura(apiKey string, subscriptionID string) error
	CriarCobrancaAvulsa(apiKey string, customerID string, valor float64, vencimento time.Time, descricao string) (*AsaasCharge, error)
	ListarCobrancasPorAssinatura(apiKey string, subscriptionID string) ([]AsaasCharge, error)
	ListarCobrancasPorCliente(apiKey string, customerID string) ([]AsaasCharge, error)
	RealizarTransferenciaPix(apiKey string, valor float64, chavePix string, descricao string) (transferID string, err error)
}

// CalcularProximoVencimento replica `calcularProximoVencimento(diaVencimento)`
// do Node: próxima data (mês atual se ainda não passou o dia, senão mês
// seguinte) com o dia de vencimento informado.
func CalcularProximoVencimento(diaVencimento int, now time.Time) time.Time {
	if diaVencimento < 1 {
		diaVencimento = 1
	}
	if diaVencimento > 28 {
		diaVencimento = 28 // evita estourar meses curtos, como o Node faz na prática
	}
	candidate := time.Date(now.Year(), now.Month(), diaVencimento, 0, 0, 0, 0, now.Location())
	if !candidate.After(now) {
		candidate = candidate.AddDate(0, 1, 0)
	}
	return candidate
}

// NoopAsaasClient é o stub padrão: toda operação falha com
// ErrAsaasNotImplemented. Usado até a integração real ser conectada via
// injeção de dependência (ver wiring doc) — o restante do módulo já trata
// esse erro como "não bloqueante" nos fluxos que o Node também tolera.
type NoopAsaasClient struct{}

func (NoopAsaasClient) CriarCliente(string, string, string, string, string) (*AsaasCustomer, error) {
	return nil, ErrAsaasNotImplemented
}
func (NoopAsaasClient) CriarAssinatura(string, string, float64, time.Time, string) (*AsaasSubscription, error) {
	return nil, ErrAsaasNotImplemented
}
func (NoopAsaasClient) AtualizarAssinatura(string, string, float64) error {
	return ErrAsaasNotImplemented
}
func (NoopAsaasClient) CancelarAssinatura(string, string) error { return ErrAsaasNotImplemented }
func (NoopAsaasClient) CriarCobrancaAvulsa(string, string, float64, time.Time, string) (*AsaasCharge, error) {
	return nil, ErrAsaasNotImplemented
}
func (NoopAsaasClient) ListarCobrancasPorAssinatura(string, string) ([]AsaasCharge, error) {
	return nil, ErrAsaasNotImplemented
}
func (NoopAsaasClient) ListarCobrancasPorCliente(string, string) ([]AsaasCharge, error) {
	return nil, ErrAsaasNotImplemented
}
func (NoopAsaasClient) RealizarTransferenciaPix(string, float64, string, string) (string, error) {
	return "", ErrAsaasNotImplemented
}
