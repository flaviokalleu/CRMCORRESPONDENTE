// Comando de uso único que traz os arquivos enviados antes da tabela
// cliente_documentos existir para o novo formato: registra cada um como linha,
// aplica a otimização e renomeia para o padrão `NNN_nome.ext`.
//
// É idempotente — arquivo já registrado é pulado —, então pode rodar de novo
// sem duplicar nada. Rode uma vez após aplicar a migration 0009:
//
//	cd backend-go && go run ./cmd/migrar-documentos
//
// Use -n para ver o que aconteceria sem escrever nada.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"crmimob/internal/config"
	"crmimob/internal/database"
	"crmimob/internal/integrations/media"
	"crmimob/internal/models"
	"crmimob/internal/uploads"
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
	raiz := filepath.Join(uploads.Root(), "clientes")

	// tipo por nome de coluna: o disco guarda o nome da COLUNA no caminho
	// (documentos_pessoais), enquanto a tabela guarda a CHAVE do tipo
	// (documentosPessoais).
	tipoPorColuna := map[string]string{}
	for tipo, coluna := range models.DocumentTypeMap {
		tipoPorColuna[coluna] = tipo
	}

	var achados, migrados, pulados int
	var antes, depois int64

	err = filepath.Walk(raiz, func(caminho string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		nome := info.Name()
		// Os PDFs consolidados são derivados; não viram registro.
		if strings.HasPrefix(nome, "_") {
			return nil
		}
		rel, err := uploads.Relativo(caminho)
		if err != nil {
			return nil
		}
		// clientes/<cpf>/<coluna>/<arquivo>
		partes := strings.Split(filepath.ToSlash(rel), "/")
		if len(partes) < 4 {
			return nil
		}
		cpf, coluna := partes[1], partes[2]
		tipo, ok := tipoPorColuna[coluna]
		if !ok {
			return nil
		}
		achados++

		var cliente models.Cliente
		if err := db.WithContext(ctx).Where("cpf = ?", cpf).First(&cliente).Error; err != nil {
			fmt.Printf("  ! sem cliente para o CPF %s (%s)\n", cpf, rel)
			pulados++
			return nil
		}

		var jaExiste int64
		db.WithContext(ctx).Model(&models.ClienteDocumento{}).
			Where("cliente_id = ? AND tipo = ?", cliente.ID, tipo).
			Where("nome_original = ?", nome).
			Count(&jaExiste)
		if jaExiste > 0 {
			pulados++
			return nil
		}

		tamanhoAntes := info.Size()
		antes += tamanhoAntes

		if *simular {
			fmt.Printf("  · %s → cliente %d, tipo %s (%d bytes)\n", rel, cliente.ID, tipo, tamanhoAntes)
			return nil
		}

		res, err := media.OtimizarArquivo(caminho, media.PerfilDocumento)
		if err != nil {
			fmt.Printf("  ! não deu para otimizar %s: %v\n", rel, err)
			pulados++
			return nil
		}

		// A otimização pode trocar a extensão (png → jpg); o arquivo é renomeado
		// para o padrão novo e o registro aponta para o nome final.
		destino := filepath.Join(filepath.Dir(caminho),
			fmt.Sprintf("001_%s%s", strings.TrimSuffix(nome, filepath.Ext(nome)), res.Extensao))
		if destino != caminho {
			if err := os.Rename(caminho, destino); err != nil {
				fmt.Printf("  ! renomear %s: %v\n", rel, err)
				pulados++
				return nil
			}
		}
		relFinal, err := uploads.Relativo(destino)
		if err != nil {
			pulados++
			return nil
		}

		doc := models.ClienteDocumento{
			ClienteID: cliente.ID, TenantID: cliente.TenantID,
			Tipo: tipo, Ordem: 0,
			NomeOriginal: nome, Caminho: relFinal, Mime: res.Mime,
			Bytes: int64(len(res.Bytes)), BytesOrigem: tamanhoAntes,
			Paginas: res.Paginas,
		}
		if err := db.WithContext(ctx).Create(&doc).Error; err != nil {
			fmt.Printf("  ! registrar %s: %v\n", relFinal, err)
			pulados++
			return nil
		}

		// A coluna antiga passa a apontar para o consolidado, que será montado
		// na primeira visualização.
		consolidado := filepath.ToSlash(filepath.Join("clientes", cpf, coluna, "_consolidado.pdf"))
		db.WithContext(ctx).Model(&models.Cliente{}).
			Where("id = ?", cliente.ID).UpdateColumn(coluna, &consolidado)

		depois += doc.Bytes
		migrados++
		fmt.Printf("  ✓ %s → %s  (%s → %s, -%.1f%%)\n",
			rel, relFinal, mb(tamanhoAntes), mb(doc.Bytes), res.Economia())
		return nil
	})
	if err != nil {
		fatal("varredura: %v", err)
	}

	fmt.Printf("\nencontrados %d · migrados %d · pulados %d\n", achados, migrados, pulados)
	if depois > 0 {
		fmt.Printf("espaço: %s → %s (-%.1f%%)\n", mb(antes), mb(depois),
			(1-float64(depois)/float64(antes))*100)
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
