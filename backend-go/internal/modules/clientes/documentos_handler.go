package clientes

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"path"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/blob"
	"crmimob/internal/integrations/media"
	"crmimob/internal/models"
)

// DocumentoResposta é o shape de um arquivo na API. `caminho` nunca sai daqui:
// o cliente navega por id, e é o servidor que resolve onde o arquivo mora.
type DocumentoResposta struct {
	ID           uint    `json:"id"`
	Tipo         string  `json:"tipo"`
	Ordem        int     `json:"ordem"`
	NomeOriginal string  `json:"nome_original"`
	Mime         string  `json:"mime"`
	Bytes        int64   `json:"bytes"`
	BytesOrigem  int64   `json:"bytes_origem"`
	Economia     float64 `json:"economia_pct"`
	Paginas      int     `json:"paginas"`
	EhImagem     bool    `json:"eh_imagem"`
	CriadoEm     string  `json:"criado_em"`
}

// GrupoDocumentos junta os arquivos de um tipo com o total do grupo, para a
// interface não ter que somar no cliente o que o servidor já sabe.
type GrupoDocumentos struct {
	Tipo     string              `json:"tipo"`
	Rotulo   string              `json:"rotulo"`
	Arquivos []DocumentoResposta `json:"arquivos"`
	Total    int                 `json:"total"`
	Bytes    int64               `json:"bytes"`
	Paginas  int                 `json:"paginas"`
}

// RotuloDocumento traduz a chave técnica do tipo para o nome que aparece no
// formulário de cadastro — a interface não deveria reescrever esse mapa.
var RotuloDocumento = map[string]string{
	"documentosPessoais":   "Documentos pessoais",
	"extratoBancario":      "Extrato / contracheque",
	"documentosDependente": "Documentos dos dependentes",
	"documentosConjuge":    "Documentos do cônjuge",
	"fiadorDocumentos":     "Documentos do fiador",
	"formulariosCaixa":     "Formulários Caixa",
	"tela_aprovacao":       "Tela de aprovação",
}

// ordemDosTipos é a sequência em que os grupos aparecem, igual à do cadastro.
var ordemDosTipos = []string{
	"documentosPessoais", "extratoBancario", "documentosDependente",
	"documentosConjuge", "fiadorDocumentos", "formulariosCaixa", "tela_aprovacao",
}

func toDocumentoResposta(d models.ClienteDocumento) DocumentoResposta {
	var economia float64
	if d.BytesOrigem > 0 && d.Bytes < d.BytesOrigem {
		economia = (1 - float64(d.Bytes)/float64(d.BytesOrigem)) * 100
	}
	return DocumentoResposta{
		ID: d.ID, Tipo: d.Tipo, Ordem: d.Ordem,
		NomeOriginal: d.NomeOriginal, Mime: d.Mime,
		Bytes: d.Bytes, BytesOrigem: d.BytesOrigem,
		Economia: float64(int(economia*10+0.5)) / 10,
		Paginas:  d.Paginas, EhImagem: d.EhImagem(),
		CriadoEm: d.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// ListarDocumentos — GET /clientes/:id/documentos.
func (h *Handler) ListarDocumentos(c *gin.Context) {
	cliente, ok := h.clienteAutorizado(c)
	if !ok {
		return
	}
	docs, err := h.docsSvc.Listar(c.Request.Context(), cliente.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar documentos"})
		return
	}

	porTipo := map[string][]DocumentoResposta{}
	bytesPorTipo := map[string]int64{}
	paginasPorTipo := map[string]int{}
	for _, d := range docs {
		porTipo[d.Tipo] = append(porTipo[d.Tipo], toDocumentoResposta(d))
		bytesPorTipo[d.Tipo] += d.Bytes
		paginasPorTipo[d.Tipo] += d.Paginas
	}

	grupos := make([]GrupoDocumentos, 0, len(ordemDosTipos))
	var totalBytes int64
	var totalArquivos, totalPaginas int
	for _, tipo := range ordemDosTipos {
		arquivos := porTipo[tipo]
		if len(arquivos) == 0 {
			continue
		}
		grupos = append(grupos, GrupoDocumentos{
			Tipo: tipo, Rotulo: RotuloDocumento[tipo], Arquivos: arquivos,
			Total: len(arquivos), Bytes: bytesPorTipo[tipo], Paginas: paginasPorTipo[tipo],
		})
		totalBytes += bytesPorTipo[tipo]
		totalArquivos += len(arquivos)
		totalPaginas += paginasPorTipo[tipo]
	}

	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"grupos":         grupos,
		"total_arquivos": totalArquivos,
		"total_bytes":    totalBytes,
		"total_paginas":  totalPaginas,
	})
}

// BaixarDocumento — GET /clientes/:id/documentos/arquivo/:docId
// `?download=1` força o "salvar como"; sem isso o arquivo abre no navegador.
func (h *Handler) BaixarDocumento(c *gin.Context) {
	cliente, ok := h.clienteAutorizado(c)
	if !ok {
		return
	}
	docID, err := strconv.ParseUint(c.Param("docId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id de documento inválido"})
		return
	}
	doc, err := h.docsSvc.Buscar(c.Request.Context(), cliente.ID, uint(docID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Documento não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar documento"})
		return
	}
	nome := nomeParaDownload(doc.NomeOriginal, path.Ext(doc.Caminho))
	h.servirDoStore(c, doc.Caminho, doc.Mime, nome)
}

// RemoverDocumento — DELETE /clientes/:id/documentos/arquivo/:docId
func (h *Handler) RemoverDocumento(c *gin.Context) {
	cliente, ok := h.clienteAutorizado(c)
	if !ok {
		return
	}
	docID, err := strconv.ParseUint(c.Param("docId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id de documento inválido"})
		return
	}
	if err := h.docsSvc.Remover(c.Request.Context(), cliente, uint(docID)); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Documento não encontrado"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao remover documento"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Documento removido"})
}

// EnviarDocumentos — POST /clientes/:id/documentos/:tipo
// Permite acrescentar arquivos a um cliente já cadastrado sem passar pelo PUT
// completo, que reenviaria o formulário inteiro.
func (h *Handler) EnviarDocumentos(c *gin.Context) {
	cliente, ok := h.clienteAutorizado(c)
	if !ok {
		return
	}
	tipo := c.Param("tipo")
	if _, ok := models.DocumentTypeMap[tipo]; !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tipo de documento inválido"})
		return
	}
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Envio inválido"})
		return
	}
	// Aceita tanto o fieldname genérico quanto o nome do tipo, para o mesmo
	// endpoint servir a um formulário simples e ao cadastro completo.
	arquivos := form.File["arquivos"]
	if len(arquivos) == 0 {
		arquivos = form.File[tipo]
	}
	if len(arquivos) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nenhum arquivo enviado"})
		return
	}

	criados, falhas, err := h.docsSvc.Salvar(c.Request.Context(), cliente, tipo, arquivos)
	if err != nil && len(criados) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar documentos"})
		return
	}
	resp := make([]DocumentoResposta, 0, len(criados))
	var economizado int64
	for _, d := range criados {
		resp = append(resp, toDocumentoResposta(d))
		economizado += d.BytesOrigem - d.Bytes
	}
	c.JSON(http.StatusCreated, gin.H{
		"success":        true,
		"arquivos":       resp,
		"falhas":         falhas,
		"bytes_poupados": economizado,
	})
}

// PDFDoTipo — GET /clientes/:id/documentos/:tipo/pdf
// PDF único com todos os arquivos daquele tipo.
func (h *Handler) PDFDoTipo(c *gin.Context) {
	cliente, ok := h.clienteAutorizado(c)
	if !ok {
		return
	}
	tipo := c.Param("tipo")
	caminho, paginas, ignorados, err := h.docsSvc.PDFConsolidado(c.Request.Context(), cliente, tipo)
	if err != nil {
		responderErroPDF(c, err)
		return
	}
	nome := fmt.Sprintf("%s-%s.pdf", slug(RotuloDocumento[tipo]), safeCPF(cliente))
	cabecalhoPDF(c, paginas, ignorados)
	h.servirDoStore(c, caminho, "application/pdf", nome)
}

// PDFDossieCompleto — GET /clientes/:id/documentos/pdf
// Todos os documentos do cliente num PDF só, na ordem do formulário.
func (h *Handler) PDFDossieCompleto(c *gin.Context) {
	cliente, ok := h.clienteAutorizado(c)
	if !ok {
		return
	}
	caminho, paginas, ignorados, err := h.docsSvc.PDFDossie(c.Request.Context(), cliente)
	if err != nil {
		responderErroPDF(c, err)
		return
	}
	nome := fmt.Sprintf("dossie-%s.pdf", safeCPF(cliente))
	cabecalhoPDF(c, paginas, ignorados)
	h.servirDoStore(c, caminho, "application/pdf", nome)
}

// --- helpers ---

// clienteAutorizado resolve :id e aplica a mesma regra de acesso das demais
// rotas de cliente. Devolve ok=false com a resposta HTTP já escrita.
func (h *Handler) clienteAutorizado(c *gin.Context) (*models.Cliente, bool) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return nil, false
	}
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return nil, false
	}
	cliente, err := h.svc.Get(c.Request.Context(), id, actor)
	if err != nil {
		respondClienteErr(c, err)
		return nil, false
	}
	return cliente, true
}

func responderErroPDF(c *gin.Context, err error) {
	switch {
	case errors.Is(err, media.ErrSemArquivos):
		c.JSON(http.StatusNotFound, gin.H{"error": "Nenhum documento para este cliente"})
	case errors.Is(err, ErrTipoDocumentoInvalido):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tipo de documento inválido"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao montar o PDF"})
	}
}

// cabecalhoPDF anuncia o que foi montado. Arquivos ignorados viram cabeçalho em
// vez de erro: o PDF com as outras páginas continua útil, e esconder a falha
// faria alguém achar que enviou um documento que não está lá.
func cabecalhoPDF(c *gin.Context, paginas int, ignorados []string) {
	c.Header("X-Total-Paginas", strconv.Itoa(paginas))
	if len(ignorados) > 0 {
		c.Header("X-Arquivos-Ignorados", strings.Join(ignorados, ", "))
	}
}

// servirDoStore transmite um objeto do armazenamento direto para a resposta.
//
// Os bytes passam pela API de propósito: assim o bucket não precisa estar
// acessível pela internet e a URL do documento não vale nada fora da sessão —
// o que importa quando o arquivo é um RG ou um contracheque. O custo é a banda
// passar por aqui, aceito conscientemente.
//
// O streaming é feito com io.Copy em vez de ler tudo em memória: um dossiê de
// trinta páginas com várias requisições simultâneas encheria a RAM do contêiner.
func (h *Handler) servirDoStore(c *gin.Context, chave, mime, nomeSugerido string) {
	leitor, info, err := h.docsSvc.Store().Abrir(c.Request.Context(), chave)
	if err != nil {
		if errors.Is(err, blob.ErrNaoEncontrado) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Arquivo não encontrado no armazenamento"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao ler o arquivo"})
		return
	}
	defer leitor.Close()

	disposicao := "inline"
	if c.Query("download") != "" {
		disposicao = "attachment"
	}
	if mime == "" {
		mime = info.Mime
	}
	c.Header("Content-Type", mime)
	c.Header("Content-Disposition", fmt.Sprintf("%s; filename*=UTF-8''%s", disposicao, escaparNome(nomeSugerido)))
	c.Header("Cache-Control", "private, no-store")
	c.Header("X-Content-Type-Options", "nosniff")
	if info.Tamanho > 0 {
		c.Header("Content-Length", strconv.FormatInt(info.Tamanho, 10))
	}
	c.Status(http.StatusOK)
	if _, err := io.Copy(c.Writer, leitor); err != nil {
		// A resposta já começou; só resta abortar a conexão para o cliente não
		// receber um arquivo truncado como se estivesse completo.
		c.Abort()
	}
}

// nomeParaDownload devolve o nome original com a extensão que o arquivo tem de
// fato no disco — uma foto enviada como .png e convertida para JPEG precisa
// baixar como .jpg, senão o sistema operacional abre errado.
func nomeParaDownload(nomeOriginal, extReal string) string {
	base := strings.TrimSuffix(filepath.Base(nomeOriginal), filepath.Ext(nomeOriginal))
	if base == "" {
		base = "documento"
	}
	return base + extReal
}

func escaparNome(nome string) string {
	var b strings.Builder
	for _, r := range nome {
		if r < 128 && (r == '-' || r == '_' || r == '.' || r == '~' ||
			(r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z')) {
			b.WriteRune(r)
			continue
		}
		for _, by := range []byte(string(r)) {
			b.WriteString(fmt.Sprintf("%%%02X", by))
		}
	}
	return b.String()
}

func slug(s string) string {
	s = strings.ToLower(s)
	var b strings.Builder
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == ' ' || r == '/' || r == '-':
			b.WriteRune('-')
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		return "documentos"
	}
	return out
}
