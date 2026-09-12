package media

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

// ErrSemArquivos é devolvido quando se pede um PDF consolidado de uma lista
// vazia — não é falha de processamento, é ausência de conteúdo.
var ErrSemArquivos = errors.New("media: nenhum arquivo para consolidar")

// ConstruirPDF monta um único PDF a partir de arquivos no disco, na ordem
// recebida. Imagens viram uma página A4 cada; PDFs entram com todas as suas
// páginas.
//
// O caminho é sempre por arquivo temporário, nunca em memória: um dossiê de
// cliente com trinta páginas digitalizadas passa fácil de 100 MB descomprimido,
// e o pdfcpu trabalha com io.ReadSeeker sobre arquivo sem carregar tudo.
//
// Um arquivo ilegível não derruba o dossiê inteiro: ele é pulado e reportado em
// `ignorados`, para quem chamou poder avisar sem perder as outras páginas.
func ConstruirPDF(caminhos []string, destino string) (paginas int, ignorados []string, err error) {
	if len(caminhos) == 0 {
		return 0, nil, ErrSemArquivos
	}

	tmp, err := os.MkdirTemp("", "consolidado-*")
	if err != nil {
		return 0, nil, err
	}
	defer os.RemoveAll(tmp)

	conf := model.NewDefaultConfiguration()
	conf.ValidationMode = model.ValidationRelaxed

	// Cada entrada da lista vira um PDF isolado primeiro; a junção acontece uma
	// única vez no fim. Mesclar de forma incremental relê e reescreve o
	// acumulado a cada arquivo, o que fica quadrático no número de páginas.
	var partes []string
	for i, caminho := range caminhos {
		dados, lerErr := os.ReadFile(caminho)
		if lerErr != nil {
			ignorados = append(ignorados, filepath.Base(caminho))
			continue
		}

		parte := filepath.Join(tmp, fmt.Sprintf("%04d.pdf", i))
		if ehPDF(dados) {
			if escreverErr := os.WriteFile(parte, dados, 0o600); escreverErr != nil {
				ignorados = append(ignorados, filepath.Base(caminho))
				continue
			}
		} else {
			imp := pdfcpu.DefaultImportConfig() // A4, imagem ocupando a página
			if impErr := api.ImportImagesFile([]string{caminho}, parte, imp, conf); impErr != nil {
				ignorados = append(ignorados, filepath.Base(caminho))
				continue
			}
		}
		partes = append(partes, parte)
	}

	if len(partes) == 0 {
		return 0, ignorados, ErrSemArquivos
	}

	if err := os.MkdirAll(filepath.Dir(destino), 0o755); err != nil {
		return 0, ignorados, err
	}

	if len(partes) == 1 {
		dados, lerErr := os.ReadFile(partes[0])
		if lerErr != nil {
			return 0, ignorados, lerErr
		}
		if escreverErr := os.WriteFile(destino, dados, 0o644); escreverErr != nil {
			return 0, ignorados, escreverErr
		}
	} else if err := api.MergeCreateFile(partes, destino, false, conf); err != nil {
		return 0, ignorados, err
	}

	n, contarErr := api.PageCountFile(destino)
	if contarErr != nil {
		// O arquivo existe e abre; só não conseguimos contar as páginas.
		return 0, ignorados, nil
	}
	return n, ignorados, nil
}

// ContarPaginasArquivo devolve o número de páginas de um PDF no disco.
func ContarPaginasArquivo(caminho string) (int, error) {
	return api.PageCountFile(caminho)
}

// ContarPaginas faz o mesmo a partir dos bytes — é o que serve quando o PDF
// vem do storage de objetos e nunca chega a existir como arquivo.
func ContarPaginas(dados []byte) (int, error) {
	conf := model.NewDefaultConfiguration()
	conf.ValidationMode = model.ValidationRelaxed
	ctx, err := api.ReadValidateAndOptimize(bytes.NewReader(dados), conf)
	if err != nil {
		return 0, err
	}
	return ctx.PageCount, nil
}

// ExtrairPagina devolve uma página (1-based) de um PDF como um novo PDF de uma
// página só, pronto para responder por HTTP.
func ExtrairPagina(dados []byte, pagina int) ([]byte, error) {
	if pagina < 1 {
		return nil, fmt.Errorf("media: página %d inválida", pagina)
	}
	conf := model.NewDefaultConfiguration()
	conf.ValidationMode = model.ValidationRelaxed

	var buf bytes.Buffer
	if err := api.Trim(bytes.NewReader(dados), &buf, []string{fmt.Sprint(pagina)}, conf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
