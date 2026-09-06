package clientes

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/integrations/pdf"
	"crmimob/internal/integrations/storage"
	"crmimob/internal/models"
)

// documentFields são os fieldnames multipart aceitos em POST/PUT (§2.1.2),
// mapeados 1:1 para models.DocumentTypeMap.
var documentFields = []string{
	"documentosPessoais", "extratoBancario", "documentosDependente",
	"documentosConjuge", "fiadorDocumentos", "formulariosCaixa", "tela_aprovacao",
}

// Handler expõe as rotas de /api/clientes (montadas por ÚLTIMO — ver routes.go).
type Handler struct {
	svc        *Service
	storageSvc *storage.Service
	pdfSvc     pdf.Service
}

func NewHandler(svc *Service, storageSvc *storage.Service, pdfSvc pdf.Service) *Handler {
	return &Handler{svc: svc, storageSvc: storageSvc, pdfSvc: pdfSvc}
}

func tenantIDFrom(c *gin.Context) (uint, bool) {
	v, ok := c.Get("tenant_id")
	if !ok {
		return 0, false
	}
	id, ok := v.(uint)
	return id, ok
}

// List — GET /clientes.
func (h *Handler) List(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	if _, ok := tenantIDFrom(c); !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Tenant não identificado"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	q := ListQuery{
		Recentes: c.Query("sort") == "recentes",
		Page:     page,
		Limit:    limit,
		Search:   c.Query("search"),
		Status:   c.Query("status"),
		Corretor: c.Query("corretor"),
	}
	if raw := c.Query("inicio"); raw != "" {
		value, err := time.ParseInLocation("2006-01-02", raw, time.Local)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "data inicial inválida"})
			return
		}
		q.Inicio = &value
	}
	if raw := c.Query("fim"); raw != "" {
		value, err := time.ParseInLocation("2006-01-02", raw, time.Local)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "data final inválida"})
			return
		}
		value = value.AddDate(0, 0, 1)
		q.Fim = &value
	}

	list, total, err := h.svc.List(c.Request.Context(), actor, q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar clientes"})
		return
	}

	resp := make([]ClienteResponse, 0, len(list))
	for i := range list {
		resp = append(resp, toResponse(&list[i]))
	}

	lim := q.Limit
	if lim < 1 {
		lim = 10
	}
	if lim > 100 {
		lim = 100
	}
	pg := q.Page
	if pg < 1 {
		pg = 1
	}
	pages := int((total + int64(lim) - 1) / int64(lim))

	c.JSON(http.StatusOK, ListResponse{
		Success:  true,
		Clientes: resp,
		Pagination: Pagination{
			Total: total, Page: pg, Limit: lim, Pages: pages,
		},
	})
}

// Get — GET /clientes/:id.
func (h *Handler) Get(c *gin.Context) {
	actor, _ := auth.UserFrom(c)
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	cliente, err := h.svc.Get(c.Request.Context(), id, actor)
	if err != nil {
		respondClienteErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "cliente": toResponse(cliente)})
}

// Create — POST /clientes (multipart/form-data).
func (h *Handler) Create(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	tenantID, ok := tenantIDFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Tenant não identificado"})
		return
	}

	in := readClienteInput(c)
	cliente, err := h.svc.Create(c.Request.Context(), in, tenantID, actor)
	if err != nil {
		respondClienteErr(c, err)
		return
	}

	h.processDocuments(c, cliente)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Cliente criado com sucesso",
		"cliente": toResponse(cliente),
		// whatsapp / notificacaoCorrespondentes: integração fora do escopo desta
		// tarefa (ver internal/integrations/whatsapp, módulo separado).
		"whatsapp":                   nil,
		"notificacaoCorrespondentes": nil,
	})
}

// Update — PUT /clientes/:id (multipart/form-data, todos os campos opcionais).
func (h *Handler) Update(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}

	in := readClienteInput(c)
	cliente, err := h.svc.Update(c.Request.Context(), id, in, actor)
	if err != nil {
		respondClienteErr(c, err)
		return
	}

	h.processDocuments(c, cliente)

	c.JSON(http.StatusOK, gin.H{
		"message":                    "Cliente atualizado com sucesso",
		"cliente":                    toResponse(cliente),
		"whatsapp":                   nil,
		"notificacaoCorrespondentes": nil,
		"alteracoesRealizadas":       true,
	})
}

// UpdateStatus — PATCH /clientes/:id/status.
func (h *Handler) UpdateStatus(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	var req StatusUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status é obrigatório"})
		return
	}
	cliente, err := h.svc.UpdateStatus(c.Request.Context(), id, req.Status, actor)
	if err != nil {
		respondClienteErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":                    "Status atualizado com sucesso",
		"cliente":                    toResponse(cliente),
		"whatsapp":                   nil,
		"notificacaoCorrespondentes": nil,
	})
}

// Delete — DELETE /clientes/:id.
func (h *Handler) Delete(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id, actor); err != nil {
		respondClienteErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Cliente removido com sucesso"})
}

// DeleteDocument — DELETE /clientes/:id/documentos/:tipo.
func (h *Handler) DeleteDocument(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	tipo := c.Param("tipo")
	column, ok := FieldColumn(tipo)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tipo de documento inválido"})
		return
	}

	cliente, err := h.svc.Get(c.Request.Context(), id, actor)
	if err != nil {
		respondClienteErr(c, err)
		return
	}

	current := documentColumnValue(cliente, column)
	if current != nil && *current != "" {
		_ = DeleteDocumentFile(*current)
	}
	if err := h.svc.repo.UpdateDocumentField(c.Request.Context(), id, column, nil); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao remover documento"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Documento removido com sucesso",
		"cliente": gin.H{"id": id, column: nil},
	})
}

// VerifyDocument — GET /clientes/:id/documentos/:tipo/verificar.
func (h *Handler) VerifyDocument(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	tipo := c.Param("tipo")
	column, ok := FieldColumn(tipo)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tipo de documento inválido"})
		return
	}
	cliente, err := h.svc.Get(c.Request.Context(), id, actor)
	if err != nil {
		respondClienteErr(c, err)
		return
	}
	caminho := documentColumnValue(cliente, column)
	if caminho == nil || *caminho == "" {
		c.JSON(http.StatusNotFound, gin.H{"exists": false, "message": "Documento não encontrado"})
		return
	}
	if err := ValidateDocumentPath(cliente, tipo, *caminho); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acesso negado ao documento"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"exists":  true,
		"path":    *caminho,
		"url":     "/api/uploads/" + *caminho,
		"message": "Documento encontrado",
	})
}

// TelaAprovacaoUpload — POST /clientes/:id/tela_aprovacao (rota legada, §2.1).
func (h *Handler) TelaAprovacaoUpload(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	cliente, err := h.svc.Get(c.Request.Context(), id, actor)
	if err != nil {
		respondClienteErr(c, err)
		return
	}

	form, err := c.MultipartForm()
	if err != nil || len(form.File["tela_aprovacao"]) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nenhum arquivo enviado"})
		return
	}

	type savedFile struct {
		FilePath string `json:"filePath"`
		FileName string `json:"fileName"`
	}
	var saved []savedFile
	for _, fh := range form.File["tela_aprovacao"] {
		rel, _, err := SaveDocumentFile(fh, safeCPF(cliente), "tela_aprovacao")
		if err != nil {
			continue
		}
		saved = append(saved, savedFile{FilePath: rel, FileName: fh.Filename})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Upload realizado com sucesso", "files": saved})
}

// DocumentInfo — GET /clientes/:id/documentos/:tipo/info (usa pdf.Service — stub por ora).
func (h *Handler) DocumentInfo(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	tipo := c.Param("tipo")
	column, ok := FieldColumn(tipo)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tipo de documento inválido"})
		return
	}
	cliente, err := h.svc.Get(c.Request.Context(), id, actor)
	if err != nil {
		respondClienteErr(c, err)
		return
	}
	caminho := documentColumnValue(cliente, column)
	if caminho == nil || *caminho == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Documento não encontrado"})
		return
	}
	if err := ValidateDocumentPath(cliente, tipo, *caminho); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acesso negado ao documento"})
		return
	}
	info, err := h.pdfSvc.PageCount(*caminho)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Processamento de PDF ainda não disponível nesta fase da migração"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"totalPages":   info.TotalPages,
		"fileSize":     info.FileSizeByte,
		"lastModified": info.LastModified,
		"fileName":     info.FileName,
		"type":         tipo,
		"clienteCpf":   safeCPF(cliente),
	})
}

// DocumentPage — GET /clientes/:id/documentos/:tipo/pagina/:pageNumber (usa pdf.Service — stub).
func (h *Handler) DocumentPage(c *gin.Context) {
	actor, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Não autorizado"})
		return
	}
	id, err := parseID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	tipo := c.Param("tipo")
	column, ok := FieldColumn(tipo)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tipo de documento inválido"})
		return
	}
	pageNumber, err := strconv.Atoi(c.Param("pageNumber"))
	if err != nil || pageNumber < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Número de página inválido"})
		return
	}
	cliente, err := h.svc.Get(c.Request.Context(), id, actor)
	if err != nil {
		respondClienteErr(c, err)
		return
	}
	caminho := documentColumnValue(cliente, column)
	if caminho == nil || *caminho == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Documento não encontrado"})
		return
	}
	if err := ValidateDocumentPath(cliente, tipo, *caminho); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Acesso negado ao documento"})
		return
	}
	buf, err := h.pdfSvc.ExtractPage(*caminho, pageNumber)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Processamento de PDF ainda não disponível nesta fase da migração"})
		return
	}
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "inline")
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate, private")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")
	c.Data(http.StatusOK, "application/pdf", buf)
}

// --- helpers internos ---

// processDocuments salva os arquivos multipart recebidos (por fieldname →
// coluna) e atualiza o registro do cliente. Incrementa storage do tenant
// quando disponível (fail-open — replica comportamento do Node §5.4).
func (h *Handler) processDocuments(c *gin.Context, cliente *models.Cliente) {
	form, err := c.MultipartForm()
	if err != nil {
		return // sem arquivos — não é erro (todos os campos são opcionais no update)
	}
	cpf := safeCPF(cliente)
	if cpf == "" {
		return
	}
	var totalBytes int64
	for _, field := range documentFields {
		files := form.File[field]
		if len(files) == 0 {
			continue
		}
		column := models.DocumentTypeMap[field]
		rel, size, err := SaveDocumentFile(files[0], cpf, column)
		if err != nil {
			continue
		}
		totalBytes += size
		_ = h.svc.repo.UpdateDocumentField(c.Request.Context(), cliente.ID, column, &rel)
	}
	if totalBytes > 0 && h.storageSvc != nil && cliente.TenantID != 0 {
		_ = h.storageSvc.IncrementStorage(c.Request.Context(), cliente.TenantID, totalBytes)
	}
}

func safeCPF(c *models.Cliente) string {
	if c.CPF == nil {
		return ""
	}
	return *c.CPF
}

func documentColumnValue(c *models.Cliente, column string) *string {
	switch column {
	case "documentos_pessoais":
		return c.DocumentosPessoais
	case "extrato_bancario":
		return c.ExtratoBancario
	case "documentos_dependente":
		return c.DocumentosDependente
	case "documentos_conjuge":
		return c.DocumentosConjuge
	case "fiador_documentos":
		return c.FiadorDocumentos
	case "formularios_caixa":
		return c.FormulariosCaixa
	case "tela_aprovacao":
		return c.TelaAprovacao
	default:
		return nil
	}
}

func parseID(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(id), nil
}

func strPtr(c *gin.Context, key string) *string {
	if v, ok := c.GetPostForm(key); ok {
		return &v
	}
	return nil
}

// readClienteInput lê os campos do multipart/form-data (§3.8), aceitando
// "user_id" OU "userId".
func readClienteInput(c *gin.Context) ClienteInput {
	in := ClienteInput{
		Nome:           strPtr(c, "nome"),
		Email:          strPtr(c, "email"),
		Telefone:       strPtr(c, "telefone"),
		CPF:            strPtr(c, "cpf"),
		EstadoCivil:    strPtr(c, "estado_civil"),
		Naturalidade:   strPtr(c, "naturalidade"),
		Profissao:      strPtr(c, "profissao"),
		DataNascimento: strPtr(c, "data_nascimento"),
		DataAdmissao:   strPtr(c, "data_admissao"),

		ValorRenda:                 strPtr(c, "valor_renda"),
		RendaTipo:                  strPtr(c, "renda_tipo"),
		PossuiCarteiraMaisTresAnos: strPtr(c, "possui_carteira_mais_tres_anos"),
		NumeroPis:                  strPtr(c, "numero_pis"),
		PossuiDependente:           strPtr(c, "possui_dependente"),

		ConjugeNome:           strPtr(c, "conjuge_nome"),
		ConjugeEmail:          strPtr(c, "conjuge_email"),
		ConjugeTelefone:       strPtr(c, "conjuge_telefone"),
		ConjugeCPF:            strPtr(c, "conjuge_cpf"),
		ConjugeProfissao:      strPtr(c, "conjuge_profissao"),
		ConjugeDataNascimento: strPtr(c, "conjuge_data_nascimento"),
		ConjugeValorRenda:     strPtr(c, "conjuge_valor_renda"),
		ConjugeRendaTipo:      strPtr(c, "conjuge_renda_tipo"),
		ConjugeDataAdmissao:   strPtr(c, "conjuge_data_admissao"),

		PossuiFiador:   strPtr(c, "possui_fiador"),
		FiadorNome:     strPtr(c, "fiador_nome"),
		FiadorCPF:      strPtr(c, "fiador_cpf"),
		FiadorTelefone: strPtr(c, "fiador_telefone"),
		FiadorEmail:    strPtr(c, "fiador_email"),

		PossuiFormulariosCaixa: strPtr(c, "possui_formularios_caixa"),

		Status:      strPtr(c, "status"),
		DataCriacao: strPtr(c, "data_criacao"),
	}
	if v := strPtr(c, "user_id"); v != nil {
		in.UserID = v
	} else if v := strPtr(c, "userId"); v != nil {
		in.UserID = v
	}
	return in
}

func respondClienteErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrNaoEncontrado), errors.Is(err, gorm.ErrRecordNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Cliente não encontrado"})
	case errors.Is(err, ErrSemPermissao):
		c.JSON(http.StatusForbidden, gin.H{"error": "Sem permissão para esta operação"})
	case errors.Is(err, ErrCPFDuplicado):
		c.JSON(http.StatusBadRequest, gin.H{"error": "CPF já cadastrado"})
	case errors.Is(err, ErrStatusInvalido):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status inválido"})
	case errors.Is(err, ErrDadosInvalidos):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro interno"})
	}
}
