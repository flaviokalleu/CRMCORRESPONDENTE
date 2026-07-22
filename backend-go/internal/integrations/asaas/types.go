package asaas

// Customer — payload/resposta de POST/GET /customers (03-spec De-Para: cliente/payer).
type Customer struct {
	ID                   string `json:"id,omitempty"`
	Name                 string `json:"name"`
	CpfCnpj              string `json:"cpfCnpj,omitempty"`
	Email                string `json:"email,omitempty"`
	Phone                string `json:"phone,omitempty"`
	MobilePhone          string `json:"mobilePhone,omitempty"`
	NotificationDisabled bool   `json:"notificationDisabled,omitempty"`
	ExternalReference    string `json:"externalReference,omitempty"`
}

// Billing types aceitos por /payments e /subscriptions.
const (
	BillingTypeBoleto     = "BOLETO"
	BillingTypePix        = "PIX"
	BillingTypeCreditCard = "CREDIT_CARD"
	BillingTypeUndefined  = "UNDEFINED" // cliente escolhe no checkout (era "universal" no MP)
)

// CreatePaymentRequest — POST /payments (cobrança avulsa).
type CreatePaymentRequest struct {
	Customer          string       `json:"customer"`
	BillingType       string       `json:"billingType"`
	Value             float64      `json:"value"`
	DueDate           string       `json:"dueDate"` // YYYY-MM-DD
	Description       string       `json:"description,omitempty"`
	ExternalReference string       `json:"externalReference,omitempty"`
	InstallmentCount  int          `json:"installmentCount,omitempty"`
	InstallmentValue  float64      `json:"installmentValue,omitempty"`
	CreditCardToken   string       `json:"creditCardToken,omitempty"`
	CreditCard        *CreditCard  `json:"creditCard,omitempty"`
	CreditCardHolder  *CardHolder  `json:"creditCardHolderInfo,omitempty"`
	Interest          *ValuePerDay `json:"interest,omitempty"`
	Fine              *ValuePerDay `json:"fine,omitempty"`
	Discount          *Discount    `json:"discount,omitempty"`
}

type CreditCard struct {
	HolderName  string `json:"holderName"`
	Number      string `json:"number"`
	ExpiryMonth string `json:"expiryMonth"`
	ExpiryYear  string `json:"expiryYear"`
	Ccv         string `json:"ccv"`
}

type CardHolder struct {
	Name              string `json:"name"`
	Email             string `json:"email"`
	CpfCnpj           string `json:"cpfCnpj"`
	PostalCode        string `json:"postalCode"`
	AddressNumber     string `json:"addressNumber"`
	AddressComplement string `json:"addressComplement,omitempty"`
	Phone             string `json:"phone,omitempty"`
}

// ValuePerDay — usado em `interest`/`fine` (juros/multa), value em % ao mês/dia
// conforme tipo (FIXED|PERCENTAGE), simplificado como percentual (uso comum Asaas).
type ValuePerDay struct {
	Value float64 `json:"value"`
	Type  string  `json:"type,omitempty"` // FIXED|PERCENTAGE
}

type Discount struct {
	Value            float64 `json:"value"`
	DueDateLimitDays int     `json:"dueDateLimitDays,omitempty"`
	Type             string  `json:"type,omitempty"` // FIXED|PERCENTAGE
}

// Payment — resposta de /payments (GET/POST) e item de webhook.
type Payment struct {
	ID                    string  `json:"id"`
	Customer              string  `json:"customer"`
	Subscription          string  `json:"subscription,omitempty"`
	BillingType           string  `json:"billingType"`
	Value                 float64 `json:"value"`
	NetValue              float64 `json:"netValue"`
	Status                string  `json:"status"` // PENDING|RECEIVED|CONFIRMED|OVERDUE|REFUNDED|DELETED...
	DueDate               string  `json:"dueDate"`
	PaymentDate           string  `json:"paymentDate,omitempty"`
	ClientPaymentDate     string  `json:"clientPaymentDate,omitempty"`
	Description            string  `json:"description,omitempty"`
	InvoiceURL             string  `json:"invoiceUrl,omitempty"`
	BankSlipURL            string  `json:"bankSlipUrl,omitempty"`
	TransactionReceiptURL  string  `json:"transactionReceiptUrl,omitempty"`
	InvoiceNumber          string  `json:"invoiceNumber,omitempty"`
	ExternalReference      string  `json:"externalReference,omitempty"`
}

// PixQrCodeResponse — GET /payments/:id/pixQrCode.
type PixQrCodeResponse struct {
	EncodedImage   string `json:"encodedImage"`
	Payload        string `json:"payload"`
	ExpirationDate string `json:"expirationDate"`
}

// IdentificationFieldResponse — GET /payments/:id/identificationField (linha digitável).
type IdentificationFieldResponse struct {
	IdentificationField string `json:"identificationField"`
	Barcode             string `json:"barCode"`
}

// CreateSubscriptionRequest — POST /subscriptions.
type CreateSubscriptionRequest struct {
	Customer          string  `json:"customer"`
	BillingType       string  `json:"billingType"`
	Value             float64 `json:"value"`
	NextDueDate       string  `json:"nextDueDate"` // YYYY-MM-DD
	Cycle             string  `json:"cycle"`       // MONTHLY|YEARLY|...
	Description       string  `json:"description,omitempty"`
	ExternalReference string  `json:"externalReference,omitempty"`
}

type Subscription struct {
	ID          string  `json:"id"`
	Customer    string  `json:"customer"`
	BillingType string  `json:"billingType"`
	Value       float64 `json:"value"`
	NextDueDate string  `json:"nextDueDate"`
	Cycle       string  `json:"cycle"`
	Status      string  `json:"status"`
	Description string  `json:"description,omitempty"`
}

// UpdateSubscriptionRequest — PUT /subscriptions/:id (campos parciais).
type UpdateSubscriptionRequest struct {
	Value       *float64 `json:"value,omitempty"`
	NextDueDate string   `json:"nextDueDate,omitempty"`
	BillingType string   `json:"billingType,omitempty"`
	Description string   `json:"description,omitempty"`
}

// PaymentList — resposta paginada padrão da API Asaas.
type PaymentList struct {
	Object     string    `json:"object"`
	HasMore    bool      `json:"hasMore"`
	TotalCount int       `json:"totalCount"`
	Limit      int       `json:"limit"`
	Offset     int       `json:"offset"`
	Data       []Payment `json:"data"`
}

// Tipos de chave PIX (03-spec gotcha §9 — detectarTipoChavePix).
const (
	PixKeyTypeCPF   = "CPF"
	PixKeyTypeCNPJ  = "CNPJ"
	PixKeyTypeEmail = "EMAIL"
	PixKeyTypePhone = "PHONE"
	PixKeyTypeEVP   = "EVP" // chave aleatória
)

// CreateTransferRequest — POST /transfers (repasse PIX ao proprietário).
type CreateTransferRequest struct {
	Value          float64 `json:"value"`
	PixAddressKey  string  `json:"pixAddressKey"`
	PixAddressKeyType string `json:"pixAddressKeyType"`
	Description    string  `json:"description,omitempty"`
}

type Transfer struct {
	ID     string  `json:"id"`
	Value  float64 `json:"value"`
	Status string  `json:"status"` // PENDING|DONE|FAILED...
}

// TransferList — GET /transfers (paginado).
type TransferList struct {
	Object     string     `json:"object"`
	HasMore    bool       `json:"hasMore"`
	TotalCount int        `json:"totalCount"`
	Data       []Transfer `json:"data"`
}

// Balance — GET /finance/getCurrentBalance.
type Balance struct {
	Balance float64 `json:"balance"`
}

// WebhookPayload — corpo enviado pelo Asaas em POST /webhook (formato clássico
// `{event, payment}`). Alguns eventos podem trazer `id` no nível raiz (id do
// próprio evento, usado para idempotência — 03-spec §"Idempotência").
type WebhookPayload struct {
	ID      string  `json:"id,omitempty"`
	Event   string  `json:"event"`
	Payment Payment `json:"payment"`
}

// Eventos de webhook tratados (03-spec §"Webhook Asaas (detalhado)").
const (
	EventPaymentCreated   = "PAYMENT_CREATED"
	EventPaymentConfirmed = "PAYMENT_CONFIRMED"
	EventPaymentReceived  = "PAYMENT_RECEIVED"
	EventPaymentOverdue   = "PAYMENT_OVERDUE"
	EventPaymentRefunded  = "PAYMENT_REFUNDED"
	EventPaymentDeleted   = "PAYMENT_DELETED"
)
