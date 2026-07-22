package asaas

import "context"

// GetBalance — GET /finance/getCurrentBalance. Equivalente a `buscarSaldo`.
func (c *Client) GetBalance(ctx context.Context) (*Balance, error) {
	var out Balance
	if err := c.get(ctx, "/finance/getCurrentBalance", &out); err != nil {
		return nil, err
	}
	return &out, nil
}
