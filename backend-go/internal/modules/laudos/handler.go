package laudos

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"crmimob/internal/auth"
	"crmimob/internal/models"
	"crmimob/internal/tenant"
)

// Handler expõe /api/laudos/*. Todas as rotas exigem auth.Required() +
// middleware.ResolveTenant(db) (wiring). PUT/DELETE exigem adicionalmente
// `canManage` (admin OU dono).
type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func currentTenantID(c *gin.Context, user *models.User) uint {
	if scope, ok := tenant.From(c.Request.Context()); ok && scope.TenantID != nil {
		return *scope.TenantID
	}
	if user.TenantID != nil {
		return *user.TenantID
	}
	return 0
}

// List: GET /api/laudos/?page=&limit=&search=&parceiro=&tipo_imovel=&status=todos
func (h *Handler) List(c *gin.Context) {
	f := ListFilters{
		Page: 1, Limit: 10,
		Search: c.Query("search"), Parceiro: c.Query("parceiro"), TipoImovel: c.Query("tipo_imovel"),
		Status: c.DefaultQuery("status", "todos"),
	}
	if v, err := strconv.Atoi(c.Query("page")); err == nil && v > 0 {
		f.Page = v
	}
	if v, err := strconv.Atoi(c.Query("limit")); err == nil && v > 0 {
		f.Limit = v
	}
	now := time.Now()
	out, total, err := h.repo.List(c.Request.Context(), f, now)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao listar laudos", "error": err.Error()})
		return
	}
	resp := make([]LaudoResponse, 0, len(out))
	for _, l := range out {
		resp = append(resp, toResponse(l, now))
	}
	totalPages := int((total + int64(f.Limit) - 1) / int64(f.Limit))
	if totalPages < 1 {
		totalPages = 1
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true, "data": resp,
		"pagination": Pagination{Total: total, Page: f.Page, Limit: f.Limit, TotalPages: totalPages},
	})
}

// Get: GET /api/laudos/:id
func (h *Handler) Get(c *gin.Context) {
	l, ok := h.findOr404(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": toResponse(*l, time.Now())})
}

// Create: POST /api/laudos/ (multipart).
func (h *Handler) Create(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Não autenticado"})
		return
	}

	parceiro := strings.TrimSpace(c.PostForm("parceiro"))
	tipoImovel := strings.TrimSpace(c.PostForm("tipo_imovel"))
	endereco := strings.TrimSpace(c.PostForm("endereco"))
	vencimentoStr := strings.TrimSpace(c.PostForm("vencimento"))
	valorSolicitadoStr := strings.TrimSpace(c.PostForm("valor_solicitado"))
	valorLiberadoStr := strings.TrimSpace(c.PostForm("valor_liberado"))
	observacoes := c.PostForm("observacoes")

	if parceiro == "" || tipoImovel == "" || endereco == "" || vencimentoStr == "" || valorSolicitadoStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "parceiro, tipo_imovel, valor_solicitado, vencimento e endereco são obrigatórios"})
		return
	}
	if !models.IsTipoImovelValido(tipoImovel) {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "tipo_imovel deve ser 'casa' ou 'apartamento'"})
		return
	}
	valorSolicitado, err := strconv.ParseFloat(valorSolicitadoStr, 64)
	if err != nil || valorSolicitado <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "valor_solicitado deve ser numérico e maior que zero"})
		return
	}
	var valorLiberado *float64
	if valorLiberadoStr != "" {
		v, err := strconv.ParseFloat(valorLiberadoStr, 64)
		if err != nil || v < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "valor_liberado deve ser numérico e maior ou igual a zero"})
			return
		}
		valorLiberado = &v
	}
	vencimento, err := time.Parse("2006-01-02", vencimentoStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "vencimento inválido (use YYYY-MM-DD)"})
		return
	}

	var obsPtr *string
	if observacoes != "" {
		obsPtr = &observacoes
	}

	l := &models.Laudo{
		Parceiro: parceiro, TipoImovel: tipoImovel,
		ValorSolicitado: valorSolicitado, ValorLiberado: valorLiberado,
		Vencimento: vencimento, Endereco: endereco, Observacoes: obsPtr,
		UserID: user.ID, TenantID: currentTenantID(c, user),
	}

	// Transação: cria o registro (para obter o ID), grava arquivos, atualiza o JSONB.
	// Em falha, limpa arquivos órfãos já gravados (equivalente a cleanupAllTempFiles).
	err = h.repo.DB().WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(l).Error; err != nil {
			return err
		}
		arquivos, err := mergeMultipartFiles(c, l.TenantID, l.ID, nil)
		if err != nil {
			return err
		}
		if len(arquivos) > 0 {
			l.Arquivos = encodeArquivos(arquivos)
			if err := tx.Model(l).Update("arquivos", l.Arquivos).Error; err != nil {
				cleanupArquivosJSON(l.Arquivos)
				return err
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao criar laudo", "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "message": "Laudo criado com sucesso", "data": toResponse(*l, time.Now())})
}

// Update: PUT /api/laudos/:id (multipart parcial + remover_arquivos).
func (h *Handler) Update(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Não autenticado"})
		return
	}
	l, ok := h.findOr404(c)
	if !ok {
		return
	}
	if !canManage(user, l) {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Sem permissão para editar este laudo"})
		return
	}

	if v := strings.TrimSpace(c.PostForm("parceiro")); v != "" {
		l.Parceiro = v
	}
	if v := strings.TrimSpace(c.PostForm("tipo_imovel")); v != "" {
		if !models.IsTipoImovelValido(v) {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "tipo_imovel deve ser 'casa' ou 'apartamento'"})
			return
		}
		l.TipoImovel = v
	}
	if v := strings.TrimSpace(c.PostForm("valor_solicitado")); v != "" {
		f, err := strconv.ParseFloat(v, 64)
		if err != nil || f <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "valor_solicitado inválido"})
			return
		}
		l.ValorSolicitado = f
	}
	if v := strings.TrimSpace(c.PostForm("valor_liberado")); v != "" {
		f, err := strconv.ParseFloat(v, 64)
		if err != nil || f < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "valor_liberado inválido"})
			return
		}
		l.ValorLiberado = &f
	}
	if v := strings.TrimSpace(c.PostForm("vencimento")); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "vencimento inválido (use YYYY-MM-DD)"})
			return
		}
		l.Vencimento = t
	}
	if v := strings.TrimSpace(c.PostForm("endereco")); v != "" {
		l.Endereco = v
	}
	if v := c.PostForm("observacoes"); v != "" {
		l.Observacoes = &v
	}

	arquivos := decodeArquivos(l.Arquivos)
	if remover := c.PostFormArray("remover_arquivos"); len(remover) > 0 {
		arquivos = removerArquivos(arquivos, remover)
	} else if v := c.PostForm("remover_arquivos"); v != "" {
		arquivos = removerArquivos(arquivos, strings.Split(v, ","))
	}

	err := h.repo.DB().WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		merged, err := mergeMultipartFiles(c, l.TenantID, l.ID, arquivos)
		if err != nil {
			return err
		}
		l.Arquivos = encodeArquivos(merged)
		return tx.Save(l).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao atualizar laudo", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Laudo atualizado com sucesso", "data": toResponse(*l, time.Now())})
}

// Delete: DELETE /api/laudos/:id.
func (h *Handler) Delete(c *gin.Context) {
	user, ok := auth.UserFrom(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Não autenticado"})
		return
	}
	l, ok := h.findOr404(c)
	if !ok {
		return
	}
	if !canManage(user, l) {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "Sem permissão para remover este laudo"})
		return
	}

	err := h.repo.DB().WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		return tx.Delete(&models.Laudo{}, l.ID).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao remover laudo", "error": err.Error()})
		return
	}
	cleanupArquivosJSON(l.Arquivos)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Laudo removido com sucesso"})
}

// DownloadArquivo: GET /api/laudos/:id/arquivo/:categoria/:filename.
func (h *Handler) DownloadArquivo(c *gin.Context) {
	l, ok := h.findOr404(c)
	if !ok {
		return
	}
	categoria := c.Param("categoria")
	filename := c.Param("filename")

	arquivos := decodeArquivos(l.Arquivos)
	files, ok := arquivos[categoria]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Categoria não encontrada"})
		return
	}
	var found *ArquivoDTO
	for i := range files {
		if files[i].Filename == filename {
			found = &files[i]
			break
		}
	}
	if found == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Arquivo não encontrado"})
		return
	}
	c.FileAttachment(found.Path, found.OriginalName)
}

// Estatisticas: GET /api/laudos/relatorios/estatisticas.
func (h *Handler) Estatisticas(c *gin.Context) {
	resp, err := h.repo.Estatisticas(c.Request.Context(), time.Now())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao calcular estatísticas", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": resp})
}

func (h *Handler) findOr404(c *gin.Context) (*models.Laudo, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "id inválido"})
		return nil, false
	}
	l, err := h.repo.FindByID(c.Request.Context(), uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Laudo não encontrado"})
			return nil, false
		}
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Erro ao buscar laudo", "error": err.Error()})
		return nil, false
	}
	return l, true
}
