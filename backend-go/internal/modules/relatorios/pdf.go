package relatorios

import (
	"context"
	"errors"
)

// PDFRenderer converte um HTML já renderizado em bytes de PDF (substitui o
// Puppeteer headless do Node — `--no-sandbox`, A4). Declarado LOCALMENTE
// porque este é um caso de uso diferente do internal/integrations/pdf
// existente (aquele pacote cobre merge/split/rasterização de documentos de
// cliente — docs/migration/02-clientes-imoveis-uploads.md §5.5; não tem um
// método de "renderizar HTML para PDF"). Ver
// docs/migration/wiring/06-dashboards-vendas-config.md para a decisão de não
// duplicar e o plano de consolidação futura.
type PDFRenderer interface {
	// RenderHTML devolve os bytes de um PDF A4 a partir do HTML informado.
	RenderHTML(ctx context.Context, html string) ([]byte, error)
}

// ErrPDFNotImplemented é devolvido pelo stub — nenhuma lib de renderização
// HTML→PDF (chromedp/gotenberg/wkhtmltopdf/maroto) foi adicionada ao go.mod
// nesta fase (este agente está proibido de rodar `go get`/`go mod tidy`).
var ErrPDFNotImplemented = errors.New("relatorios: geração de PDF ainda não implementada nesta fase da migração")

// stubPDFRenderer é o placeholder documentado. GET /relatorio/download deve
// tratar ErrPDFNotImplemented como "PDF indisponível nesta fase" (503), nunca
// como bug — o endpoint HTML/JSON funciona normalmente.
type stubPDFRenderer struct{}

// NewPDFRenderer devolve a implementação-placeholder. Trocar por um client
// real (chromedp contra Chromium headless, ou um serviço gotenberg) quando a
// geração de PDF for implementada.
func NewPDFRenderer() PDFRenderer { return stubPDFRenderer{} }

func (stubPDFRenderer) RenderHTML(_ context.Context, _ string) ([]byte, error) {
	return nil, ErrPDFNotImplemented
}
