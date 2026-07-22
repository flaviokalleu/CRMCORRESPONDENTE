// Package contratos implementa geração/gestão de contratos de locação:
// texto editável, PDF, reajuste, vínculo imóvel↔inquilino↔proprietário e
// documentos anexos. Ver docs/migration/04-alugueis.md §3-4.
package contratos

import "errors"

// ErrPDFEngineNotConfigured é devolvido quando se tenta gerar PDF sem um
// PDFEngine real conectado. O Node usava Puppeteer (Chromium headless); em Go
// a recomendação (04-spec Gotcha 9) é chromedp/wkhtmltopdf/gotenberg — a
// escolha e implementação ficam fora deste módulo (nenhuma dessas libs está
// em go.mod hoje). Ver wiring doc.
var ErrPDFEngineNotConfigured = errors.New("contratos: motor de PDF não configurado")

// PDFEngine converte HTML em bytes de PDF. Interface injetável — troque
// NoopPDFEngine pela implementação real (chromedp/gotenberg/etc.) na
// composição do servidor.
type PDFEngine interface {
	HTMLToPDF(html string) ([]byte, error)
}

// NoopPDFEngine é o stub padrão: sempre falha com ErrPDFEngineNotConfigured.
// A geração de texto do contrato funciona normalmente sem PDFEngine — só as
// rotas que exigem o binário (`POST .../contrato`, download do PDF) falham
// até a integração real ser conectada.
type NoopPDFEngine struct{}

func (NoopPDFEngine) HTMLToPDF(string) ([]byte, error) {
	return nil, ErrPDFEngineNotConfigured
}
