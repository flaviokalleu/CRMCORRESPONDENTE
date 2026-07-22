package alugueis

import (
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// UploadsRoot é a raiz de armazenamento local de arquivos, espelhando o
// `backend/uploads` do Node. TODO(wiring): integrar com
// internal/integrations/storage para contabilizar quota por tenant
// (04-spec não exige isso neste cluster, mas os outros clusters já usam).
var UploadsRoot = "uploads"

const maxImageBytes = 5 << 20 // 5MB, igual ao multer de alugueis.js

// saveMultipartFile grava um *multipart.FileHeader em uploadsRoot/subdir com
// nome único (timestamp+nome original) e devolve o caminho RELATIVO a
// UploadsRoot (o mesmo formato salvo nas colunas `foto_capa`, etc).
func saveMultipartFile(fh *multipart.FileHeader, subdir string, maxBytes int64) (string, error) {
	if maxBytes > 0 && fh.Size > maxBytes {
		return "", fmt.Errorf("arquivo %s excede o limite de %d bytes", fh.Filename, maxBytes)
	}
	dir := filepath.Join(UploadsRoot, subdir)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	src, err := fh.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	safeName := strings.ReplaceAll(filepath.Base(fh.Filename), " ", "_")
	name := fmt.Sprintf("%d_%s", time.Now().UnixNano(), safeName)
	dstPath := filepath.Join(dir, name)
	dst, err := os.Create(dstPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	buf := make([]byte, 32*1024)
	for {
		n, readErr := src.Read(buf)
		if n > 0 {
			if _, err := dst.Write(buf[:n]); err != nil {
				return "", err
			}
		}
		if readErr != nil {
			break
		}
	}
	return filepath.ToSlash(filepath.Join(subdir, name)), nil
}

// removeUploadedFile apaga um arquivo relativo a UploadsRoot; ignora ausência.
func removeUploadedFile(relPath string) {
	if relPath == "" {
		return
	}
	_ = os.Remove(filepath.Join(UploadsRoot, relPath))
}

// cleanupTempFiles remove arquivos de uploads/temp com mais de `olderThan`.
// POST /api/alugueis/cleanup-temp.
func cleanupTempFiles(olderThan time.Duration) (int, error) {
	dir := filepath.Join(UploadsRoot, "temp")
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, err
	}
	removed := 0
	cutoff := time.Now().Add(-olderThan)
	for _, e := range entries {
		info, err := e.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			if err := os.Remove(filepath.Join(dir, e.Name())); err == nil {
				removed++
			}
		}
	}
	return removed, nil
}

// parseCurrencyValue replica `parseCurrencyValue` do Node: limpa "R$",
// separador de milhar "." e troca "," decimal por ".".
func parseCurrencyValue(raw string) (float64, error) {
	s := strings.TrimSpace(raw)
	s = strings.ReplaceAll(s, "R$", "")
	s = strings.TrimSpace(s)
	// Remove separador de milhar (ponto) apenas quando há vírgula decimal.
	if strings.Contains(s, ",") {
		s = strings.ReplaceAll(s, ".", "")
		s = strings.ReplaceAll(s, ",", ".")
	}
	s = strings.ReplaceAll(s, " ", "")
	if s == "" {
		return 0, fmt.Errorf("valor vazio")
	}
	return strconv.ParseFloat(s, 64)
}

// formFile busca um único arquivo do multipart form pelo nome do campo;
// devolve (nil, nil) quando o campo não foi enviado (não é erro).
func formFile(c *gin.Context, field string) (*multipart.FileHeader, error) {
	form, err := c.MultipartForm()
	if err != nil {
		return nil, nil // sem multipart (ex.: JSON puro) — não é erro fatal aqui
	}
	files := form.File[field]
	if len(files) == 0 {
		return nil, nil
	}
	return files[0], nil
}

func formFiles(c *gin.Context, field string) ([]*multipart.FileHeader, error) {
	form, err := c.MultipartForm()
	if err != nil {
		return nil, nil
	}
	return form.File[field], nil
}
