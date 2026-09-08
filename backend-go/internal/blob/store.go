// Package blob guarda os arquivos enviados, atrás de uma interface única.
//
// Existem duas implementações: disco local (desenvolvimento, sem depender de
// nada rodando ao lado) e S3/MinIO (produção). O resto do sistema fala só com
// a interface, então trocar de um para o outro é variável de ambiente, não
// alteração de código.
//
// O identificador de um arquivo é a mesma coisa nos dois casos — um caminho
// relativo com barras normais, como `clientes/05030988335/documentos_pessoais/
// 001_rg.jpg`. No disco vira caminho dentro da raiz de uploads; no S3 vira a
// chave do objeto. É por isso que a coluna `caminho` do banco continua valendo
// depois da migração, sem precisar reescrever registro.
package blob

import (
	"context"
	"errors"
	"io"
)

// ErrNaoEncontrado é devolvido quando a chave não existe. Quem chama traduz
// para 404 — os dois backends normalizam seus erros nativos para este.
var ErrNaoEncontrado = errors.New("blob: arquivo não encontrado")

// Info é o que se sabe sobre um objeto sem baixá-lo.
type Info struct {
	Chave    string
	Tamanho  int64
	Mime     string
	Alterado int64 // unix nano; usado para decidir se um cache derivado venceu
}

// Store é o contrato de armazenamento de arquivos.
//
// Nenhum método devolve caminho de sistema de arquivos: com S3 esse caminho não
// existe, e um método que só funcionasse no backend local acabaria usado sem
// querer e quebraria na VPS.
type Store interface {
	// Gravar escreve (ou sobrescreve) uma chave.
	Gravar(ctx context.Context, chave string, dados []byte, mime string) error

	// Ler devolve o conteúdo inteiro. Adequado a documento de cliente, que é
	// medido em centenas de KB depois da otimização.
	Ler(ctx context.Context, chave string) ([]byte, error)

	// Abrir devolve um leitor por streaming, para não carregar o arquivo todo em
	// memória quando ele só precisa ser repassado à resposta HTTP.
	Abrir(ctx context.Context, chave string) (io.ReadCloser, *Info, error)

	// Info consulta os metadados sem transferir o conteúdo.
	Info(ctx context.Context, chave string) (*Info, error)

	// Remover apaga a chave. Apagar o que não existe não é erro — o efeito
	// desejado (a chave não está mais lá) já vale.
	Remover(ctx context.Context, chave string) error

	// Existe é o teste barato usado para decidir se um derivado precisa ser
	// remontado.
	Existe(ctx context.Context, chave string) (bool, error)

	// Descricao identifica o backend em log e diagnóstico.
	Descricao() string
}
