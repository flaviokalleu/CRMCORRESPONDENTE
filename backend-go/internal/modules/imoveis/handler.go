package imoveis

import (
	"archive/zip"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
)

// uploadsRoot replica a mesma raiz compartilhada usada pelo módulo clientes
// (backend-go/../backend/uploads) — ver internal/modules/clientes/documents.go.
func uploadsRoot() string {
	if v := os.Getenv("UPLOADS_DIR"); v != "" {
		return v
	}
	return filepath.Join("..", "backend", "uploads")
}

func imovelDir(id uint, sub string) string {
	return filepath.Join(uploadsRoot(), "imoveis", strconv.FormatUint(uint64(id), 10), sub)
}

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/imoveis")
	{
		g.GET("", h.List)
		g.GET("/", h.List)
		g.GET("/imoveis", h.List)
		g.GET("/busca", h.Busca)
		g.POST("/", h.Create)
		g.PUT("/:id", h.Update)
		g.DELETE("/:id", h.Delete)
		g.GET("/:id/download-imagens", h.DownloadImagens)
		g.GET("/:id/semelhantes", h.Semelhantes)
		// `/:id` genérico por ÚLTIMO — não pode capturar /busca, /imoveis etc (§2.3 gotcha).
		g.GET("/:id", h.Get)
	}
}

// RegisterPublicRoutes monta só os endpoints de LEITURA (sem auth) para a
// vitrine pública (SEO) — nunca Create/Update/Delete/DownloadImagens. O grupo
// `rg` já deve ter `middleware.PublicTenantScope(id)` aplicado. Usa
// `ListPublico` (não `List`) para nunca vazar imóveis vendidos/reservados.
func (h *Handler) RegisterPublicRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/imoveis")
	{
		g.GET("", h.ListPublico)
		g.GET("/", h.ListPublico)
		g.GET("/busca", h.Busca)
		g.GET("/:id/semelhantes", h.Semelhantes)
		g.GET("/:id", h.Get)
	}
}

// ListPublico é igual a List, mas força ApenasDisponiveis=true.
func (h *Handler) ListPublico(c *gin.Context) {
	f := Filters{
		Categoria:         c.Query("categoria"),
		Localizacao:       c.Query("localizacao"),
		Busca:             c.Query("busca"),
		ApenasDisponiveis: true,
	}
	list, err := h.svc.List(c.Request.Context(), f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar imóveis"})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *Handler) List(c *gin.Context) {
	f := Filters{Categoria: c.Query("categoria"), Localizacao: c.Query("localizacao"), Busca: c.Query("busca")}
	list, err := h.svc.List(c.Request.Context(), f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar imóveis"})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *Handler) Busca(c *gin.Context) {
	list, err := h.svc.Busca(c.Request.Context(), c.Query("busca"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parâmetro busca é obrigatório"})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *Handler) Get(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	im, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Imóvel não encontrado"})
		return
	}
	c.JSON(http.StatusOK, im)
}

func (h *Handler) Create(c *gin.Context) {
	var tenantID *uint
	if v, ok := c.Get("tenant_id"); ok {
		if tid, ok := v.(uint); ok {
			tenantID = &tid
		}
	}
	in := readImovelInput(c)
	im, err := h.svc.Create(c.Request.Context(), in, tenantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}
	h.processImages(c, im.ID)
	// Recarrega para devolver com imagens/documentacao já persistidas.
	im, _ = h.svc.Get(c.Request.Context(), im.ID)
	c.JSON(http.StatusCreated, im)
}

func (h *Handler) Update(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	in := readImovelInput(c)
	im, err := h.svc.Update(c.Request.Context(), id, in)
	if err != nil {
		if errors.Is(err, ErrNaoEncontrado) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Imóvel não encontrado"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}
	h.processImages(c, im.ID)
	im, _ = h.svc.Get(c.Request.Context(), id)
	c.JSON(http.StatusOK, im)
}

func (h *Handler) Delete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Imóvel não encontrado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Imóvel removido com sucesso"})
}

func (h *Handler) Semelhantes(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	list, err := h.svc.Semelhantes(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Imóvel não encontrado"})
		return
	}
	c.JSON(http.StatusOK, list)
}

// DownloadImagens zipa uploads/imoveis/:id/imagens (§2.3).
func (h *Handler) DownloadImagens(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	dir := imovelDir(id, "imagens")
	entries, err := os.ReadDir(dir)
	if err != nil || len(entries) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Nenhuma imagem encontrada para este imóvel"})
		return
	}

	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", "attachment; filename=imoveis-"+c.Param("id")+"-imagens.zip")

	zw := zip.NewWriter(c.Writer)
	defer zw.Close()
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		func() {
			f, err := os.Open(filepath.Join(dir, e.Name()))
			if err != nil {
				return
			}
			defer f.Close()
			w, err := zw.Create(e.Name())
			if err != nil {
				return
			}
			_, _ = io.Copy(w, f)
		}()
	}
}

// --- upload de imagens/documentação ---

// processImages salva os arquivos multipart recebidos (documentacao, imagens,
// imagem_capa) em uploads/imoveis/<id>/{documentacao,imagens,capa}/.
//
// NOTA DE ESCOPO: o Node converte imagens para webp via sharp
// (organizeAndConvertImages). Sem uma lib de imagem no go.mod ainda (bimg/
// imaging — ver docs/migration/wiring), salvamos os arquivos originais
// como recebidos; a conversão para webp fica para quando a lib for adicionada.
func (h *Handler) processImages(c *gin.Context, imovelID uint) {
	form, err := c.MultipartForm()
	if err != nil {
		return
	}

	if docs := form.File["documentacao"]; len(docs) > 0 {
		if rel, ok := saveFile(docs[0], imovelDir(imovelID, "documentacao")); ok {
			_ = h.svc.SetDocumentacao(c.Request.Context(), imovelID, rel)
		}
	}
	if capas := form.File["imagem_capa"]; len(capas) > 0 {
		if rel, ok := saveFile(capas[0], imovelDir(imovelID, "capa")); ok {
			_ = h.svc.SetImagemCapa(c.Request.Context(), imovelID, rel)
		}
	}
	if imgs := form.File["imagens"]; len(imgs) > 0 {
		var relPaths []string
		dir := imovelDir(imovelID, "imagens")
		for _, fh := range imgs {
			if rel, ok := saveFile(fh, dir); ok {
				relPaths = append(relPaths, rel)
			}
		}
		if len(relPaths) > 0 {
			_ = h.svc.AppendImagePaths(c.Request.Context(), imovelID, relPaths)
		}
	}
}

func saveFile(fh *multipart.FileHeader, dir string) (relPath string, ok bool) {
	if fh == nil || fh.Size <= 0 || fh.Size > maxPropertyUploadBytes {
		return "", false
	}
	name := safeUploadName(fh.Filename)
	ext := strings.ToLower(filepath.Ext(name))
	if !allowedPropertyUploadExt[ext] {
		return "", false
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", false
	}
	// Nunca usa o nome enviado como caminho. O prefixo único também evita que
	// dois uploads legítimos sobrescrevam o arquivo anterior.
	dest := filepath.Join(dir, fmt.Sprintf("%d_%s", time.Now().UnixNano(), name))
	src, err := fh.Open()
	if err != nil {
		return "", false
	}
	defer src.Close()
	dst, err := os.Create(dest)
	if err != nil {
		return "", false
	}
	defer dst.Close()
	if _, err := io.Copy(dst, io.LimitReader(src, maxPropertyUploadBytes+1)); err != nil {
		return "", false
	}
	if info, err := os.Stat(dest); err != nil || info.Size() > maxPropertyUploadBytes {
		_ = os.Remove(dest)
		return "", false
	}
	rel, err := filepath.Rel(uploadsRoot(), dest)
	if err != nil {
		return "", false
	}
	return filepath.ToSlash(rel), true
}

const maxPropertyUploadBytes int64 = 10 << 20

var allowedPropertyUploadExt = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".pdf": true,
}

func safeUploadName(raw string) string {
	base := filepath.Base(strings.TrimSpace(raw))
	if base == "." || base == "" {
		return "arquivo"
	}
	var b strings.Builder
	for _, r := range base {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '.' || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteByte('_')
		}
	}
	name := strings.Trim(b.String(), "._")
	if name == "" {
		return "arquivo"
	}
	return name
}

func readImovelInput(c *gin.Context) ImovelInput {
	str := func(key string) *string {
		if v, ok := c.GetPostForm(key); ok {
			return &v
		}
		return nil
	}
	return ImovelInput{
		NomeImovel:      str("nome_imovel"),
		DescricaoImovel: str("descricao_imovel"),
		Endereco:        str("endereco"),
		Tipo:            str("tipo"),
		Quartos:         str("quartos"),
		Banheiro:        str("banheiro"),
		Tags:            str("tags"),
		ValorAvaliacao:  str("valor_avaliacao"),
		ValorVenda:      str("valor_venda"),
		Localizacao:     str("localizacao"),
		Exclusivo:       str("exclusivo"),
		TemInquilino:    str("tem_inquilino"),
		SituacaoImovel:  str("situacao_imovel"),
		Observacoes:     str("observacoes"),
	}
}

func parseID(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(id), nil
}
