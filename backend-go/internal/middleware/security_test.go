package middleware

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORSRejectsUnknownOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, production := range []bool{false, true} {
		r := gin.New()
		r.Use(CORS([]string{"https://crm.example"}, production))
		r.GET("/", func(c *gin.Context) { c.Status(http.StatusOK) })
		for _, origin := range []string{"https://crm.example", "https://attacker.example"} {
			req := httptest.NewRequest(http.MethodOptions, "/", nil)
			req.Header.Set("Origin", origin)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if origin == "https://crm.example" {
				if w.Code != http.StatusNoContent || w.Header().Get("Access-Control-Allow-Origin") != origin {
					t.Fatalf("allowed origin rejected: %d", w.Code)
				}
			} else if w.Code != http.StatusForbidden || w.Header().Get("Access-Control-Allow-Origin") != "" {
				t.Fatalf("unknown origin permitted: %d", w.Code)
			}
		}
	}
}

func TestBodyLimitRejectsOversizedRequest(t *testing.T) {
	r := gin.New()
	r.POST("/", BodyLimit(4), func(c *gin.Context) {
		if _, err := io.ReadAll(c.Request.Body); err != nil {
			c.Status(http.StatusRequestEntityTooLarge)
			return
		}
		c.Status(http.StatusOK)
	})
	for _, tc := range []struct {
		body   string
		status int
	}{{"1234", 200}, {"12345", 413}} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(tc.body)))
		if w.Code != tc.status {
			t.Fatalf("got %d, want %d", w.Code, tc.status)
		}
	}
}
