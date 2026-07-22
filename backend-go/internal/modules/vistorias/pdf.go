package vistorias

import "errors"

// ErrPDFEngineNotConfigured — ver internal/modules/contratos/pdf.go (mesma
// decisão: Puppeteer não tem substituto Go em go.mod hoje; ver wiring doc).
var ErrPDFEngineNotConfigured = errors.New("vistorias: motor de PDF não configurado")

// PDFEngine converte HTML em bytes de PDF (laudo de vistoria).
type PDFEngine interface {
	HTMLToPDF(html string) ([]byte, error)
}

type NoopPDFEngine struct{}

func (NoopPDFEngine) HTMLToPDF(string) ([]byte, error) { return nil, ErrPDFEngineNotConfigured }
