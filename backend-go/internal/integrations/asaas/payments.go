package asaas

import (
	"context"
	"fmt"
	"net/url"
)

// CreatePayment — POST /payments. Cobre boleto/PIX/universal/cartão conforme
// `BillingType` no request (03-spec De-Para: substitui criarPreferenciaBoleto/
// Pix/Universal do Mercado Pago e criarCobrancaAvulsa do asaasService).
func (c *Client) CreatePayment(ctx context.Context, in CreatePaymentRequest) (*Payment, error) {
	var out Payment
	if err := c.post(ctx, "/payments", in, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// GetPayment — GET /payments/:id. Equivalente a `buscarCobranca` / `Payment.get`.
func (c *Client) GetPayment(ctx context.Context, id string) (*Payment, error) {
	var out Payment
	if err := c.get(ctx, "/payments/"+id, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// GetPixQrCode — GET /payments/:id/pixQrCode. Equivalente a `buscarPixQrCode`.
func (c *Client) GetPixQrCode(ctx context.Context, paymentID string) (*PixQrCodeResponse, error) {
	var out PixQrCodeResponse
	if err := c.get(ctx, "/payments/"+paymentID+"/pixQrCode", &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// GetIdentificationField — GET /payments/:id/identificationField (linha
// digitável do boleto). Equivalente a `buscarIdentificacaoBoleto`.
func (c *Client) GetIdentificationField(ctx context.Context, paymentID string) (*IdentificationFieldResponse, error) {
	var out IdentificationFieldResponse
	if err := c.get(ctx, "/payments/"+paymentID+"/identificationField", &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ListPaymentsBySubscription — GET /payments?subscription=:id. Equivalente a
// `listarCobrancasPorAssinatura` (usado na sincronização de aluguéis).
func (c *Client) ListPaymentsBySubscription(ctx context.Context, subscriptionID string) (*PaymentList, error) {
	var out PaymentList
	path := "/payments?subscription=" + url.QueryEscape(subscriptionID)
	if err := c.get(ctx, path, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// ListPaymentsByCustomer — GET /payments?customer=:id. Equivalente a
// `listarCobrancasPorCliente`.
func (c *Client) ListPaymentsByCustomer(ctx context.Context, customerID string) (*PaymentList, error) {
	var out PaymentList
	path := "/payments?customer=" + url.QueryEscape(customerID)
	if err := c.get(ctx, path, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// DeletePayment — DELETE /payments/:id (cancelamento de cobrança avulsa).
func (c *Client) DeletePayment(ctx context.Context, id string) error {
	return c.del(ctx, "/payments/"+id)
}

// PaymentsPath monta o path com querystring arbitrária — helper para futuras
// necessidades de filtro (status, dueDate, etc.) sem expandir a assinatura.
func PaymentsPath(params url.Values) string {
	if len(params) == 0 {
		return "/payments"
	}
	return fmt.Sprintf("/payments?%s", params.Encode())
}
