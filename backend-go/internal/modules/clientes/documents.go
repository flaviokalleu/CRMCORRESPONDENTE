package clientes

import (
	"errors"
	"os"
	"path/filepath"
	"strings"

	"crmimob/internal/models"
	"crmimob/internal/uploads"
)

var (
	ErrCaminhoInvalido = errors.New("clientes: caminho de documento fora do padrão de segurança")
	ErrArquivoAusente  = errors.New("clientes: nenhum arquivo enviado")
	// ErrTipoDocumentoInvalido cobre um ":tipo" que não está em
	// models.DocumentTypeMap — chega pela URL, então é entrada do usuário.
	ErrTipoDocumentoInvalido = errors.New("clientes: tipo de documento inválido")
)

// UploadsRoot é a raiz dos arquivos enviados. A definição vive em
// internal/uploads, compartilhada com os outros módulos que gravam arquivo;
// esta função continua existindo porque o router monta as rotas estáticas a
// partir dela.
func UploadsRoot() string { return uploads.Root() }

// clienteDocDir devolve o diretório uploads/clientes/<cpf>/<dbField>/.
func clienteDocDir(cpf, dbField string) string {
	return filepath.Join(UploadsRoot(), "clientes", cpf, dbField)
}

// ValidateDocumentPath confere que um caminho de documento pertence mesmo a
// este cliente:
//  1. o caminho deve conter o CPF do cliente (sem máscara);
//  2. deve conter o nome do campo;
//  3. o diretório resolvido deve estar dentro de uploads/clientes/<cpf>/.
//
// `campoDocumento` é o nome da COLUNA (documentos_pessoais), que é o que compõe
// o caminho no disco — não a chave da rota (documentosPessoais). Passar a chave
// aqui faz a checagem 2 falhar sempre, e o endpoint responder 403 para um
// documento perfeitamente válido.
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
