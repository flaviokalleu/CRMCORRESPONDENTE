package asaas

import (
	"context"
	"regexp"
	"strings"
)

var (
	cpfCnpjDigitsOnly = regexp.MustCompile(`\D`)
	emailRe           = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
	phoneRe           = regexp.MustCompile(`^\+?\d{10,13}$`)
)

// DetectPixKeyType replica `detectarTipoChavePix` do Node (03-spec gotcha §9):
// classifica a chave PIX do proprietário para montar o `pixAddressKeyType`
// exigido pela Asaas em POST /transfers.
func DetectPixKeyType(key string) string {
	k := strings.TrimSpace(key)
	digits := cpfCnpjDigitsOnly.ReplaceAllString(k, "")

	switch {
	case emailRe.MatchString(k):
		return PixKeyTypeEmail
	case len(digits) == 11 && digits == k:
		return PixKeyTypeCPF
	case len(digits) == 14 && digits == k:
		return PixKeyTypeCNPJ
	case phoneRe.MatchString(k):
		return PixKeyTypePhone
	case len(k) == 32 || strings.Contains(k, "-"): // chave aleatória (EVP), formato UUID
		return PixKeyTypeEVP
	default:
		return PixKeyTypeEVP
	}
}

// CreateTransfer — POST /transfers (repasse PIX ao proprietário). Equivalente
// a `realizarTransferenciaPix`. Detecta o tipo de chave automaticamente se
// `keyType` vier vazio.
func (c *Client) CreateTransfer(ctx context.Context, value float64, pixKey, keyType, description string) (*Transfer, error) {
	if keyType == "" {
		keyType = DetectPixKeyType(pixKey)
	}
	in := CreateTransferRequest{
		Value:             value,
		PixAddressKey:     pixKey,
		PixAddressKeyType: keyType,
		Description:       description,
	}
	var out Transfer
	if err := c.post(ctx, "/transfers", in, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// GetTransfers — GET /transfers. Equivalente a `buscarTransferencias`/listagem
// usada para conferência de repasses.
func (c *Client) GetTransfers(ctx context.Context) (*TransferList, error) {
	var out TransferList
	if err := c.get(ctx, "/transfers", &out); err != nil {
		return nil, err
	}
	return &out, nil
}
