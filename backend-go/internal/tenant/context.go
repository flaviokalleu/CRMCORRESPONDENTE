// Package tenant implementa o isolamento multi-tenant. Substitui o mecanismo
// Node de AsyncLocalStorage + hooks Sequelize (middleware/tenantScope.js) por
// context.Context propagado ao *gorm.DB + callbacks globais. Ver 01-spec §5.
package tenant

import "context"

// Scope é o contexto de tenant de um request. TenantID nil + IsSuperAdmin=true
// significa acesso global (super admin sem X-Tenant-Id).
type Scope struct {
	TenantID     *uint
	IsSuperAdmin bool
}

type ctxKey struct{}

// With devolve um novo context carregando o scope de tenant.
func With(ctx context.Context, s Scope) context.Context {
	return context.WithValue(ctx, ctxKey{}, s)
}

// From extrai o scope do context. ok=false quando não há scope (ex.: rotas de
// auth, que não passam por ResolveTenant) — nesse caso os callbacks não filtram.
func From(ctx context.Context) (Scope, bool) {
	s, ok := ctx.Value(ctxKey{}).(Scope)
	return s, ok
}
