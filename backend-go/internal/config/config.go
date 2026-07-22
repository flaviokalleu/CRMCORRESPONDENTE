package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// Config guarda toda a configuração derivada do ambiente.
// Secrets obrigatórios fazem o boot falhar (nunca há fallback hardcoded — ver 01-spec §7.6).
type Config struct {
	Env          string
	Port         string
	DB           DBConfig
	JWTSecret    string
	JWTRefresh   string
	FrontendURLs []string
}

type DBConfig struct {
	Host     string
	Port     string
	Name     string
	User     string
	Password string
	SSLMode  string
	TimeZone string
}

// Load lê o .env (se existir) + variáveis de ambiente e valida o obrigatório.
func Load() (*Config, error) {
	// .env é opcional em produção (variáveis podem vir do ambiente/container).
	_ = godotenv.Load()

	cfg := &Config{
		Env:  getEnv("NODE_ENV", "development"),
		Port: getEnv("PORT", "8000"),
		DB: DBConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			Name:     getEnv("DB_NAME", "crmjs"),
			User:     getEnv("DB_USERNAME", "postgres"),
			Password: getEnv("DB_PASSWORD", ""),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
			TimeZone: getEnv("DB_TIMEZONE", "America/Sao_Paulo"),
		},
		// Unificado: aceita os aliases legados, mas expõe um único par canônico.
		JWTSecret:  firstNonEmpty(os.Getenv("JWT_SECRET_KEY"), os.Getenv("ACCESS_TOKEN_SECRET"), os.Getenv("SECRET_KEY")),
		JWTRefresh: firstNonEmpty(os.Getenv("JWT_REFRESH_SECRET_KEY"), os.Getenv("REFRESH_TOKEN_SECRET")),
	}

	if raw := os.Getenv("FRONTEND_URL"); raw != "" {
		for _, u := range strings.Split(raw, ",") {
			if u = strings.TrimSpace(u); u != "" {
				cfg.FrontendURLs = append(cfg.FrontendURLs, u)
			}
		}
	} else {
		cfg.FrontendURLs = []string{"http://localhost:3000", "http://localhost:3003"}
	}

	// Fail-fast: sem secret não sobe (diferente do Node, que tinha fallback perigoso).
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("config: JWT_SECRET_KEY é obrigatória")
	}
	if cfg.JWTRefresh == "" {
		// Fallback consciente: se não houver secret de refresh, deriva do de acesso com sufixo.
		cfg.JWTRefresh = cfg.JWTSecret + "_refresh"
	}

	return cfg, nil
}

// DSN monta a string de conexão do Postgres (driver pgx via GORM).
func (d DBConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=%s",
		d.Host, d.Port, d.User, d.Password, d.Name, d.SSLMode, d.TimeZone,
	)
}

func (c *Config) IsProduction() bool { return c.Env == "production" }

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}
