// Package uploads centraliza a raiz dos arquivos enviados e as checagens de
// caminho que todo módulo que grava arquivo precisa fazer.
//
// A raiz estava duplicada em dois lugares (clientes e imoveis), cada um com sua
// própria cópia do caminho literal — mudar a pasta exigia lembrar dos dois, e um
// deles ficaria para trás. Aqui é declarada uma vez.
package uploads

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
)

// ErrForaDaRaiz é devolvido quando um caminho resolvido escapa de Root() —
// tentativa de path traversal, ou um valor corrompido vindo do banco.
var ErrForaDaRaiz = errors.New("uploads: caminho fora da raiz de uploads")

// Root é a raiz dos arquivos enviados.
//
// Ficava em `backend/uploads` por herança do backend Node, que já não existe —
// aquela pasta continha apenas os uploads, nenhum código. Os arquivos moram
// agora em `<repo>/uploads`, irmãos de backend-go e frontend-next: são dado de
// aplicação, não fonte de um dos serviços.
//
// O padrão é relativo ao diretório de trabalho do processo, que em
// desenvolvimento é backend-go (`go run ./cmd/api`). Em produção defina
// UPLOADS_DIR com caminho absoluto — o CWD lá não é garantido.
func Root() string {
	if v := os.Getenv("UPLOADS_DIR"); v != "" {
		return v
	}
	return filepath.Join("..", "uploads")
}

// Resolve transforma um caminho relativo à raiz no caminho absoluto no disco,
// recusando qualquer resultado que caia fora dela. Use sempre isto antes de
// abrir, servir ou apagar um arquivo cujo caminho veio do banco ou da URL.
func Resolve(relativo string) (string, error) {
	if relativo == "" {
		return "", ErrForaDaRaiz
	}
	raiz, err := filepath.Abs(Root())
	if err != nil {
		return "", err
	}
	abs, err := filepath.Abs(filepath.Join(raiz, relativo))
	if err != nil {
		return "", err
	}
	// O separador final evita que "/uploads-antigo" passe por estar dentro de
	// "/uploads" só porque a string começa igual.
	if abs != raiz && !strings.HasPrefix(abs, raiz+string(os.PathSeparator)) {
		return "", ErrForaDaRaiz
	}
	return abs, nil
}

// Relativo faz o caminho inverso: absoluto no disco → caminho guardado no
// banco, sempre com barras normais para não vazar separador do Windows.
func Relativo(absoluto string) (string, error) {
	raiz, err := filepath.Abs(Root())
	if err != nil {
		return "", err
	}
	abs, err := filepath.Abs(absoluto)
	if err != nil {
		return "", err
	}
	rel, err := filepath.Rel(raiz, abs)
	if err != nil {
		return "", err
	}
	if strings.HasPrefix(rel, "..") {
		return "", ErrForaDaRaiz
	}
	return filepath.ToSlash(rel), nil
}
