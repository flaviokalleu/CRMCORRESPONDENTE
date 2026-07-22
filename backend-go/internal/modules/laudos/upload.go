package laudos

import (
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

// UploadDir é a pasta de destino dos arquivos de laudo. Correção deliberada
// (gotcha §8): o Node salvava em `uploads/clientes/` (mesma pasta de
// documentos de cliente) — aqui usamos uma pasta dedicada.
const UploadDir = "uploads/laudos"

// saveMultipartFiles grava os arquivos de um campo multipart em disco e
// devolve os metadados a persistir no JSONB `arquivos`. Em caso de falha no
// meio do processo, os arquivos já gravados desta chamada são removidos
// (cleanup local) — o cleanup completo de arquivos órfãos de todo o request
// é responsabilidade do chamador (ver cleanupFiles).
func saveMultipartFiles(tenantID uint, laudoID uint, categoria string, files []*multipart.FileHeader) ([]ArquivoDTO, error) {
	dir := filepath.Join(UploadDir, fmt.Sprintf("tenant_%d", tenantID), fmt.Sprintf("laudo_%d", laudoID))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("criar diretório de upload: %w", err)
	}

	var saved []ArquivoDTO
	for _, fh := range files {
		safeName := sanitizeFilename(fh.Filename)
		filename := fmt.Sprintf("%d_%s_%s", time.Now().UnixNano(), categoria, safeName)
		dest := filepath.Join(dir, filename)

		if err := saveMultipartFile(fh, dest); err != nil {
			cleanupFiles(saved)
			return nil, fmt.Errorf("salvar arquivo %q: %w", fh.Filename, err)
		}

		saved = append(saved, ArquivoDTO{
			Filename:     filename,
			OriginalName: fh.Filename,
			Path:         dest,
			Size:         fh.Size,
			MimeType:     fh.Header.Get("Content-Type"),
		})
	}
	return saved, nil
}

func saveMultipartFile(fh *multipart.FileHeader, dest string) error {
	src, err := fh.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, src)
	return err
}

func sanitizeFilename(name string) string {
	name = filepath.Base(name)
	replacer := strings.NewReplacer(" ", "_", "/", "_", "\\", "_")
	return replacer.Replace(name)
}

// cleanupFiles remove do disco os arquivos físicos referenciados (usado em
// falha de transação ou remoção de categoria/laudo — equivalente a
// `cleanupAllTempFiles` do Node).
func cleanupFiles(files []ArquivoDTO) {
	for _, f := range files {
		_ = os.Remove(f.Path)
	}
}

// cleanupArquivosJSON remove do disco TODOS os arquivos referenciados num
// JSONB `arquivos` (todas as categorias) — usado ao deletar um laudo.
func cleanupArquivosJSON(raw datatypes.JSON) {
	m := decodeArquivos(raw)
	for _, files := range m {
		cleanupFiles(files)
	}
}

// decodeArquivos desserializa o JSONB `arquivos` em map[categoria][]ArquivoDTO.
func decodeArquivos(raw datatypes.JSON) map[string][]ArquivoDTO {
	out := map[string][]ArquivoDTO{}
	if len(raw) == 0 {
		return out
	}
	_ = json.Unmarshal(raw, &out)
	return out
}

func encodeArquivos(m map[string][]ArquivoDTO) datatypes.JSON {
	b, _ := json.Marshal(m)
	return datatypes.JSON(b)
}

// mergeMultipartFiles extrai todos os campos de arquivo do multipart form
// (qualquer fieldname vira uma "categoria") e devolve o mapa combinado com os
// metadados já persistidos, gravando os novos arquivos em disco.
func mergeMultipartFiles(c *gin.Context, tenantID, laudoID uint, existing map[string][]ArquivoDTO) (map[string][]ArquivoDTO, error) {
	form, err := c.MultipartForm()
	if err != nil {
		// Sem multipart (ex.: PUT só com campos de texto) — não é erro.
		return existing, nil
	}
	out := existing
	if out == nil {
		out = map[string][]ArquivoDTO{}
	}
	for categoria, files := range form.File {
		saved, err := saveMultipartFiles(tenantID, laudoID, categoria, files)
		if err != nil {
			return nil, err
		}
		out[categoria] = append(out[categoria], saved...)
	}
	return out, nil
}

// removerArquivos remove do JSONB e do disco os arquivos indicados por
// "categoria/filename" (parâmetro `remover_arquivos` do PUT, formato CSV ou
// JSON array de strings).
func removerArquivos(arquivos map[string][]ArquivoDTO, refs []string) map[string][]ArquivoDTO {
	for _, ref := range refs {
		parts := strings.SplitN(ref, "/", 2)
		if len(parts) != 2 {
			continue
		}
		categoria, filename := parts[0], parts[1]
		list, ok := arquivos[categoria]
		if !ok {
			continue
		}
		filtered := list[:0]
		for _, f := range list {
			if f.Filename == filename {
				_ = os.Remove(f.Path)
				continue
			}
			filtered = append(filtered, f)
		}
		arquivos[categoria] = filtered
	}
	return arquivos
}
