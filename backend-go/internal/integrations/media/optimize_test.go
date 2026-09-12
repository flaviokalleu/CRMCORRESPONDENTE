package media

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"math"
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

// printDeTela imita um print do sistema do banco: fundo liso, poucas cores de
// marca e linhas finas de tabela — exatamente o caso que o JPEG borra (linha
// de 1px vira mancha) e que cabe fácil numa paleta de 256 cores, porque um
// print de UI real usa poucas cores de verdade (só 4 aqui, de propósito).
func printDeTela(t *testing.T) []byte {
	t.Helper()
	largura, altura := 900, 500
	img := image.NewRGBA(image.Rect(0, 0, largura, altura))
	fundo := color.RGBA{250, 250, 252, 255}
	linha := color.RGBA{200, 200, 205, 255}
	texto := color.RGBA{30, 30, 35, 255}
	destaque := color.RGBA{10, 90, 200, 255}
	for y := 0; y < altura; y++ {
		for x := 0; x < largura; x++ {
			c := fundo
			switch {
			case y%40 == 0: // borda de linha de tabela, 1px
				c = linha
			case y%40 > 5 && y%40 < 8 && x > 20 && x < largura-20: // texto fino
				c = texto
			case x > largura-120 && x < largura-20 && y > 10 && y < 34: // botão
				c = destaque
			}
			img.Set(x, y, c)
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestPerfilFotoDimensionaParaTelaCheia(t *testing.T) {
	entrada := pngGrande(t) // 3000x2000
	res, err := Otimizar(entrada, "imovel.png", PerfilFoto)
	if err != nil {
		t.Fatalf("Otimizar: %v", err)
	}
	if res.Mime != "image/jpeg" || res.Extensao != ".jpg" {
		t.Fatalf("esperava jpeg, veio %s %s", res.Mime, res.Extensao)
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(res.Bytes))
	if err != nil {
		t.Fatalf("saida ilegivel: %v", err)
	}
	if cfg.Width != 1920 {
		t.Fatalf("lado maior deveria virar 1920, veio %d", cfg.Width)
	}
	if len(res.Bytes) >= len(entrada) {
		t.Fatalf("nao reduziu: %d -> %d", len(entrada), len(res.Bytes))
	}
	t.Logf("%d bytes -> %d bytes (-%.1f%%), %dx%d",
		len(entrada), len(res.Bytes), res.Economia(), cfg.Width, cfg.Height)
}

func TestPerfilAvatarDimensionaParaMiniatura(t *testing.T) {
	entrada := pngGrande(t)
	res, err := Otimizar(entrada, "avatar.png", PerfilAvatar)
	if err != nil {
		t.Fatalf("Otimizar: %v", err)
	}
	if res.Mime != "image/jpeg" || res.Extensao != ".jpg" {
		t.Fatalf("esperava jpeg, veio %s %s", res.Mime, res.Extensao)
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(res.Bytes))
	if err != nil {
		t.Fatalf("saida ilegivel: %v", err)
	}
	if cfg.Width != 320 {
		t.Fatalf("lado maior deveria virar 320, veio %d", cfg.Width)
	}
	if len(res.Bytes) >= len(entrada) {
		t.Fatalf("nao reduziu: %d -> %d", len(entrada), len(res.Bytes))
	}
	t.Logf("%d bytes -> %d bytes (-%.1f%%), %dx%d",
		len(entrada), len(res.Bytes), res.Economia(), cfg.Width, cfg.Height)
}

// TestPerfilPrintSemPerda mede, pixel a pixel, que o perfil de print de tela
// não descarta informação nenhuma — só reduzir a compressão do JPEG (em vez
// de trocar para PNG) não passaria neste teste, porque JPEG sempre perde algo.
func TestPerfilPrintSemPerda(t *testing.T) {
	entrada := printDeTela(t)
	res, err := Otimizar(entrada, "print.png", PerfilPrint)
	if err != nil {
		t.Fatalf("Otimizar: %v", err)
	}
	if res.Mime != "image/png" || res.Extensao != ".png" {
		t.Fatalf("esperava png, veio %s %s", res.Mime, res.Extensao)
	}

	original, _, err := image.Decode(bytes.NewReader(entrada))
	if err != nil {
		t.Fatalf("decodificar entrada: %v", err)
	}
	saida, _, err := image.Decode(bytes.NewReader(res.Bytes))
	if err != nil {
		t.Fatalf("decodificar saida: %v", err)
	}
	if saida.Bounds() != original.Bounds() {
		t.Fatalf("dimensao mudou: %v -> %v", original.Bounds(), saida.Bounds())
	}

	b := original.Bounds()
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			co := color.NRGBAModel.Convert(original.At(x, y))
			cs := color.NRGBAModel.Convert(saida.At(x, y))
			if co != cs {
				t.Fatalf("pixel (%d,%d) mudou: %v -> %v", x, y, co, cs)
			}
		}
	}
	t.Logf("%d bytes -> %d bytes (-%.1f%%), sem perder 1 pixel",
		len(entrada), len(res.Bytes), res.Economia())
}

// TestPerfilLogoPreservaAlfa confere que a transparência sobrevive de fato —
// não que a imagem virou PNG, mas que o valor de alfa de cada faixa (0,
// parcial, opaco) chega intacto na saída.
func TestPerfilLogoPreservaAlfa(t *testing.T) {
	largura, altura := 200, 120
	img := image.NewNRGBA(image.Rect(0, 0, largura, altura))
	for y := 0; y < altura; y++ {
		for x := 0; x < largura; x++ {
			switch {
			case x < largura/3:
				img.Set(x, y, color.NRGBA{0, 0, 0, 0}) // totalmente transparente
			case x < 2*largura/3:
				img.Set(x, y, color.NRGBA{20, 90, 200, 160}) // semitransparente
			default:
				img.Set(x, y, color.NRGBA{20, 90, 200, 255}) // opaco
			}
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	entrada := buf.Bytes()

	res, err := Otimizar(entrada, "logo.png", PerfilLogo)
	if err != nil {
		t.Fatalf("Otimizar: %v", err)
	}
	if res.Mime != "image/png" || res.Extensao != ".png" {
		t.Fatalf("esperava png, veio %s %s", res.Mime, res.Extensao)
	}

	saida, _, err := image.Decode(bytes.NewReader(res.Bytes))
	if err != nil {
		t.Fatalf("decodificar saida: %v", err)
	}

	casos := []struct {
		x, y         int
		alfaEsperado uint8
	}{
		{10, 10, 0},
		{largura / 2, 10, 160},
		{largura - 10, 10, 255},
	}
	for _, c := range casos {
		got := color.NRGBAModel.Convert(saida.At(c.x, c.y)).(color.NRGBA)
		if got.A != c.alfaEsperado {
			t.Fatalf("pixel (%d,%d): alfa esperado %d, veio %d", c.x, c.y, c.alfaEsperado, got.A)
		}
	}
}

// logoGrandeComBordaSemitransparente desenha um círculo vermelho opaco cercado
// por um anel de antialiasing (alfa caindo de 255 a 0 mantendo o matiz
// vermelho) sobre fundo totalmente transparente com cor "zero" (preto) — o
// jeito como qualquer ferramenta de design exporta um logo em PNG, e
// exatamente o cenário em que resize ingênuo (que ignora o alfa ao interpolar
// R/G/B) mistura o preto do fundo transparente na borda e escurece o traço.
func logoGrandeComBordaSemitransparente(t *testing.T, lado int) []byte {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, lado, lado))
	centro := float64(lado) / 2
	raio := float64(lado) / 3
	faixa := float64(lado) / 24 // anel de antialiasing ao redor do círculo
	for y := 0; y < lado; y++ {
		for x := 0; x < lado; x++ {
			dx, dy := float64(x)-centro, float64(y)-centro
			d := math.Sqrt(dx*dx + dy*dy)
			switch {
			case d <= raio:
				img.Set(x, y, color.NRGBA{220, 30, 30, 255})
			case d <= raio+faixa:
				t := (d - raio) / faixa
				a := uint8((1 - t) * 255)
				img.Set(x, y, color.NRGBA{220, 30, 30, a})
			}
			// fora do anel: fica no zero-value do NRGBA, ou seja
			// color.NRGBA{0,0,0,0} — transparente com "preto" na cor, o pior
			// caso para vazamento de cor no resize.
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

// TestPerfilLogoRedimensionaSemFranjaNaBordaSemitransparente cobre o caso que
// TestPerfilLogoPreservaAlfa não cobre: uma logo MAIOR que PerfilLogo.LadoMaior
// (1024), que por isso passa pelo imaging.Resize (Lanczos) antes de virar PNG.
//
// A dúvida era se o resize, rodando sobre NRGBA não pré-multiplicado, vaza a
// cor "preta" do fundo transparente para dentro da borda semitransparente
// vermelha (a franja clássica de resize que ignora alfa). Medido pixel a
// pixel: não vaza. O pacote disintegration/imaging pesa cada amostra pelo
// próprio alfa dela antes de somar R/G/B e só divide pelo alfa acumulado no
// fim (ver resizeHorizontal/resizeVertical em resize.go) — isso é
// matematicamente equivalente a pré-multiplicar, interpolar e depois
// des-premultiplicar, então um pixel 100% transparente contribui peso zero
// para a cor do vizinho, não a cor "preta" que ele carrega no campo RGB.
// Por isso este teste fica como prova de comportamento (green a mostrar que
// não há franja), não como correção — se a biblioteca mudar esse detalhe de
// implementação, este teste é quem avisa.
func TestPerfilLogoRedimensionaSemFranjaNaBordaSemitransparente(t *testing.T) {
	const ladoOriginal = 2048 // maior que PerfilLogo.LadoMaior (1024): força o resize
	entrada := logoGrandeComBordaSemitransparente(t, ladoOriginal)

	res, err := Otimizar(entrada, "logo-grande.png", PerfilLogo)
	if err != nil {
		t.Fatalf("Otimizar: %v", err)
	}
	if res.Mime != "image/png" || res.Extensao != ".png" {
		t.Fatalf("esperava png, veio %s %s", res.Mime, res.Extensao)
	}

	saida, _, err := image.Decode(bytes.NewReader(res.Bytes))
	if err != nil {
		t.Fatalf("decodificar saida: %v", err)
	}
	b := saida.Bounds()
	if b.Dx() != 1024 || b.Dy() != 1024 {
		t.Fatalf("esperava resize para 1024x1024, veio %dx%d", b.Dx(), b.Dy())
	}

	achouSemitransparente := false
	achouTransparente := false
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			c := color.NRGBAModel.Convert(saida.At(x, y)).(color.NRGBA)
			switch c.A {
			case 0:
				achouTransparente = true
			case 255:
				// pixel opaco dentro do círculo: nada a medir aqui.
			default:
				achouSemitransparente = true
				// franja = a cor deixa de ser vermelho-dominante e escurece
				// rumo ao cinza/preto do fundo transparente vazando.
				if c.R <= c.G || c.R <= c.B {
					t.Fatalf(
						"franja na borda semitransparente: pixel (%d,%d) alfa=%d cor=%v (deveria continuar vermelho-dominante)",
						x, y, c.A, c,
					)
				}
			}
		}
	}
	if !achouSemitransparente {
		t.Fatal("teste nao encontrou pixel semitransparente na saida - fixture nao exercita o caso")
	}
	if !achouTransparente {
		t.Fatal("teste nao encontrou pixel totalmente transparente na saida - fixture nao exercita o caso")
	}
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
	consolidado, err := os.ReadFile(destino)
	if err != nil {
		t.Fatal(err)
	}
	buf, err := ExtrairPagina(consolidado, 3)
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

// TestOtimizarPDFRecomprimeImagemEmbutida mede o caso que api.Optimize
// sozinho quase não ajuda: um PDF cuja página inteira é uma imagem
// digitalizada. O ganho real tem que vir da recompressão da imagem embutida,
// não só da desduplicação de objetos.
func TestOtimizarPDFRecomprimeImagemEmbutida(t *testing.T) {
	dir := t.TempDir()

	imgPath := filepath.Join(dir, "scan.png")
	if err := os.WriteFile(imgPath, pngGrande(t), 0o644); err != nil {
		t.Fatal(err)
	}

	pdfPath := filepath.Join(dir, "doc.pdf")
	if _, _, err := ConstruirPDF([]string{imgPath}, pdfPath); err != nil {
		t.Fatalf("montar pdf: %v", err)
	}
	original, err := os.ReadFile(pdfPath)
	if err != nil {
		t.Fatal(err)
	}
	paginasAntes, err := ContarPaginasArquivo(pdfPath)
	if err != nil {
		t.Fatalf("contar paginas antes: %v", err)
	}

	res, err := Otimizar(original, "doc.pdf", PerfilDocumento)
	if err != nil {
		t.Fatalf("Otimizar: %v", err)
	}
	if res.Mime != "application/pdf" || res.Extensao != ".pdf" {
		t.Fatalf("esperava pdf, veio %s %s", res.Mime, res.Extensao)
	}
	if len(res.Bytes) >= len(original) {
		t.Fatalf("pdf nao encolheu: %d -> %d", len(original), len(res.Bytes))
	}
	if res.Paginas != paginasAntes {
		t.Fatalf("Resultado.Paginas errado: esperava %d, veio %d", paginasAntes, res.Paginas)
	}

	// o resultado tem que continuar sendo um PDF válido e legível pelo
	// próprio pdfcpu, com o mesmo número de páginas de antes.
	saida := filepath.Join(dir, "out.pdf")
	if err := os.WriteFile(saida, res.Bytes, 0o644); err != nil {
		t.Fatal(err)
	}
	paginasDepois, err := ContarPaginasArquivo(saida)
	if err != nil {
		t.Fatalf("pdf otimizado nao abre no pdfcpu: %v", err)
	}
	if paginasDepois != paginasAntes {
		t.Fatalf("numero de paginas mudou: %d -> %d", paginasAntes, paginasDepois)
	}

	t.Logf("%d bytes -> %d bytes (-%.1f%%), %d pagina(s)",
		len(original), len(res.Bytes), res.Economia(), paginasDepois)
}

// pdfComImagemMinima monta um PDF de 1 página cuja imagem embutida é 8x8
// preto — já praticamente incompressível (igual ao caso já coberto para
// imagem solta em TestOtimizarNaoInchaArquivoJaPequeno) e pequena o bastante
// para o overhead fixo de cabeçalho/tabela Huffman do JPEG garantir que
// recomprimi-la fica maior que o stream original. Serve de fixture para as
// duas guardas de "não encolheu, devolve a entrada".
func pdfComImagemMinima(t *testing.T) []byte {
	t.Helper()
	dir := t.TempDir()

	imgPath := filepath.Join(dir, "mini.png")
	mini := image.NewRGBA(image.Rect(0, 0, 8, 8))
	var buf bytes.Buffer
	if err := png.Encode(&buf, mini); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(imgPath, buf.Bytes(), 0o644); err != nil {
		t.Fatal(err)
	}

	pdfPath := filepath.Join(dir, "mini.pdf")
	if _, _, err := ConstruirPDF([]string{imgPath}, pdfPath); err != nil {
		t.Fatalf("montar pdf: %v", err)
	}
	entrada, err := os.ReadFile(pdfPath)
	if err != nil {
		t.Fatal(err)
	}
	return entrada
}

// TestRecomprimirImagensPDFSemGanhoDevolveEntradaIntacta prova a guarda de
// recomprimirImagensPDF (optimize.go): quando a recompressão de nenhuma
// imagem embutida ganha nada, a função devolve a entrada byte a byte, não uma
// reescrita "equivalente" do pdfcpu.
func TestRecomprimirImagensPDFSemGanhoDevolveEntradaIntacta(t *testing.T) {
	entrada := pdfComImagemMinima(t)

	saida := recomprimirImagensPDF(entrada)
	if !bytes.Equal(saida, entrada) {
		t.Fatalf(
			"recomprimirImagensPDF deveria devolver a entrada intacta quando nao ha ganho: %d bytes -> %d bytes, e sao diferentes",
			len(entrada), len(saida),
		)
	}
}

// TestOtimizarPDFSemGanhoDevolveEntradaIntacta prova a guarda de otimizarPDF
// (optimize.go:292-322) isolada de recomprimirImagensPDF: mesmo quando
// api.Optimize sozinho não encolhe o PDF — medido diretamente, esse PDF
// mínimo de 1197 bytes vira 1198 depois de api.Optimize, ou seja, CRESCE — e
// a recompressão da imagem embutida também não ajuda (ver teste acima), o
// resultado final tem que ser exatamente a entrada, não a versão levemente
// maior que api.Optimize produziu.
func TestOtimizarPDFSemGanhoDevolveEntradaIntacta(t *testing.T) {
	entrada := pdfComImagemMinima(t)

	saida, _, err := otimizarPDF(entrada)
	if err != nil {
		t.Fatalf("otimizarPDF nao deveria falhar: %v", err)
	}
	if !bytes.Equal(saida, entrada) {
		t.Fatalf(
			"otimizarPDF deveria devolver a entrada intacta quando nada encolhe: %d bytes -> %d bytes, e sao diferentes",
			len(entrada), len(saida),
		)
	}
}

// TestOtimizarPDFMalformadoDevolveOriginalIntacto prova a outra metade da
// mesma guarda: um "PDF" com assinatura válida mas corpo malformado o
// bastante para api.Optimize e recomprimirImagensPDF falharem os dois. O
// envio não pode ser rejeitado nem os bytes alterados — um PDF que não deu
// para otimizar ainda é um PDF válido para guardar.
func TestOtimizarPDFMalformadoDevolveOriginalIntacto(t *testing.T) {
	entrada := []byte("%PDF-1.7\nisto tem a assinatura de PDF mas nao eh um PDF valido, so lixo\n%%EOF")

	res, err := Otimizar(entrada, "malformado.pdf", PerfilDocumento)
	if err != nil {
		t.Fatalf("Otimizar nao deveria falhar, deveria devolver o original: %v", err)
	}
	if res.Mime != "application/pdf" || res.Extensao != ".pdf" {
		t.Fatalf("esperava pdf, veio %s %s", res.Mime, res.Extensao)
	}
	if !bytes.Equal(res.Bytes, entrada) {
		t.Fatalf(
			"esperava os bytes originais intactos, veio %d bytes diferentes (entrada tinha %d)",
			len(res.Bytes), len(entrada),
		)
	}
}
