package relatorios

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// Handler expõe /api/report/*. Correção deliberada de segurança (gotcha
// crítico do spec): TODAS as rotas abaixo exigem auth.Required() +
// middleware.ResolveTenant(db) — no Node eram públicas e vazavam CPF/renda/
// e-mail de todos os clientes de todos os tenants.
type Handler struct {
	repo *Repository
	pdf  PDFRenderer
}

func NewHandler(repo *Repository, pdf PDFRenderer) *Handler {
	if pdf == nil {
		pdf = NewPDFRenderer()
	}
	return &Handler{repo: repo, pdf: pdf}
}

func (h *Handler) build(c *gin.Context) (Analytics, error) {
	clientes, err := h.repo.ListClientes(c.Request.Context())
	if err != nil {
		return Analytics{}, err
	}
	return Build(clientes), nil
}

// RelatorioHTML: GET /api/report/relatorio.
func (h *Handler) RelatorioHTML(c *gin.Context) {
	a, err := h.build(c)
	if err != nil {
		c.Data(http.StatusInternalServerError, "text/html; charset=utf-8", []byte("<h1>Erro ao gerar relatório</h1>"))
		return
	}
	html, ok := RenderHTML(a)
	if !ok {
		c.Data(http.StatusNotFound, "text/html; charset=utf-8", []byte(html))
		return
	}
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
}

// RelatorioPDF: GET /api/report/relatorio/download.
func (h *Handler) RelatorioPDF(c *gin.Context) {
	a, err := h.build(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar relatório"})
		return
	}
	if a.Geral.Total == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Nenhum cliente cadastrado para gerar o relatório"})
		return
	}
	html, _ := RenderHTML(a)
	pdfBytes, err := h.pdf.RenderHTML(c.Request.Context(), html)
	if err != nil {
		// Substitui o Puppeteer do Node — ainda não implementado nesta fase.
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Geração de PDF indisponível nesta fase da migração"})
		return
	}
	filename := fmt.Sprintf("relatorio-clientes-%s.pdf", time.Now().Format("2006-01-02"))
	c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

// RelatorioDados: GET /api/report/relatorio/dados.
func (h *Handler) RelatorioDados(c *gin.Context) {
	a, err := h.build(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true, "data": a, "total": a.Geral.Total, "timestamp": time.Now(),
	})
}
