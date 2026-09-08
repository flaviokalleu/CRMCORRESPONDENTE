package media

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"testing"
)

// pngGrande imita um documento digitalizado: fundo claro, blocos escuros no
// lugar do texto e um ruído fino de sensor por cima.
//
// O ruído é o que torna o teste honesto. Sem ele o PNG comprime a poucos KB
// (padrão perfeitamente regular) e o JPEG sai maior, exercitando só o ramo de
// "não inchar" — que é justamente o outro teste. Um scan real não comprime
// assim, e é o caso de redução que precisamos cobrir aqui.
func pngGrande(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 3000, 2000))
	semente := uint32(12345)
	proximo := func() uint32 { // congruencial linear — determinístico entre execuções
		semente = semente*1664525 + 1013904223
		return semente >> 16
	}
	for y := 0; y < 2000; y++ {
		for x := 0; x < 3000; x++ {
			v := uint8(238) // papel
			if (y/60)%3 == 0 && x > 200 && x < 2800 && (x/7+y/60)%5 != 0 {
				v = 40 // linha de texto
			}
			ruido := int(proximo()%13) - 6
			c := int(v) + ruido
			if c < 0 {
				c = 0
			} else if c > 255 {
				c = 255
			}
			img.Set(x, y, color.RGBA{uint8(c), uint8(c), uint8(c), 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestOtimizarImagemReduzEReorienta(t *testing.T) {
	entrada := pngGrande(t)
	res, err := Otimizar(entrada, "scan.png", PerfilDocumento)
	if err != nil {
		t.Fatalf("Otimizar: %v", err)
	}
	if res.Mime != "image/jpeg" || res.Extensao != ".jpg" {
		t.Fatalf("esperava jpeg, veio %s %s", res.Mime, res.Extensao)
	}
	if len(res.Bytes) >= len(entrada) {
		t.Fatalf("nao reduziu: %d -> %d", len(entrada), len(res.Bytes))
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(res.Bytes))
	if err != nil {
		t.Fatalf("saida ilegivel: %v", err)
	}
	if cfg.Width != 2200 {
		t.Fatalf("lado maior deveria virar 2200, veio %d", cfg.Width)
	}
	t.Logf("%d bytes -> %d bytes (-%.1f%%), %dx%d",
		len(entrada), len(res.Bytes), res.Economia(), cfg.Width, cfg.Height)
}

func TestOtimizarNaoInchaArquivoJaPequeno(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 8, 8))
	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	entrada := buf.Bytes()
	res, err := Otimizar(entrada, "mini.png", PerfilDocumento)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Bytes) > len(entrada) {
		t.Fatalf("inchou: %d -> %d", len(entrada), len(res.Bytes))
	}
}

func TestEhPDF(t *testing.T) {
	if !ehPDF([]byte("%PDF-1.7\n...")) {
		t.Fatal("deveria detectar PDF")
	}
	if ehPDF([]byte("\x89PNG\r\n")) {
		t.Fatal("PNG nao e PDF")
	}
}

func TestConstruirPDFMisturaImagensEPDFs(t *testing.T) {
	dir := t.TempDir()

	// duas imagens otimizadas, como sairiam do upload
	for i, nome := range []string{"pagina1.jpg", "pagina2.jpg"} {
		res, err := Otimizar(pngGrande(t), nome, PerfilDocumento)
		if err != nil {
			t.Fatalf("otimizar %d: %v", i, err)
		}
		if err := os.WriteFile(filepath.Join(dir, nome), res.Bytes, 0o644); err != nil {
			t.Fatal(err)
		}
	}

	// um PDF de 2 páginas, montado a partir das mesmas imagens
	pdfAux := filepath.Join(dir, "anexo.pdf")
	if _, _, err := ConstruirPDF([]string{
		filepath.Join(dir, "pagina1.jpg"), filepath.Join(dir, "pagina2.jpg"),
	}, pdfAux); err != nil {
		t.Fatalf("montar anexo: %v", err)
	}

	destino := filepath.Join(dir, "consolidado.pdf")
	paginas, ignorados, err := ConstruirPDF([]string{
		filepath.Join(dir, "pagina1.jpg"),
		pdfAux,
		filepath.Join(dir, "pagina2.jpg"),
	}, destino)
	if err != nil {
		t.Fatalf("ConstruirPDF: %v", err)
	}
	if len(ignorados) != 0 {
		t.Fatalf("nada deveria ser ignorado, veio %v", ignorados)
	}
	if paginas != 4 { // 1 imagem + 2 do PDF + 1 imagem
		t.Fatalf("esperava 4 paginas, veio %d", paginas)
	}
	t.Logf("consolidado com %d paginas", paginas)

	// extrair uma pagina devolve um PDF de 1 pagina
	buf, err := ExtrairPagina(destino, 3)
	if err != nil {
		t.Fatalf("ExtrairPagina: %v", err)
	}
	if !ehPDF(buf) {
		t.Fatal("saida de ExtrairPagina nao e PDF")
	}
	umaPagina := filepath.Join(dir, "p3.pdf")
	_ = os.WriteFile(umaPagina, buf, 0o644)
	if n, err := ContarPaginasArquivo(umaPagina); err != nil || n != 1 {
		t.Fatalf("pagina extraida deveria ter 1 pagina, veio %d (%v)", n, err)
	}
}

func TestConstruirPDFIgnoraArquivoIlegivel(t *testing.T) {
	dir := t.TempDir()
	bom := filepath.Join(dir, "bom.jpg")
	res, _ := Otimizar(pngGrande(t), "bom.jpg", PerfilDocumento)
	_ = os.WriteFile(bom, res.Bytes, 0o644)
	ruim := filepath.Join(dir, "corrompido.jpg")
	_ = os.WriteFile(ruim, []byte("isto nao e imagem nem pdf"), 0o644)

	destino := filepath.Join(dir, "out.pdf")
	paginas, ignorados, err := ConstruirPDF([]string{bom, ruim}, destino)
	if err != nil {
		t.Fatalf("nao deveria falhar por causa de 1 arquivo ruim: %v", err)
	}
	if paginas != 1 {
		t.Fatalf("esperava 1 pagina, veio %d", paginas)
	}
	if len(ignorados) != 1 || ignorados[0] != "corrompido.jpg" {
		t.Fatalf("deveria reportar o arquivo ruim, veio %v", ignorados)
	}
}
