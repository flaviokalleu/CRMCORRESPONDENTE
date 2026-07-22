// Package pdf isola a dependência de manipulação/merge/rasterização de PDF
// (equivalente ao pdfService.js Node, ~44KB). A implementação real fica para
// uma fase seguinte — ver docs/migration/02-clientes-imoveis-uploads.md §5.5.
//
// Decisão de arquitetura já tomada (não revisitar aqui): usar libs nativas Go
//   - merge/split/contagem de páginas: github.com/pdfcpu/pdfcpu
//   - resize/conversão de imagem: github.com/h2non/bimg (libvips) ou
//     github.com/disintegration/imaging
//   - rasterização PDF→imagem (para achatar CTPS/RG/CPF problemáticos):
//     github.com/gen2brain/go-fitz (bindings MuPDF)
//
// Este arquivo define SOMENTE a interface + um client stub que devolve
// ErrNotImplemented — nenhuma dessas libs foi adicionada ao go.mod ainda.
package pdf

import "errors"

// ErrNotImplemented é devolvido por todos os métodos do stub. Handlers que
// dependem deste serviço devem tratar este erro como "funcionalidade PDF
// ainda não disponível nesta fase da migração" (ex.: 501/503), não como bug.
var ErrNotImplemented = errors.New("pdf: funcionalidade ainda não implementada nesta fase da migração")

// PageInfo é o retorno de PageCount/Info — espelha o shape usado pelo endpoint
// GET /clientes/:id/documentos/:tipo/info do Node (pdf-lib getPageCount()).
type PageInfo struct {
	TotalPages   int
	FileSizeByte int64
	LastModified string
	FileName     string
}

// Service é a interface que os módulos de negócio (clientes, imoveis) devem
// depender — nunca da implementação concreta, para permitir mock em testes e
// trocar a lib nativa sem tocar os handlers.
type Service interface {
	// ProcessFiles mescla os arquivos recebidos (imagens convertidas em página
	// PDF, PDFs copiados/achatados) no documento acumulado do cliente, seguindo
	// a mesma estratégia de merge incremental do Node (§5.5): destino fixo
	// uploads/clientes/<cpf>/<dbField>/documento.pdf, anexando páginas se o
	// arquivo já existir. Devolve o caminho relativo salvo.
	ProcessFiles(cpf, dbField string, files [][]byte, fileNames []string) (relativePath string, err error)

	// MergeDocument é um atalho de conveniência usado pelos módulos que só têm
	// o ID do cliente (não o CPF) em mãos — resolve internamente. Assinatura
	// pedida explicitamente no escopo desta tarefa.
	MergeDocument(clienteID uint, tipo string, novoArquivo []byte) (path string, err error)

	// ExtractPage extrai 1 página (1-based) do PDF em filePath como um novo PDF
	// de página única, devolvendo os bytes prontos para resposta HTTP.
	ExtractPage(filePath string, pageNumber int) (buf []byte, err error)

	// PageCount devolve metadados (nº de páginas, tamanho, mtime) do PDF.
	PageCount(filePath string) (*PageInfo, error)

	// SanitizeFileName replica o sanitize.js do Node: remove ()[]{} e espaços,
	// colapsa "_", fallback "documento" se vazio.
	SanitizeFileName(name string) string
}

// stubClient é o placeholder documentado — nenhum método funciona de verdade
// ainda; todos devolvem ErrNotImplemented (exceto SanitizeFileName, que é pura
// string manipulation e não depende de lib nativa nenhuma).
type stubClient struct{}

// NewClient devolve a implementação-placeholder de Service. Trocar por um
// client real (pdfcpu/bimg/go-fitz) quando a fase de PDF for implementada.
func NewClient() Service { return &stubClient{} }

func (s *stubClient) ProcessFiles(_, _ string, _ [][]byte, _ []string) (string, error) {
	return "", ErrNotImplemented
}

func (s *stubClient) MergeDocument(_ uint, _ string, _ []byte) (string, error) {
	return "", ErrNotImplemented
}

func (s *stubClient) ExtractPage(_ string, _ int) ([]byte, error) {
	return nil, ErrNotImplemented
}

func (s *stubClient) PageCount(_ string) (*PageInfo, error) {
	return nil, ErrNotImplemented
}

func (s *stubClient) SanitizeFileName(name string) string {
	return sanitizeFileName(name)
}
