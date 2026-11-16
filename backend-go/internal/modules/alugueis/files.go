package alugueis

import (
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"

	"crmimob/internal/uploads"
	"crmimob/internal/validacao"
)

// UploadsRoot é a raiz de armazenamento local de arquivos, espelhando o
// `backend/uploads` do Node. TODO(wiring): integrar com
// internal/integrations/storage para contabilizar quota por tenant
// (04-spec não exige isso neste cluster, mas os outros clusters já usam).
// Antes era "uploads" relativo ao backend-go/, fora da raiz compartilhada:
// as fotos nunca eram servidas. Agora usa a mesma raiz dos imóveis e grava em
// imoveis/alugueis/, que já é servida em /api/uploads/imoveis (fotos de
// imóvel são públicas por natureza).
func uploadsRootDir() string { return uploads.Root() }

const subdirFotos = "imoveis/alugueis"

const maxImageBytes = 10 << 20 // 10 MB, igual às fotos de imóveis
const maxFotosAdicionais = 10

var extImagem = map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}

// conferirImagem recusa o que não é foto ou passa do limite, com mensagem
// para a pessoa (antes: .txt era aceito como foto e arquivo grande dava 500).
func conferirImagem(fh *multipart.FileHeader, campo, rotulo string) error {
	ext := strings.ToLower(filepath.Ext(fh.Filename))
	if !extImagem[ext] {
		return &validacao.ErroCampo{Campo: campo, Mensagem: rotulo + ": o arquivo \"" + fh.Filename + "\" não é uma foto. Envie JPG, PNG ou WEBP."}
	}
	if fh.Size > maxImageBytes {
		return &validacao.ErroCampo{Campo: campo, Mensagem: rotulo + ": o arquivo \"" + fh.Filename + "\" passa de 10 MB. Diminua a foto e tente de novo."}
	}
	return nil
}

// saveMultipartFile grava um *multipart.FileHeader em uploadsRoot/subdir com
// nome único (timestamp+nome original) e devolve o caminho RELATIVO a
// UploadsRoot (o mesmo formato salvo nas colunas `foto_capa`, etc).
func saveMultipartFile(fh *multipart.FileHeader, subdir string, maxBytes int64) (string, error) {
	if maxBytes > 0 && fh.Size > maxBytes {
		return "", fmt.Errorf("arquivo %s excede o limite de %d bytes", fh.Filename, maxBytes)
	}
	dir := filepath.Join(uploadsRootDir(), subdir)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	src, err := fh.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	safeName := strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '.' || r == '-' || r == '_' {
			return r
		}
		return '_'
	}, filepath.Base(fh.Filename))
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
	_ = os.Remove(filepath.Join(uploadsRootDir(), relPath))
}

// cleanupTempFiles remove arquivos de uploads/temp com mais de `olderThan`.
// POST /api/alugueis/cleanup-temp.
func cleanupTempFiles(olderThan time.Duration) (int, error) {
	dir := filepath.Join(uploadsRootDir(), "temp")
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
