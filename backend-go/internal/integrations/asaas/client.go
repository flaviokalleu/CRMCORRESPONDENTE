// Package asaas implementa um cliente HTTP mínimo para a API Asaas v3
// (https://docs.asaas.com/), substituindo o Mercado Pago para cobranças
// avulsas e mantendo o fluxo de aluguéis/repasses que já usava Asaas no Node
// (services/asaasService.js). Sem SDK externo — apenas net/http + encoding/json.
//
// Autenticação: header `access_token: <chave>` (NÃO é Bearer — 03-spec gotcha §11).
// A chave é resolvida POR TENANT (tenant.AsaasAPIKey), com fallback para a
// variável de ambiente global ASAAS_API_KEY quando o tenant não tem chave
// própria (03-spec §"Visão geral" e gotcha §5: no Node isso era feito de forma
// inconsistente — aqui a resolução é centralizada e sempre explícita).
package asaas

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

const (
	BaseURLProduction = "https://api.asaas.com/v3"
	BaseURLSandbox    = "https://sandbox.asaas.com/api/v3"
)

// Client é um cliente Asaas já vinculado a uma chave de API (tenant ou global).
type Client struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
}

// ResolveEnvironment lê ASAAS_ENVIRONMENT (sandbox|production). Default: sandbox
// (mais seguro para não disparar cobranças reais por engano em dev/staging).
func ResolveEnvironment() string {
	env := os.Getenv("ASAAS_ENVIRONMENT")
	if env == "production" {
		return "production"
	}
	return "sandbox"
}

func baseURLFor(env string) string {
	if env == "production" {
		return BaseURLProduction
	}
	return BaseURLSandbox
}

// ResolveAPIKey devolve a chave do tenant se presente e não-vazia, senão a
// chave global ASAAS_API_KEY. Retorna "" se nenhuma estiver configurada —
// quem chamar deve tratar isso como erro de configuração (não deixar cair
// silenciosamente em produção — 03-spec gotcha §5).
func ResolveAPIKey(tenantAPIKey *string) string {
	if tenantAPIKey != nil && *tenantAPIKey != "" {
		return *tenantAPIKey
	}
	return os.Getenv("ASAAS_API_KEY")
}

// NewClient cria um client Asaas para a chave informada, usando o ambiente
// resolvido de ASAAS_ENVIRONMENT.
func NewClient(apiKey string) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 15 * time.Second},
		baseURL:    baseURLFor(ResolveEnvironment()),
		apiKey:     apiKey,
	}
}

// NewClientForTenant resolve a chave (tenant → fallback global) e devolve um
// client pronto para uso. É o ponto de entrada recomendado nos services.
func NewClientForTenant(tenantAPIKey *string) *Client {
	return NewClient(ResolveAPIKey(tenantAPIKey))
}

// ErrAsaas representa um erro retornado pela API Asaas (corpo `errors[]`).
type ErrAsaas struct {
	StatusCode int
	Body       string
}

func (e *ErrAsaas) Error() string {
	return fmt.Sprintf("asaas: status %d: %s", e.StatusCode, e.Body)
}

func (c *Client) do(ctx context.Context, method, path string, reqBody any, out any) error {
	var bodyReader io.Reader
	if reqBody != nil {
		b, err := json.Marshal(reqBody)
		if err != nil {
			return fmt.Errorf("asaas: marshal request: %w", err)
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bodyReader)
	if err != nil {
		return fmt.Errorf("asaas: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("access_token", c.apiKey)
	req.Header.Set("User-Agent", "crmimob-go")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("asaas: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("asaas: read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return &ErrAsaas{StatusCode: resp.StatusCode, Body: string(respBody)}
	}

	if out != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, out); err != nil {
			return fmt.Errorf("asaas: unmarshal response: %w", err)
		}
	}
	return nil
}

func (c *Client) get(ctx context.Context, path string, out any) error {
	return c.do(ctx, http.MethodGet, path, nil, out)
}

func (c *Client) post(ctx context.Context, path string, body any, out any) error {
	return c.do(ctx, http.MethodPost, path, body, out)
}

func (c *Client) put(ctx context.Context, path string, body any, out any) error {
	return c.do(ctx, http.MethodPut, path, body, out)
}

func (c *Client) del(ctx context.Context, path string) error {
	return c.do(ctx, http.MethodDelete, path, nil, nil)
}
