// Package media reduz o tamanho dos arquivos enviados antes de eles chegarem
// ao disco.
//
// Um documento fotografado com celular chega com 8 MB e 12 megapixels; o que se
// precisa dele é ler um RG ou um contracheque na tela. Reduzir para ~200 dpi em
// A4 e recomprimir em JPEG derruba o arquivo para algumas centenas de KB sem
// que o texto perca nitidez na leitura ou na impressão.
//
// Isto NÃO é compressão sem perda: JPEG descarta informação. A escolha aqui é
// deliberada e calibrada para documento (ver Perfil) — não use este pacote para
// foto de imóvel em página de venda, onde o critério é outro.
package media

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"

	// Registra o decoder no image.Decode. GIF e WEBP entram como leitura; a
	// saída é sempre JPEG, exceto nos perfis sem perda (ver SemPerda), que
	// saem em PNG — por isso png deixou de ser import em branco.
	_ "image/gif"

	_ "golang.org/x/image/webp"
)

// ErrTipoNaoSuportado é devolvido para arquivos que não são imagem nem PDF.
// Quem chama decide se rejeita o envio ou se grava o arquivo como veio.
var ErrTipoNaoSuportado = errors.New("media: tipo de arquivo não suportado")

// Perfil são os parâmetros da otimização de imagem.
//
// LadoMaior 2200px equivale a ~200 dpi numa folha A4 (21cm ≈ 8,27in). É o ponto
// em que texto de documento continua legível com folga no zoom de leitura e a
// digitalização de 300 dpi deixa de custar o triplo do espaço por uma diferença
// que a tela não mostra.
//
// Qualidade 85 é o joelho da curva do JPEG: abaixo disso aparece artefato em
// borda de letra, acima o arquivo cresce sem ganho visível.
type Perfil struct {
	LadoMaior int
	Qualidade int

	// PreservarAlpha impede o fundo branco e a saída em JPEG: a imagem sai em
	// PNG mantendo o canal alfa. Usado por logo, onde achatar em branco
	// arruína a peça sobre fundo escuro.
	PreservarAlpha bool

	// SemPerda troca o JPEG por PNG sem quantização de qualidade nenhuma — a
	// saída é pixel a pixel igual à entrada (a menos do redimensionamento, que
	// aqui normalmente vem desligado com LadoMaior 0). Usado por print de tela
	// de sistema, onde o texto fino de tabela é exatamente o que o JPEG borra.
	SemPerda bool
}

// PerfilDocumento é o padrão aplicado aos documentos de cliente.
var PerfilDocumento = Perfil{LadoMaior: 2200, Qualidade: 85}

// PerfilFoto é para foto de imóvel, vistoria e laudo: aparece em grade de
// galeria e ampliada em tela cheia, nunca impressa em A4, então não precisa
// da resolução de documento.
//
// LadoMaior 1920 é a largura de uma tela Full HD — o teto do que qualquer
// monitor comum consegue mostrar de uma vez; passar disso é gastar espaço com
// detalhe que a tela descarta no downscale de exibição.
//
// Qualidade 82 é um ponto abaixo do joelho do documento (85): foto real tem
// textura e gradiente, que escondem artefato de compressão muito melhor do
// que a borda reta de uma letra esconde.
var PerfilFoto = Perfil{LadoMaior: 1920, Qualidade: 82}

// PerfilAvatar é para foto de pessoa — corretor, correspondente, usuário —
// exibida pequena (40 a 128px).
//
// LadoMaior 320 cobre até uma tela retina (2x) mostrando o avatar no maior
// tamanho usado (128px) com folga para o crop não esticar. Guardar mais que
// isso é peso que nenhuma tela deste sistema chega a mostrar.
//
// Qualidade 80: rosto em miniatura tolera mais compressão que documento ou
// foto de imóvel — não há texto para ler nem detalhe fino para vender.
var PerfilAvatar = Perfil{LadoMaior: 320, Qualidade: 80}

// PerfilLogo é para a logo do tenant. PreservarAlpha true porque achatar em
// fundo branco arruína uma logo pensada para ficar sobre fundo escuro — o
// canal alfa é o próprio motivo de a logo existir em PNG.
//
// LadoMaior 1024 cobre a logo em destaque na tela de login (a maior exibição
// que ela tem neste sistema) mesmo em tela retina, sem guardar resolução de
// impressão que uma logo de navbar/cabeçalho nunca vai precisar.
var PerfilLogo = Perfil{LadoMaior: 1024, PreservarAlpha: true}

// PerfilPrint é para print de tela do sistema do banco anexado a um
// atendimento. SemPerda true porque texto fino de tabela sobre fundo liso é
// exatamente o que o JPEG destrói, e PNG com paleta reduzida (ver
// codificarSemPerda) costuma sair menor que o JPEG equivalente sem borrar
// nada.
//
// LadoMaior 0 desliga o redimensionamento: um print já nasce no tamanho da
// tela que o corretor está usando, e reamostrar isso borraria o próprio texto
// que este perfil existe para preservar nítido.
var PerfilPrint = Perfil{LadoMaior: 0, SemPerda: true}

// Resultado descreve o que saiu da otimização.
type Resultado struct {
	Bytes       []byte
	Mime        string
	Extensao    string // com ponto, ex.: ".jpg"
	BytesOrigem int64
	Paginas     int
}

// Economia devolve a redução percentual, 0 quando não houve ganho.
func (r Resultado) Economia() float64 {
	if r.BytesOrigem <= 0 || int64(len(r.Bytes)) >= r.BytesOrigem {
		return 0
	}
	return (1 - float64(len(r.Bytes))/float64(r.BytesOrigem)) * 100
}

// Otimizar reduz o arquivo conforme o tipo detectado pelo conteúdo (não pela
// extensão, que o cliente controla e pode mentir).
//
// Regra que atravessa as duas ramificações: se o resultado ficar MAIOR que a
// entrada, devolvemos a entrada. Acontece com imagem já muito comprimida ou PDF
// já linearizado, e não faz sentido pagar espaço para "otimizar".
func Otimizar(dados []byte, nomeOriginal string, p Perfil) (Resultado, error) {
	origem := int64(len(dados))

	if ehPDF(dados) {
		out, paginas, err := otimizarPDF(dados)
		if err != nil {
			return Resultado{}, err
		}
		if int64(len(out)) >= origem {
			out = dados
		}
		return Resultado{
			Bytes: out, Mime: "application/pdf", Extensao: ".pdf",
			BytesOrigem: origem, Paginas: paginas,
		}, nil
	}

	out, err := otimizarImagem(dados, p)
	if err != nil {
		return Resultado{}, err
	}
	if int64(len(out)) >= origem {
		// Mantemos os bytes originais, mas o tipo declarado continua sendo o
		// que o conteúdo diz — a extensão do nome enviado não é confiável.
		mime, ext := tipoDaImagem(dados, nomeOriginal)
		return Resultado{
			Bytes: dados, Mime: mime, Extensao: ext,
			BytesOrigem: origem, Paginas: 1,
		}, nil
	}
	// SemPerda e PreservarAlpha saem em PNG (JPEG não tem alfa e recomprimiria
	// à toa uma saída que já é sem perda); os demais perfis saem em JPEG.
	mime, ext := "image/jpeg", ".jpg"
	if p.SemPerda || p.PreservarAlpha {
		mime, ext = "image/png", ".png"
	}
	return Resultado{
		Bytes: out, Mime: mime, Extensao: ext,
		BytesOrigem: origem, Paginas: 1,
	}, nil
}

// otimizarImagem decodifica, corrige a orientação declarada no EXIF,
// redimensiona se passar do limite e recodifica em JPEG.
//
// A reorientação importa: foto de celular costuma vir com os pixels deitados e
// a rotação só no metadado. Como o metadado é descartado (é onde mora a
// geolocalização, que não temos por que guardar de um documento), sem aplicar a
// rotação antes o documento sairia virado.
func otimizarImagem(dados []byte, p Perfil) ([]byte, error) {
	img, err := imaging.Decode(bytes.NewReader(dados), imaging.AutoOrientation(true))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrTipoNaoSuportado, err)
	}

	b := img.Bounds()
	maior := b.Dx()
	if b.Dy() > maior {
		maior = b.Dy()
	}
	if p.LadoMaior > 0 && maior > p.LadoMaior {
		if b.Dx() >= b.Dy() {
			img = imaging.Resize(img, p.LadoMaior, 0, imaging.Lanczos)
		} else {
			img = imaging.Resize(img, 0, p.LadoMaior, imaging.Lanczos)
		}
	}

	if p.SemPerda || p.PreservarAlpha {
		// Print de tela e logo não podem virar JPEG: um tem texto fino que o
		// JPEG borra, o outro precisa do canal alfa que o JPEG não tem.
		return codificarSemPerda(img)
	}

	return codificarJPEGComFundoBranco(img, p.Qualidade)
}

// codificarJPEGComFundoBranco funde a imagem sobre um fundo branco —
// documento digitalizado em PNG costuma ter transparência, e JPEG não tem
// canal alfa; sem isto o transparente vira preto — e recodifica em JPEG na
// qualidade pedida.
func codificarJPEGComFundoBranco(img image.Image, qualidade int) ([]byte, error) {
	plano := imaging.New(img.Bounds().Dx(), img.Bounds().Dy(), image.White)
	plano = imaging.Paste(plano, img, image.Pt(0, 0))

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, plano, &jpeg.Options{Quality: qualidade}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// codificarSemPerda grava a imagem em PNG sem descartar nenhum pixel. Quando
// a imagem usa até 256 cores distintas — o caso comum de print de tela de
// sistema (fundo liso, texto, poucos tons de marca) e de logo (arte
// vetorial rasterizada) — troca para paleta indexada, que sai menor que o
// PNG "truecolor" equivalente sem aproximar cor nenhuma, alfa incluso.
func codificarSemPerda(img image.Image) ([]byte, error) {
	saida := image.Image(img)
	if paletizada, ok := paletaExata(img, 256); ok {
		saida = paletizada
	}

	var buf bytes.Buffer
	enc := png.Encoder{CompressionLevel: png.BestCompression}
	if err := enc.Encode(&buf, saida); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// paletaExata tenta montar uma paleta indexada exata — sem quantizar, sem
// aproximar nenhuma cor — com até `limite` entradas. Devolve ok=false assim
// que aparece uma cor a mais do que cabe: a imagem tem gradiente ou é foto
// real demais para paleta, e segue truecolor.
func paletaExata(img image.Image, limite int) (*image.Paletted, bool) {
	b := img.Bounds()
	indice := make(map[color.NRGBA]uint8, limite)
	paleta := make(color.Palette, 0, limite)

	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			c := color.NRGBAModel.Convert(img.At(x, y)).(color.NRGBA)
			if _, ok := indice[c]; ok {
				continue
			}
			if len(paleta) >= limite {
				return nil, false
			}
			indice[c] = uint8(len(paleta))
			paleta = append(paleta, c)
		}
	}

	saida := image.NewPaletted(b, paleta)
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			c := color.NRGBAModel.Convert(img.At(x, y)).(color.NRGBA)
			saida.SetColorIndex(x, y, indice[c])
		}
	}
	return saida, true
}

// otimizarPDF roda o otimizador do pdfcpu, que unifica objetos e fontes
// repetidos e descarta recursos órfãos, e em seguida recomprime as imagens
// embutidas (ver recomprimirImagensPDF) — sozinho, o passo acima ganha pouco
// num PDF de texto (~5-10%) e quase nada num PDF que é só página escaneada,
// que é o caso comum aqui (dossiê de cartório).
//
// Cada etapa é best-effort: se falhar, os bytes de entrada dela seguem
// adiante sem modificação. Um PDF que a gente não conseguiu otimizar ainda é
// um PDF válido para guardar; não faz sentido rejeitar o envio por isso.
func otimizarPDF(dados []byte) ([]byte, int, error) {
	conf := model.NewDefaultConfiguration()
	conf.ValidationMode = model.ValidationRelaxed // PDFs de cartório e scanner erram a spec

	otimizado := dados
	var buf bytes.Buffer
	if err := api.Optimize(bytes.NewReader(dados), &buf, conf); err == nil {
		otimizado = buf.Bytes()
	}

	if recomprimido := recomprimirImagensPDF(otimizado); len(recomprimido) < len(otimizado) {
		otimizado = recomprimido
	}

	if len(otimizado) >= len(dados) {
		otimizado = dados
	}
	paginas, _ := contarPaginas(otimizado)
	return otimizado, paginas, nil
}

// recomprimirImagensPDF troca a compressão de cada imagem embutida por uma
// mais agressiva (JPEG na qualidade de PerfilDocumento), mantendo a mesma
// resolução em pixel — é a limitação da própria API de troca de imagem do
// pdfcpu (UpdateImagesByObjNr exige que a substituta tenha exatamente a
// mesma largura e altura da original, então redimensionar está fora de
// cogitação aqui). O ganho vem de trocar a compressão, não o tamanho: a
// maioria dos PDFs de cartório embute a página inteira como uma única foto de
// scanner em qualidade de captura (raw, ou JPEG quase sem perda).
//
// Qualquer falha, em qualquer etapa — inclusive um panic vindo de dentro do
// pdfcpu, que essa API de baixo nível não embrulha em erro sozinha — devolve
// os bytes de entrada sem modificação nenhuma.
func recomprimirImagensPDF(dados []byte) (saida []byte) {
	saida = dados
	defer func() {
		if recover() != nil {
			saida = dados
		}
	}()

	conf := model.NewDefaultConfiguration()
	conf.ValidationMode = model.ValidationRelaxed
	conf.Cmd = model.EXTRACTIMAGES // garante que ReadValidateAndOptimize monta ctx.Optimize

	ctx, err := api.ReadValidateAndOptimize(bytes.NewReader(dados), conf)
	if err != nil {
		return dados
	}

	// Uma imagem pode aparecer em mais de uma página (ex.: cabeçalho
	// repetido) com o mesmo objNr; processa cada objeto uma vez só.
	vistos := map[int]model.Image{}
	for pagina := 1; pagina <= ctx.PageCount; pagina++ {
		m, err := pdfcpu.ExtractPageImages(ctx, pagina, false)
		if err != nil {
			continue // página com recurso não suportado: pula, não aborta o PDF inteiro
		}
		for objNr, img := range m {
			if _, ja := vistos[objNr]; !ja {
				vistos[objNr] = img
			}
		}
	}

	trocas := 0
	for objNr, img := range vistos {
		novo, ok := recomprimirImagemEmbutida(img)
		if !ok {
			continue
		}
		if err := pdfcpu.UpdateImagesByObjNr(ctx, bytes.NewReader(novo), objNr); err != nil {
			continue // essa imagem não pôde ser trocada; as outras seguem
		}
		trocas++
	}
	if trocas == 0 {
		return dados
	}

	var buf bytes.Buffer
	if err := api.Write(ctx, &buf, conf); err != nil {
		return dados
	}
	return buf.Bytes()
}

// recomprimirImagemEmbutida decodifica os bytes já renderizados de uma
// imagem de PDF e recomprime como JPEG sobre fundo branco.
//
// Fica de fora, por segurança: máscara de recorte (IsImgMask/HasImgMask),
// imagem com canal alfa via SMask separado (HasSMask) e miniatura (Thumb) —
// a troca de objeto do pdfcpu substitui o dicionário inteiro (entry.Object =
// *sd), então mexer nelas quebraria a referência para a máscara ou faria a
// miniatura sumir. E também os formatos sem decoder no processo (fax
// CCITT/JBIG2 sem palette, JPEG2000, CMYK/TIFF): ficam como vieram.
func recomprimirImagemEmbutida(img model.Image) ([]byte, bool) {
	if img.Reader == nil || img.IsImgMask || img.HasImgMask || img.HasSMask || img.Thumb {
		return nil, false
	}
	switch img.FileType {
	case "jpg", "jpeg", "png":
	default:
		return nil, false
	}

	bruto, err := io.ReadAll(img.Reader)
	if err != nil || len(bruto) == 0 {
		return nil, false
	}

	decodificada, _, err := image.Decode(bytes.NewReader(bruto))
	if err != nil {
		return nil, false
	}

	novo, err := codificarJPEGComFundoBranco(decodificada, PerfilDocumento.Qualidade)
	if err != nil || len(novo) >= len(bruto) {
		return nil, false
	}
	return novo, true
}

func contarPaginas(dados []byte) (int, error) {
	conf := model.NewDefaultConfiguration()
	conf.ValidationMode = model.ValidationRelaxed
	ctx, err := api.ReadValidateAndOptimize(bytes.NewReader(dados), conf)
	if err != nil {
		return 1, err
	}
	return ctx.PageCount, nil
}

// ehPDF olha a assinatura do arquivo. O cabeçalho pode vir precedido de lixo em
// arquivos gerados por ferramentas desleixadas, daí a busca nos primeiros bytes
// em vez de comparar só o começo.
func ehPDF(dados []byte) bool {
	limite := 1024
	if len(dados) < limite {
		limite = len(dados)
	}
	return bytes.Contains(dados[:limite], []byte("%PDF-"))
}

func tipoDaImagem(dados []byte, nome string) (mime, ext string) {
	_, formato, err := image.DecodeConfig(bytes.NewReader(dados))
	if err != nil {
		ext = strings.ToLower(filepath.Ext(nome))
		if ext == "" {
			ext = ".bin"
		}
		return "application/octet-stream", ext
	}
	switch formato {
	case "jpeg":
		return "image/jpeg", ".jpg"
	case "png":
		return "image/png", ".png"
	case "gif":
		return "image/gif", ".gif"
	case "webp":
		return "image/webp", ".webp"
	default:
		return "application/octet-stream", "." + formato
	}
}

// OtimizarArquivo aplica Otimizar sobre um arquivo já no disco, reescrevendo-o
// no lugar quando há ganho. Usado pela rotina que trata os arquivos enviados
// antes desta mudança existir.
func OtimizarArquivo(caminho string, p Perfil) (Resultado, error) {
	f, err := os.Open(caminho)
	if err != nil {
		return Resultado{}, err
	}
	dados, err := io.ReadAll(f)
	f.Close()
	if err != nil {
		return Resultado{}, err
	}
	res, err := Otimizar(dados, filepath.Base(caminho), p)
	if err != nil {
		return Resultado{}, err
	}
	if int64(len(res.Bytes)) >= res.BytesOrigem {
		return res, nil
	}
	return res, os.WriteFile(caminho, res.Bytes, 0o644)
}
