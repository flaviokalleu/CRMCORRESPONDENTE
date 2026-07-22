package contratos

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Register monta as rotas de contratoAluguel.js + contratoRoutes.js.
//
// ⚠ Decisão consciente (04-spec Gotcha 2): no Node, `contratoAluguel.js`
// (texto/PDF/reajuste) é montado SEM auth. Aqui recomendamos exigir
// auth+tenant (o chamador decide isso ao montar o grupo — ver wiring doc).
// `contratoRoutes.js` (vínculo/documentos) já usava auth interno no Node;
// preservado.
func (h *Handler) Register(r *gin.RouterGroup) {
	r.GET("/clientealuguel/:id/contrato/texto", h.ObterTexto)
	r.POST("/clientealuguel/:id/contrato", h.SalvarContrato)
	r.GET("/clientealuguel/:id/contrato", h.BaixarContrato)
	r.GET("/clientealuguel/:id/reajuste", h.CalcularReajuste)
	r.POST("/clientealuguel/:id/reajuste/aplicar", h.AplicarReajuste)

	r.GET("/contratos/opcoes", h.Opcoes)
	r.POST("/contratos/vincular", h.Vincular)
	r.POST("/contratos/:clienteAluguelId/documentos", h.AnexarDocumentos)
	r.GET("/contratos", h.ListarContratos)
	r.PUT("/contratos/:id/atualizar", h.AtualizarVinculo)
	r.DELETE("/contratos/:id", h.RemoverVinculo)
	r.GET("/contratos/documento/:docId/download", h.DownloadDocumento)
}

func idParam(c *gin.Context, name string) (uint, bool) {
	id, err := strconv.ParseUint(c.Param(name), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return 0, false
	}
	return uint(id), true
}

func (h *Handler) ObterTexto(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	forcar := c.Query("modelo") == "padrao"
	texto, err := h.svc.ObterTextoContrato(c.Request.Context(), id, forcar)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"texto_contrato": texto})
}

func (h *Handler) SalvarContrato(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	var req ContratoTextoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	caminho, nomeArquivo, err := h.svc.SalvarContrato(c.Request.Context(), id, req.TextoContrato)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
			return
		}
		if errors.Is(err, ErrPDFEngineNotConfigured) {
			// Texto salvo com sucesso; PDF pendente de integração (ver wiring doc).
			c.JSON(http.StatusOK, gin.H{
				"message": "Texto do contrato salvo. Geração de PDF indisponível (motor não configurado).",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":       "Contrato gerado com sucesso",
		"caminho":       caminho,
		"nome_arquivo":  nomeArquivo,
		"url_relativa":  "/" + filepath.ToSlash(caminho),
	})
}

func (h *Handler) BaixarContrato(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	path, err := h.svc.BaixarContratoPDF(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contrato PDF não encontrado"})
		return
	}
	c.FileAttachment(path, filepath.Base(path))
}

func (h *Handler) CalcularReajuste(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	indice, _ := strconv.ParseFloat(c.Query("indice"), 64)
	res, err := h.svc.CalcularReajuste(c.Request.Context(), id, indice)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) AplicarReajuste(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	var req ReajusteAplicarRequest
	_ = c.ShouldBindJSON(&req)
	// NOTA (wiring): AsaasUpdater real deve ser injetado pelo servidor quando
	// internal/integrations/asaas estiver pronto; passamos nil (sem propagação).
	res, err := h.svc.AplicarReajuste(c.Request.Context(), id, req.Indice, "", nil)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"valor_anterior":  res.ValorAnterior,
		"valor_novo":      res.ValorNovo,
		"indice_aplicado": res.IndiceAplicado,
	})
}

func (h *Handler) Opcoes(c *gin.Context) {
	out, err := h.svc.Opcoes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao carregar opções"})
		return
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) Vincular(c *gin.Context) {
	var req VincularRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cliente, err := h.svc.Vincular(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		case errors.Is(err, ErrTenantMismatch):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Vínculo atualizado", "cliente": cliente})
}

func (h *Handler) AtualizarVinculo(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	var req VincularRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cliente, err := h.svc.AtualizarVinculo(c.Request.Context(), id, req)
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		case errors.Is(err, ErrTenantMismatch):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Vínculo atualizado", "cliente": cliente})
}

func (h *Handler) RemoverVinculo(c *gin.Context) {
	id, ok := idParam(c, "id")
	if !ok {
		return
	}
	if err := h.svc.RemoverVinculo(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Vínculo removido"})
}

func (h *Handler) ListarContratos(c *gin.Context) {
	out, err := h.svc.ListarContratos(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar contratos"})
		return
	}
	c.JSON(http.StatusOK, out)
}

const maxDocBytes = 20 << 20 // 20MB, igual ao multer de contratoRoutes.js

var allowedDocExt = map[string]bool{
	".pdf": true, ".jpg": true, ".jpeg": true, ".png": true, ".doc": true, ".docx": true,
}

func (h *Handler) AnexarDocumentos(c *gin.Context) {
	id, ok := idParam(c, "clienteAluguelId")
	if !ok {
		return
	}
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "multipart/form-data esperado"})
		return
	}
	files := form.File["documentos[]"]
	if len(files) == 0 {
		files = form.File["documentos"]
	}
	if len(files) > 10 {
		files = files[:10]
	}

	dir := filepath.Join(uploadsRoot, "contratos", strconv.FormatUint(uint64(id), 10))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var docs []ContratoDocumento
	for i, fh := range files {
		ext := strings.ToLower(filepath.Ext(fh.Filename))
		if !allowedDocExt[ext] {
			continue
		}
		if fh.Size > maxDocBytes {
			continue
		}
		src, err := fh.Open()
		if err != nil {
			continue
		}
		name := fmt.Sprintf("%d_%d%s", time.Now().UnixNano(), i, ext)
		dstPath := filepath.Join(dir, name)
		dst, err := os.Create(dstPath)
		if err != nil {
			src.Close()
			continue
		}
		buf := make([]byte, 32*1024)
		for {
			n, readErr := src.Read(buf)
			if n > 0 {
				dst.Write(buf[:n])
			}
			if readErr != nil {
				break
			}
		}
		src.Close()
		dst.Close()

		docs = append(docs, ContratoDocumento{
			ID:         fmt.Sprintf("%d-%d", time.Now().UnixNano(), i),
			Nome:       fh.Filename,
			Tipo:       ext,
			Path:       filepath.ToSlash(filepath.Join("contratos", strconv.FormatUint(uint64(id), 10), name)),
			DataUpload: time.Now(),
		})
	}

	cliente, err := h.svc.AnexarDocumentos(c.Request.Context(), id, docs)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Inquilino não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Documentos anexados", "documentos": docs, "cliente": cliente.ID})
}

// DownloadDocumento resolve o caminho de forma segura DENTRO de uploads/, para
// evitar path traversal (a partir do id do documento salvo no JSONB).
func (h *Handler) DownloadDocumento(c *gin.Context) {
	docID := c.Param("docId")
	doc, err := h.svc.BuscarDocumento(c.Request.Context(), docID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Documento não encontrado"})
		return
	}

	root, err := filepath.Abs(uploadsRoot)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	full, err := filepath.Abs(filepath.Join(uploadsRoot, doc.Path))
	if err != nil || !strings.HasPrefix(full, root) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Caminho inválido"})
		return
	}
	if _, err := os.Stat(full); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Arquivo não encontrado no disco"})
		return
	}
	c.FileAttachment(full, doc.Nome)
}
