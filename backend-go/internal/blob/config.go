package blob

import (
	"context"
	"log/slog"
	"os"
	"strings"
)

// DoAmbiente escolhe o backend pela variável STORAGE_DRIVER:
//
//	s3     → MinIO ou qualquer S3 (produção)
//	local  → disco, sob UPLOADS_DIR (padrão)
//
// O padrão é local de propósito: quem clona o repositório e roda `go run`
// precisa de um sistema que funcione sem subir MinIO antes. Em produção o
// docker-compose define STORAGE_DRIVER=s3.
func DoAmbiente(ctx context.Context, raizLocal string, log *slog.Logger) (Store, error) {
	driver := strings.ToLower(strings.TrimSpace(os.Getenv("STORAGE_DRIVER")))
	if driver != "s3" {
		st := NovoLocal(raizLocal)
		if log != nil {
			log.Info("storage de arquivos", "driver", "local", "destino", st.Descricao())
		}
		return st, nil
	}

	cfg := ConfigS3{
		Endpoint:  os.Getenv("S3_ENDPOINT"),
		AccessKey: os.Getenv("S3_ACCESS_KEY"),
		SecretKey: os.Getenv("S3_SECRET_KEY"),
		Bucket:    valorOu(os.Getenv("S3_BUCKET"), "crm-uploads"),
		Regiao:    valorOu(os.Getenv("S3_REGION"), "us-east-1"),
		UsarTLS:   strings.EqualFold(os.Getenv("S3_USE_SSL"), "true"),
	}
	st, err := NovoS3(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if log != nil {
		log.Info("storage de arquivos", "driver", "s3", "destino", st.Descricao())
	}
	return st, nil
}

func valorOu(v, padrao string) string {
	if strings.TrimSpace(v) == "" {
		return padrao
	}
	return v
}
