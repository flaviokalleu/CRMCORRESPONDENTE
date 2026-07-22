package dashboards

import (
	"sync"
	"time"
)

// cacheTTL replica o TTL de 5 minutos do dashboardService.js do Node.
const cacheTTL = 5 * time.Minute

// entry é um item de cache com timestamp de expiração.
type entry struct {
	value     *MainDashboardResponse
	expiresAt time.Time
}

// Cache é um cache in-process com TTL para o dashboard principal.
//
// Correção deliberada (gotcha §5): a chave do Node era só `email+role`, o que
// vaza dados entre tenants em caso de reuso de processo/cluster. Aqui a chave
// SEMPRE inclui o tenant (ou "global" para super admin sem tenant selecionado).
// Não é cluster-safe (cada instância tem seu próprio cache); se múltiplas
// réplicas rodarem atrás de um load balancer, trocar por Redis mantendo a
// mesma chave.
type Cache struct {
	mu   sync.RWMutex
	data map[string]entry
}

func NewCache() *Cache {
	return &Cache{data: make(map[string]entry)}
}

// Key monta a chave de cache: tenant_id (ou "global") + email + role.
func Key(tenantID *uint, email, role string) string {
	tid := "global"
	if tenantID != nil {
		tid = uintToString(*tenantID)
	}
	return tid + "|" + email + "|" + role
}

func (c *Cache) Get(key string) (*MainDashboardResponse, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	e, ok := c.data[key]
	if !ok || time.Now().After(e.expiresAt) {
		return nil, false
	}
	return e.value, true
}

func (c *Cache) Set(key string, v *MainDashboardResponse) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[key] = entry{value: v, expiresAt: time.Now().Add(cacheTTL)}
}

// Invalidate limpa todo o cache. Deve ser chamado em create/update/delete de
// Cliente (equivalente a `invalidateCache()` no Node). Como a chave é por
// tenant+role+email e não temos um bus de eventos entre módulos neste cluster,
// invalidamos tudo — é uma operação barata (mapa pequeno, TTL curto).
func (c *Cache) Invalidate() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data = make(map[string]entry)
}

func uintToString(u uint) string {
	if u == 0 {
		return "0"
	}
	digits := [20]byte{}
	i := len(digits)
	for u > 0 {
		i--
		digits[i] = byte('0' + u%10)
		u /= 10
	}
	return string(digits[i:])
}
