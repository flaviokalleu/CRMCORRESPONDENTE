package tenants

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg" // decoders para conferir que o arquivo é imagem
	_ "image/png"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "golang.org/x/image/webp"

	"crmimob/internal/uploads"
)

// ErrLogoInvalido: extensão fora da lista ou conteúdo que não é imagem.
var ErrLogoInvalido = errors.New("logo não é imagem PNG/JPG/WEBP")

// saveLogo grava o logo em uploads/tenants/{tenantId}/logo_{timestamp}{ext},
// removendo o antigo se existir (equivalente ao Node — ver 01-spec §2.4).
func saveLogo(tenantID uint, fh *multipart.FileHeader) (string, error) {
	if fh == nil || fh.Size <= 0 || fh.Size > 5*1024*1024 {
		return "", fmt.Errorf("logo inválido ou excede 5MB")
	}
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	if !map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}[ext] {
		return "", ErrLogoInvalido
	}
	// Confere o conteúdo: um texto renomeado para .png era gravado e servido.
	src0, err := fh.Open()
	if err != nil {
		return "", err
	}
	cabeca, _ := io.ReadAll(io.LimitReader(src0, 5*1024*1024+1))
	src0.Close()
	if _, _, err := image.DecodeConfig(bytes.NewReader(cabeca)); err != nil {
		return "", ErrLogoInvalido
	}
	// Mesma raiz que o router serve em /api/uploads/tenants. Antes a pasta era
	// relativa ao processo (backend-go/uploads), e o logo enviado não abria.
	dir := filepath.Join(uploads.Root(), "tenants", fmt.Sprintf("%d", tenantID))
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
