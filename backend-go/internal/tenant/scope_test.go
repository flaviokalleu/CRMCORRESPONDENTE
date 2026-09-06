package tenant

import (
	"context"
	"strings"
	"testing"

	"crmimob/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestSensitiveModelsAlwaysScopeQueriesAndDeletes(t *testing.T) {
	db, err := gorm.Open(postgres.Open("host=localhost user=test dbname=test"), &gorm.Config{
		DryRun: true, DisableAutomaticPing: true, SkipDefaultTransaction: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := RegisterCallbacks(db); err != nil {
		t.Fatal(err)
	}
	tenantID := uint(42)
	ctx := With(context.Background(), Scope{TenantID: &tenantID})
	for _, model := range []any{&models.Nota{}, &models.Lembrete{}, &models.Acesso{}} {
		for _, operation := range []string{"query", "delete", "update"} {
			q := db.WithContext(ctx).Model(model).Where("id = ?", 123)
			switch operation {
			case "query":
				q = q.Find(model)
			case "delete":
				q = q.Delete(model)
			case "update":
				q = q.Update("tenant_id", tenantID)
			}
			if q.Error != nil {
				t.Fatal(q.Error)
			}
			sql := q.Statement.SQL.String()
			where := strings.SplitN(sql, "WHERE", 2)
			if len(where) != 2 || !strings.Contains(where[1], "tenant_id") {
				t.Fatalf("%T %s missing tenant filter: %s", model, operation, sql)
			}
		}
	}
}
