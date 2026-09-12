// Comando de uso único que copia os documentos já registrados em
// `cliente_documentos` do disco para o storage de objetos (MinIO/S3).
//
// A chave no bucket é a mesma string que já está na coluna `caminho`, então
// nenhum registro precisa ser reescrito — depois de rodar, basta subir a API
// com STORAGE_DRIVER=s3 e tudo continua sendo encontrado.
//
// É idempotente: objeto que já existe no destino com o mesmo tamanho é pulado.
// Rode com -n primeiro para ver o que aconteceria.
//
//	cd backend-go && go run ./cmd/migrar-storage -n
//	cd backend-go && STORAGE_DRIVER=s3 go run ./cmd/migrar-storage
package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"crmimob/internal/blob"
	"crmimob/internal/config"
	"crmimob/internal/database"
	"crmimob/internal/models"
	"crmimob/internal/modules/clientes"
)

func main() {
	simular := flag.Bool("n", false, "apenas mostra o que seria feito")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		fatal("configuração: %v", err)
	}
	db, err := database.Connect(cfg)
	if err != nil {
		fatal("banco: %v", err)
	}

	ctx := context.Background()
	origem := blob.NovoLocal(clientes.UploadsRoot())

	// O destino é lido do ambiente: sem STORAGE_DRIVER=s3 os dois lados seriam
	// o mesmo disco e a migração não faria nada.
	if os.Getenv("STORAGE_DRIVER") != "s3" && !*simular {
		fatal("defina STORAGE_DRIVER=s3 (e as variáveis S3_*) para migrar; use -n para simular")
	}
	destino, err := blob.DoAmbiente(ctx, clientes.UploadsRoot(), nil)
	if err != nil {
		fatal("storage de destino: %v", err)
	}
	fmt.Printf("origem : %s\ndestino: %s\n\n", origem.Descricao(), destino.Descricao())

	var docs []models.ClienteDocumento
	if err := db.WithContext(ctx).Order("id ASC").Find(&docs).Error; err != nil {
		fatal("listar documentos: %v", err)
	}

	var enviados, pulados, falhos int
	var bytes int64
	for _, doc := range docs {
		info, err := origem.Info(ctx, doc.Caminho)
		if err != nil {
			fmt.Printf("  ! sem arquivo no disco: %s\n", doc.Caminho)
			falhos++
			continue
		}

		if jaLa, err := destino.Info(ctx, doc.Caminho); err == nil && jaLa.Tamanho == info.Tamanho {
			pulados++
			continue
		}

		if *simular {
			fmt.Printf("  · %s (%s)\n", doc.Caminho, mb(info.Tamanho))
			bytes += info.Tamanho
			continue
		}

		dados, err := origem.Ler(ctx, doc.Caminho)
		if err != nil {
			fmt.Printf("  ! ler %s: %v\n", doc.Caminho, err)
			falhos++
			continue
		}
		if err := destino.Gravar(ctx, doc.Caminho, dados, doc.Mime); err != nil {
			fmt.Printf("  ! gravar %s: %v\n", doc.Caminho, err)
			falhos++
			continue
		}
		enviados++
		bytes += int64(len(dados))
		fmt.Printf("  ✓ %s (%s)\n", doc.Caminho, mb(info.Tamanho))
	}

	// Os PDFs consolidados NÃO são copiados de propósito: são cache derivado e
	// se remontam sozinhos no primeiro acesso, já no destino novo. Copiá-los
	// levaria junto qualquer cache velho que estivesse no disco.
	fmt.Printf("\nregistros %d · enviados %d · pulados %d · falhos %d · %s transferidos\n",
		len(docs), enviados, pulados, falhos, mb(bytes))
	if falhos > 0 {
		os.Exit(1)
	}
}

func mb(b int64) string {
	if b < 1024*1024 {
		return fmt.Sprintf("%.0f KB", float64(b)/1024)
	}
	return fmt.Sprintf("%.2f MB", float64(b)/(1024*1024))
}

func fatal(formato string, args ...any) {
	fmt.Fprintf(os.Stderr, "erro: "+formato+"\n", args...)
	os.Exit(1)
}
