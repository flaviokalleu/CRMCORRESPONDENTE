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
	if fh == nil || fh.Size <= 0 || fh.Size > 5*1024*1024 {
		return "", fmt.Errorf("logo inválido ou excede 5MB")
	}
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	if !map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}[ext] {
		return "", fmt.Errorf("formato de logo não permitido")
	}
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

	if _, err := io.Copy(out, io.LimitReader(src, 5*1024*1024+1)); err != nil {
		return "", err
	}
	if info, err := out.Stat(); err != nil || info.Size() > 5*1024*1024 {
		_ = os.Remove(dst)
		return "", fmt.Errorf("logo excede 5MB")
	}
	return "/uploads/tenants/" + fmt.Sprintf("%d", tenantID) + "/" + filename, nil
}
