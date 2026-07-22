package clientes

import (
	"errors"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"crmimob/internal/models"
)

var (
	ErrCaminhoInvalido = errors.New("clientes: caminho de documento fora do padrão de segurança")
	ErrArquivoAusente  = errors.New("clientes: nenhum arquivo enviado")
)

// UploadsRoot resolve a raiz de uploads compartilhada com o backend Node —
// MESMA pasta usada hoje (backend/uploads), para não duplicar arquivos entre
// as duas implementações durante a migração (strangler-fig). Pode ser
// sobrescrita via env UPLOADS_DIR; por padrão assume backend-go/../backend/uploads
// (backend-go e backend são pastas irmãs).
func UploadsRoot() string {
	if v := os.Getenv("UPLOADS_DIR"); v != "" {
		return v
	}
	return filepath.Join("..", "backend", "uploads")
}

// clienteDocDir devolve o diretório uploads/clientes/<cpf>/<dbField>/.
func clienteDocDir(cpf, dbField string) string {
	return filepath.Join(UploadsRoot(), "clientes", cpf, dbField)
}

// SaveDocumentFile grava o(s) arquivo(s) recebidos no diretório do cliente.
//
// NOTA DE ESCOPO: o pipeline completo do Node (pdfService.processFiles) faz
// merge incremental de páginas num único documento.pdf (imagem→PDF, PDF
// tolerante, conversão CTPS/RG/CPF via rasterização). Essa parte fica isolada
// em internal/integrations/pdf (stub por enquanto — ver ErrNotImplemented).
// Aqui salvamos o arquivo bruto recebido com um nome estável, para que o
// upload funcione end-to-end já nesta fase; o merge real substitui este
// comportamento quando o pacote pdf for implementado, sem mudar a assinatura.
func SaveDocumentFile(fh *multipart.FileHeader, cpf, dbField string) (relPath string, size int64, err error) {
	if fh == nil {
		return "", 0, ErrArquivoAusente
	}
	dir := clienteDocDir(cpf, dbField)
	if err = os.MkdirAll(dir, 0o755); err != nil {
		return "", 0, err
	}

	ext := filepath.Ext(fh.Filename)
	destName := "documento" + ext
	destPath := filepath.Join(dir, destName)

	src, err := fh.Open()
	if err != nil {
		return "", 0, err
	}
	defer src.Close()

	dst, err := os.Create(destPath)
	if err != nil {
		return "", 0, err
	}
	defer dst.Close()

	written, err := io.Copy(dst, src)
	if err != nil {
		return "", 0, err
	}

	rel, err := filepath.Rel(UploadsRoot(), destPath)
	if err != nil {
		return "", 0, err
	}
	return filepath.ToSlash(rel), written, nil
}

// ValidateDocumentPath replica as 3 checagens de segurança do endpoint
// /verificar e do PUT (§5.3):
//  1. o caminho deve conter o CPF do cliente (sem máscara);
//  2. deve conter o nome do campo (exceto tela_aprovacao, que só precisa conter
//     "tela_aprovacao");
//  3. o diretório resolvido deve estar dentro de uploads/clientes/<cpf>/.
func ValidateDocumentPath(cliente *models.Cliente, campoDocumento, caminhoDocumento string) error {
	if cliente.CPF == nil || *cliente.CPF == "" {
		return ErrCaminhoInvalido
	}
	cpf := *cliente.CPF

	if !strings.Contains(caminhoDocumento, cpf) {
		return ErrCaminhoInvalido
	}

	if campoDocumento == "tela_aprovacao" {
		if !strings.Contains(caminhoDocumento, "tela_aprovacao") {
			return ErrCaminhoInvalido
		}
	} else if !strings.Contains(caminhoDocumento, campoDocumento) {
		return ErrCaminhoInvalido
	}

	fullPath := filepath.Join(UploadsRoot(), caminhoDocumento)
	expectedPrefix := filepath.Join(UploadsRoot(), "clientes", cpf)
	dir := filepath.Dir(fullPath)
	cleanDir, err := filepath.Abs(dir)
	if err != nil {
		return ErrCaminhoInvalido
	}
	cleanExpected, err := filepath.Abs(expectedPrefix)
	if err != nil {
		return ErrCaminhoInvalido
	}
	if !strings.HasPrefix(cleanDir, cleanExpected) {
		return ErrCaminhoInvalido
	}
	return nil
}

// DeleteDocumentFile remove o arquivo físico do documento e o diretório se
// ficar vazio (§2.1 DELETE /documentos/:tipo). caminhoRelativo é relativo a
// UploadsRoot().
func DeleteDocumentFile(caminhoRelativo string) error {
	if caminhoRelativo == "" {
		return nil
	}
	full := filepath.Join(UploadsRoot(), caminhoRelativo)
	// path traversal guard — o resultado deve continuar sob UploadsRoot().
	root, err := filepath.Abs(UploadsRoot())
	if err != nil {
		return err
	}
	abs, err := filepath.Abs(full)
	if err != nil {
		return err
	}
	if !strings.HasPrefix(abs, root) {
		return ErrCaminhoInvalido
	}
	if err := os.Remove(abs); err != nil && !os.IsNotExist(err) {
		return err
	}
	dir := filepath.Dir(abs)
	entries, err := os.ReadDir(dir)
	if err == nil && len(entries) == 0 {
		_ = os.Remove(dir)
	}
	return nil
}

// FieldColumn devolve a coluna DB associada a um ":tipo" de documento
// (documentTypeMap) e ok=false se o tipo não existir.
func FieldColumn(tipo string) (string, bool) {
	col, ok := models.DocumentTypeMap[tipo]
	return col, ok
}
