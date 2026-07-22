package acessos

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// RegisterRoutes monta /api/acessos (sem auth no mount hoje — §2.6/§6.6,
// divergência de segurança documentada).
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	g := rg.Group("/acessos")
	{
		g.POST("", h.Create)
		g.GET("", h.List)
		g.GET("/stats", h.Stats)
		g.GET("/realtime", h.Realtime)
		g.GET("/user/:userId", h.ByUser)
	}
}

type createRequest struct {
	Referer string `json:"referer"`
	UserID  *uint  `json:"userId"`
	Page    string `json:"page"`
}

func (h *Handler) Create(c *gin.Context) {
	var req createRequest
	_ = c.ShouldBindJSON(&req) // corpo tolerante — todos os campos são opcionais no Node

	a, err := h.svc.Create(c.Request.Context(), CreateInput{
		IP:        c.ClientIP(),
		Referer:   req.Referer,
		Page:      req.Page,
		UserAgent: c.GetHeader("User-Agent"),
		UserID:    req.UserID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao registrar acesso"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Acesso registrado", "id": a.ID, "timestamp": a.Timestamp})
}

func (h *Handler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	f := ListFilters{
		Page: page, Limit: limit,
		Country:    c.Query("country"),
		UserID:     c.Query("userId"),
		DeviceType: c.Query("deviceType"),
		Search:     c.Query("search"),
	}
	if v := c.Query("startDate"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			f.StartDate = &t
		}
	}
	if v := c.Query("endDate"); v != "" {
		if t, err := time.Parse("2006-01-02", v); err == nil {
			f.EndDate = &t
		}
	}

	list, total, err := h.svc.List(c.Request.Context(), f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao listar acessos"})
		return
	}
	lim := f.Limit
	if lim < 1 {
		lim = 20
	}
	pg := f.Page
	if pg < 1 {
		pg = 1
	}
	c.JSON(http.StatusOK, gin.H{
		"acessos": list,
		"pagination": gin.H{
			"total": total, "page": pg, "limit": lim,
			"pages": int((total + int64(lim) - 1) / int64(lim)),
		},
	})
}

func (h *Handler) Stats(c *gin.Context) {
	period := c.DefaultQuery("period", "24h")
	stats, err := h.svc.Stats(c.Request.Context(), period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao calcular estatísticas"})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *Handler) Realtime(c *gin.Context) {
	list, err := h.svc.Realtime(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar acessos em tempo real"})
		return
	}
	usuarios := map[uint]bool{}
	for _, a := range list {
		if a.UserID != nil {
			usuarios[*a.UserID] = true
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"usuariosOnline":  len(usuarios),
		"acessosRecentes": list,
		"timestamp":       time.Now(),
	})
}

func (h *Handler) ByUser(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("userId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId inválido"})
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	list, total, err := h.svc.ByUser(c.Request.Context(), uint(userID), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar acessos do usuário"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"acessos": list,
		"pagination": gin.H{
			"total": total, "page": page, "limit": limit,
		},
		"estatisticas": gin.H{"totalAcessos": total},
	})
}
