package database

import (
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"crmimob/internal/config"
	"crmimob/internal/tenant"
)

// Connect abre o pool GORM/pgx contra o Postgres existente (mesmo banco do Node).
// NÃO roda AutoMigrate — o schema é de propriedade do golang-migrate. Registra os
// callbacks de tenant antes de devolver a conexão.
func Connect(cfg *config.Config) (*gorm.DB, error) {
	logLevel := gormlogger.Warn
	if cfg.IsProduction() {
		logLevel = gormlogger.Error
	}

	db, err := gorm.Open(postgres.Open(cfg.DB.DSN()), &gorm.Config{
		Logger:                                   gormlogger.Default.LogMode(logLevel),
		PrepareStmt:                              true, // performance: cache de prepared statements
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		return nil, fmt.Errorf("database: abrir conexão: %w", err)
	}

	if err := tenant.RegisterCallbacks(db); err != nil {
		return nil, fmt.Errorf("database: registrar callbacks de tenant: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("database: obter *sql.DB: %w", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(time.Hour)
	sqlDB.SetConnMaxIdleTime(10 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("database: ping: %w", err)
	}

	return db, nil
}
