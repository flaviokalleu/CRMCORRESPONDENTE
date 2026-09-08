package blob

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// S3 guarda os arquivos num bucket compatível com S3 — MinIO na VPS, mas o
// mesmo código serve para Amazon S3, Backblaze B2 ou qualquer outro que fale o
// protocolo.
//
// Os objetos não são públicos e o bucket não precisa estar acessível pela
// internet: quem entrega o arquivo ao navegador é a API, depois de checar
// sessão e tenant. Por isso não há URL pré-assinada aqui — um link que
// funcionasse fora da sessão contornaria essa checagem.
type S3 struct {
	cli    *minio.Client
	bucket string
	desc   string
}

// ConfigS3 são os parâmetros de conexão, lidos do ambiente.
type ConfigS3 struct {
	Endpoint  string // "minio:9000" dentro do Docker, "s3.exemplo.com" fora
	AccessKey string
	SecretKey string
	Bucket    string
	Regiao    string
	UsarTLS   bool
}

// NovoS3 conecta e garante que o bucket existe.
//
// Criar o bucket aqui, e não só no script de inicialização, é o que faz um
// ambiente novo subir sozinho: sem isso, a primeira gravação falharia com
// NoSuchBucket e o erro apareceria como "erro ao salvar documento", longe da
// causa real.
func NovoS3(ctx context.Context, cfg ConfigS3) (*S3, error) {
	if cfg.Endpoint == "" || cfg.Bucket == "" {
		return nil, errors.New("blob: endpoint e bucket do S3 são obrigatórios")
	}
	cli, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UsarTLS,
		Region: cfg.Regiao,
	})
	if err != nil {
		return nil, fmt.Errorf("blob: conectar ao S3: %w", err)
	}

	ctxBucket, cancelar := context.WithTimeout(ctx, 15*time.Second)
	defer cancelar()

	existe, err := cli.BucketExists(ctxBucket, cfg.Bucket)
	if err != nil {
		return nil, fmt.Errorf("blob: consultar bucket %q: %w", cfg.Bucket, err)
	}
	if !existe {
		if err := cli.MakeBucket(ctxBucket, cfg.Bucket, minio.MakeBucketOptions{Region: cfg.Regiao}); err != nil {
			return nil, fmt.Errorf("blob: criar bucket %q: %w", cfg.Bucket, err)
		}
	}

	esquema := "http"
	if cfg.UsarTLS {
		esquema = "https"
	}
	return &S3{
		cli: cli, bucket: cfg.Bucket,
		desc: fmt.Sprintf("S3 %s://%s/%s", esquema, cfg.Endpoint, cfg.Bucket),
	}, nil
}

func (s *S3) Descricao() string { return s.desc }

func (s *S3) Gravar(ctx context.Context, chave string, dados []byte, mimeTipo string) error {
	if mimeTipo == "" {
		mimeTipo = "application/octet-stream"
	}
	_, err := s.cli.PutObject(ctx, s.bucket, chave,
		bytes.NewReader(dados), int64(len(dados)),
		minio.PutObjectOptions{ContentType: mimeTipo})
	return err
}

func (s *S3) Ler(ctx context.Context, chave string) ([]byte, error) {
	obj, err := s.cli.GetObject(ctx, s.bucket, chave, minio.GetObjectOptions{})
	if err != nil {
		return nil, traduzirErro(err)
	}
	defer obj.Close()
	dados, err := io.ReadAll(obj)
	if err != nil {
		return nil, traduzirErro(err)
	}
	return dados, nil
}

func (s *S3) Abrir(ctx context.Context, chave string) (io.ReadCloser, *Info, error) {
	// A consulta de metadados vem antes porque GetObject não fala com o
	// servidor: ele só erra na primeira leitura, e aí a resposta HTTP já teria
	// começado a ser escrita com o status errado.
	info, err := s.Info(ctx, chave)
	if err != nil {
		return nil, nil, err
	}
	obj, err := s.cli.GetObject(ctx, s.bucket, chave, minio.GetObjectOptions{})
	if err != nil {
		return nil, nil, traduzirErro(err)
	}
	return obj, info, nil
}

func (s *S3) Info(ctx context.Context, chave string) (*Info, error) {
	st, err := s.cli.StatObject(ctx, s.bucket, chave, minio.StatObjectOptions{})
	if err != nil {
		return nil, traduzirErro(err)
	}
	return &Info{
		Chave: chave, Tamanho: st.Size, Mime: st.ContentType,
		Alterado: st.LastModified.UnixNano(),
	}, nil
}

func (s *S3) Remover(ctx context.Context, chave string) error {
	err := s.cli.RemoveObject(ctx, s.bucket, chave, minio.RemoveObjectOptions{})
	if errors.Is(traduzirErro(err), ErrNaoEncontrado) {
		return nil // já não está lá — o efeito desejado vale
	}
	return err
}

func (s *S3) Existe(ctx context.Context, chave string) (bool, error) {
	_, err := s.Info(ctx, chave)
	if errors.Is(err, ErrNaoEncontrado) {
		return false, nil
	}
	return err == nil, err
}

// traduzirErro normaliza "objeto/bucket inexistente" para ErrNaoEncontrado, de
// modo que quem chama trate os dois backends do mesmo jeito.
func traduzirErro(err error) error {
	if err == nil {
		return nil
	}
	resp := minio.ToErrorResponse(err)
	if resp.StatusCode == http.StatusNotFound ||
		resp.Code == "NoSuchKey" || resp.Code == "NoSuchBucket" {
		return ErrNaoEncontrado
	}
	return err
}
