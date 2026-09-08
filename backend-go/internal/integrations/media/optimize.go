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
	"image/jpeg"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"

	// Registram os decoders no image.Decode. GIF e WEBP entram como leitura;
	// a saída é sempre JPEG.
	_ "image/gif"
	_ "image/png"

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
}

// PerfilDocumento é o padrão aplicado aos documentos de cliente.
var PerfilDocumento = Perfil{LadoMaior: 2200, Qualidade: 85}

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
	return Resultado{
		Bytes: out, Mime: "image/jpeg", Extensao: ".jpg",
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

	// Fundo branco: documento digitalizado em PNG costuma ter transparência, e
	// JPEG não tem canal alfa — sem isto o transparente vira preto.
	plano := imaging.New(img.Bounds().Dx(), img.Bounds().Dy(), image.White)
	plano = imaging.Paste(plano, img, image.Pt(0, 0))

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, plano, &jpeg.Options{Quality: p.Qualidade}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// otimizarPDF roda o otimizador do pdfcpu, que unifica objetos e fontes
// repetidos e descarta recursos órfãos. Ele não recomprime as imagens
// embutidas, então o ganho num PDF de texto é modesto (~5-10%) e num PDF que é
// só uma foto digitalizada é quase nulo — o caminho para esse caso é enviar a
// imagem, não o PDF que a embrulha.
func otimizarPDF(dados []byte) ([]byte, int, error) {
	conf := model.NewDefaultConfiguration()
	conf.ValidationMode = model.ValidationRelaxed // PDFs de cartório e scanner erram a spec

	var buf bytes.Buffer
	if err := api.Optimize(bytes.NewReader(dados), &buf, conf); err != nil {
		// PDF que o otimizador recusa ainda é um PDF válido para guardar e
		// exibir; seguimos com os bytes originais em vez de rejeitar o envio.
		paginas, _ := contarPaginas(dados)
		return dados, paginas, nil
	}
	paginas, _ := contarPaginas(buf.Bytes())
	return buf.Bytes(), paginas, nil
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
