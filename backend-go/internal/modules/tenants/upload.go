package tenants

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// saveLogo grava o logo em uploads/tenants/{tenantId}/logo_{timestamp}{ext},
// removendo o antigo se existir (equivalente ao Node — ver 01-spec §2.4).
func saveLogo(tenantID uint, fh *multipart.FileHeader) (string, error) {
	dir := filepath.Join("uploads", "tenants", fmt.Sprintf("%d", tenantID))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	// Remove logos antigos (qualquer arquivo logo_*).
	if entries, err := os.ReadDir(dir); err == nil {
		for _, e := range entries {
			if strings.HasPrefix(e.Name(), "logo_") {
				_ = os.Remove(filepath.Join(dir, e.Name()))
			}
		}
	}

	ext := strings.ToLower(filepath.Ext(fh.Filename))
	if ext == "" {
		ext = ".png"
	}
	filename := fmt.Sprintf("logo_%d%s", time.Now().UnixMilli(), ext)
	dst := filepath.Join(dir, filename)

	src, err := fh.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	out, err := os.Create(dst)
	if err != nil {
		return "", err
	}
	defer out.Close()

	if _, err := io.Copy(out, src); err != nil {
		return "", err
	}
	return "/uploads/tenants/" + fmt.Sprintf("%d", tenantID) + "/" + filename, nil
}
