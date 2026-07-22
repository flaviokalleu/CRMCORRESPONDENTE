package tenant

// globalTables são tabelas isentas de tenant scope (equivalente a GLOBAL_MODELS
// em tenantScope.js). Modelos SEM coluna tenant_id são pulados automaticamente
// pelo callback (LookUpField retorna nil), então só listamos aqui os que TÊM a
// coluna mas mesmo assim não devem ser filtrados. Ver 01-spec §5.1.
var globalTables = map[string]bool{
	"tenants":            true,
	"plans":              true,
	"subscriptions":      true,
	"schema_migrations":  true, // golang-migrate
	"estados":            true,
	"municipios":         true,
}

// IsGlobalTable informa se a tabela deve escapar do tenant scope.
func IsGlobalTable(table string) bool {
	return globalTables[table]
}
