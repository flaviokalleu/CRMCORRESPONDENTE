package asaas

import "context"

// CreateCustomer — POST /customers. Equivalente a `criarCliente` do Node.
func (c *Client) CreateCustomer(ctx context.Context, in Customer) (*Customer, error) {
	var out Customer
	if err := c.post(ctx, "/customers", in, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// GetCustomer — GET /customers/:id. Equivalente a `buscarCliente`.
func (c *Client) GetCustomer(ctx context.Context, id string) (*Customer, error) {
	var out Customer
	if err := c.get(ctx, "/customers/"+id, &out); err != nil {
		return nil, err
	}
	return &out, nil
}
