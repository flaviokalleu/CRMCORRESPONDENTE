package blob

import (
	"context"
	"errors"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"
)

// Local guarda os arquivos no sistema de arquivos, sob uma raiz.
//
// É o backend de desenvolvimento: não exige nada rodando ao lado e deixa
// inspecionar os arquivos com o explorador. Em produção o backend é o S3.
type Local struct{ raiz string }

func NovoLocal(raiz string) *Local { return &Local{raiz: raiz} }

func (l *Local) Descricao() string { return "disco local em " + l.raiz }

// caminho resolve a chave em caminho absoluto, recusando qualquer resultado
// fora da raiz. A chave chega do banco e da URL, então tratá-la como confiável
// abriria leitura de arquivo arbitrário do servidor.
func (l *Local) caminho(chave string) (string, error) {
	if chave == "" || strings.Contains(chave, "\x00") {
		return "", ErrNaoEncontrado
	}
	raiz, err := filepath.Abs(l.raiz)
	if err != nil {
		return "", err
	}
	abs, err := filepath.Abs(filepath.Join(raiz, filepath.FromSlash(chave)))
	if err != nil {
		return "", err
	}
	// O separador final impede que "/uploads-antigo" passe por começar igual a
	// "/uploads".
	if abs != raiz && !strings.HasPrefix(abs, raiz+string(os.PathSeparator)) {
		return "", ErrNaoEncontrado
	}
	return abs, nil
}

func (l *Local) Gravar(_ context.Context, chave string, dados []byte, _ string) error {
	abs, err := l.caminho(chave)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		return err
	}
	return os.WriteFile(abs, dados, 0o644)
}

func (l *Local) Ler(_ context.Context, chave string) ([]byte, error) {
	abs, err := l.caminho(chave)
	if err != nil {
		return nil, err
	}
	dados, err := os.ReadFile(abs)
	if errors.Is(err, os.ErrNotExist) {
		return nil, ErrNaoEncontrado
	}
	return dados, err
}

func (l *Local) Abrir(_ context.Context, chave string) (io.ReadCloser, *Info, error) {
	abs, err := l.caminho(chave)
	if err != nil {
		return nil, nil, err
	}
	st, err := os.Stat(abs)
	if errors.Is(err, os.ErrNotExist) {
		return nil, nil, ErrNaoEncontrado
	}
	if err != nil {
		return nil, nil, err
	}
	f, err := os.Open(abs)
	if err != nil {
		return nil, nil, err
	}
	return f, &Info{
		Chave: chave, Tamanho: st.Size(),
		Mime:     mimeDaExtensao(abs),
		Alterado: st.ModTime().UnixNano(),
	}, nil
}

func (l *Local) Info(_ context.Context, chave string) (*Info, error) {
	abs, err := l.caminho(chave)
	if err != nil {
		return nil, err
	}
	st, err := os.Stat(abs)
	if errors.Is(err, os.ErrNotExist) {
		return nil, ErrNaoEncontrado
	}
	if err != nil {
		return nil, err
	}
	return &Info{
		Chave: chave, Tamanho: st.Size(),
		Mime:     mimeDaExtensao(abs),
		Alterado: st.ModTime().UnixNano(),
	}, nil
}

func (l *Local) Remover(_ context.Context, chave string) error {
	abs, err := l.caminho(chave)
	if err != nil {
		return err
	}
	if err := os.Remove(abs); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	// Diretório vazio depois da remoção não serve para nada; no S3 nem existe
	// diretório, então limpar aqui mantém os dois backends parecidos.
	dir := filepath.Dir(abs)
	if entradas, err := os.ReadDir(dir); err == nil && len(entradas) == 0 {
		_ = os.Remove(dir)
	}
	return nil
}

func (l *Local) Existe(_ context.Context, chave string) (bool, error) {
	abs, err := l.caminho(chave)
	if err != nil {
		return false, err
	}
	_, err = os.Stat(abs)
	if errors.Is(err, os.ErrNotExist) {
		return false, nil
	}
	return err == nil, err
}

func mimeDaExtensao(caminho string) string {
	if t := mime.TypeByExtension(filepath.Ext(caminho)); t != "" {
		return t
	}
	return "application/octet-stream"
}
