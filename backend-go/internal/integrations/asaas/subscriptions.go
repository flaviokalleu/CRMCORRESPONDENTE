package asaas

import "context"

// CreateSubscription — POST /subscriptions. Equivalente a `criarAssinatura`
// (usado tanto para aluguéis recorrentes quanto, futuramente, billing SaaS).
func (c *Client) CreateSubscription(ctx context.Context, in CreateSubscriptionRequest) (*Subscription, error) {
	var out Subscription
	if err := c.post(ctx, "/subscriptions", in, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// GetSubscription — GET /subscriptions/:id.
func (c *Client) GetSubscription(ctx context.Context, id string) (*Subscription, error) {
	var out Subscription
	if err := c.get(ctx, "/subscriptions/"+id, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// UpdateSubscription — PUT /subscriptions/:id. Equivalente a `atualizarAssinatura`.
func (c *Client) UpdateSubscription(ctx context.Context, id string, in UpdateSubscriptionRequest) (*Subscription, error) {
	var out Subscription
	if err := c.put(ctx, "/subscriptions/"+id, in, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// CancelSubscription — DELETE /subscriptions/:id. Equivalente a `cancelarAssinatura`.
func (c *Client) CancelSubscription(ctx context.Context, id string) error {
	return c.del(ctx, "/subscriptions/"+id)
}
