package portalinquilino

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestLegacyCPFTokenCannotAccessPortal(t *testing.T) {
	gin.SetMode(gin.TestMode)
	auth := NewAuthService("test-only-secret")
	token, err := auth.GenerateToken(123, "Teste")
	if err != nil {
		t.Fatal(err)
	}
	r := gin.New()
	r.GET("/portal", auth.Required(), func(c *gin.Context) { t.Fatal("legacy token reached private data") })
	req := httptest.NewRequest(http.MethodGet, "/portal", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("got %d", w.Code)
	}
}
