package tenant

import (
	"reflect"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const tenantColumn = "tenant_id"

// RegisterCallbacks instala os callbacks globais de tenant no *gorm.DB.
// Equivale aos hooks beforeFind/beforeCount/beforeCreate/beforeUpdate/beforeDestroy
// do Node (setupTenantScopes). Ver 01-spec §5.2.
//
// Diferença deliberada e mais segura que o Node: em UPDATE/DELETE forçamos
// tenant_id no WHERE (em vez de apenas barrar a instância carregada), o que
// protege também operações em massa. Ver gotcha 01-spec §7.15.
func RegisterCallbacks(db *gorm.DB) error {
	q := db.Callback().Query()
	if err := q.Before("gorm:query").Register("tenant:filter_query", filterCallback); err != nil {
		return err
	}
	if err := db.Callback().Row().Before("gorm:row").Register("tenant:filter_row", filterCallback); err != nil {
		return err
	}
	if err := db.Callback().Create().Before("gorm:create").Register("tenant:inject_create", injectCallback); err != nil {
		return err
	}
	if err := db.Callback().Update().Before("gorm:update").Register("tenant:filter_update", filterCallback); err != nil {
		return err
	}
	if err := db.Callback().Delete().Before("gorm:delete").Register("tenant:filter_delete", filterCallback); err != nil {
		return err
	}
	return nil
}

// scopedField devolve o scope efetivo e o campo tenant_id do schema, ou (_, nil)
// quando o statement não deve ser filtrado (sem scope, tabela global, super admin
// global, ou modelo sem coluna tenant_id).
func shouldApply(db *gorm.DB) (Scope, bool) {
	if db.Statement == nil || db.Statement.Schema == nil {
		return Scope{}, false
	}
	if IsGlobalTable(db.Statement.Table) {
		return Scope{}, false
	}
	if db.Statement.Schema.LookUpField(tenantColumn) == nil {
		return Scope{}, false // modelo não tem tenant_id → no-op
	}
	scope, ok := From(db.Statement.Context)
	if !ok || scope.TenantID == nil {
		// Sem tenant no contexto (rota de auth) ou super admin global → não filtra.
		return Scope{}, false
	}
	return scope, true
}

// filterCallback injeta `tenant_id = ?` no WHERE de SELECT/UPDATE/DELETE.
func filterCallback(db *gorm.DB) {
	scope, ok := shouldApply(db)
	if !ok {
		return
	}
	db.Statement.AddClause(clause.Where{Exprs: []clause.Expression{
		clause.Eq{Column: clause.Column{Table: db.Statement.Table, Name: tenantColumn}, Value: *scope.TenantID},
	}})
}

// injectCallback preenche tenant_id no INSERT quando ainda estiver zero.
func injectCallback(db *gorm.DB) {
	scope, ok := shouldApply(db)
	if !ok {
		return
	}
	field := db.Statement.Schema.LookUpField(tenantColumn)
	if field == nil {
		return
	}
	setIfZero := func(rv reflect.Value) {
		_, isZero := field.ValueOf(db.Statement.Context, rv)
		if isZero {
			_ = field.Set(db.Statement.Context, rv, *scope.TenantID)
		}
	}
	switch db.Statement.ReflectValue.Kind() {
	case reflect.Slice, reflect.Array:
		for i := 0; i < db.Statement.ReflectValue.Len(); i++ {
			setIfZero(db.Statement.ReflectValue.Index(i))
		}
	case reflect.Struct:
		setIfZero(db.Statement.ReflectValue)
	}
}
