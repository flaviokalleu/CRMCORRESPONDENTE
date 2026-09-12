package clientes

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"gorm.io/gorm"

	"crmimob/internal/blob"
	"crmimob/internal/integrations/media"
	"crmimob/internal/integrations/storage"
	"crmimob/internal/models"
)

// NomeConsolidado é o arquivo de cache do PDF único de um tipo. O prefixo `_`
// o mantém separado dos arquivos enviados quando alguém lista o diretório, e é
// o que permite reconhecer e ignorar o cache ao varrer a pasta.
const NomeConsolidado = "_consolidado.pdf"

// NomeDossie é o PDF de todos os tipos juntos, na raiz da pasta do cliente.
const NomeDossie = "_dossie.pdf"

var (
	reNomeInvalido = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)
	reUnderscores  = regexp.MustCompile(`_+`)
)

// DocumentosService cuida do ciclo de vida dos arquivos de um cliente: gravar
// otimizado, listar, remover e montar os PDFs consolidados.
//
// Os arquivos originais ficam no disco individualmente e o PDF único é derivado
// deles sob demanda. O caminho inverso — guardar só o PDF e extrair páginas —
// perderia o nome e o formato de cada documento, e tornaria impossível remover
// um arquivo específico depois de enviado.
type DocumentosService struct {
	db         *gorm.DB
	storageSvc *storage.Service
	store      blob.Store
}

func NewDocumentosService(db *gorm.DB, storageSvc *storage.Service, store blob.Store) *DocumentosService {
	return &DocumentosService{db: db, storageSvc: storageSvc, store: store}
}

// Store expõe o armazenamento para quem precisa transmitir bytes ao cliente
// HTTP — o handler entrega o arquivo por streaming, sem que a chave vire
// caminho de disco em nenhum ponto.
func (s *DocumentosService) Store() blob.Store { return s.store }

// chaveDoc monta o identificador de um arquivo. É o mesmo formato nos dois
// backends (caminho relativo com barras normais), e é o que fica gravado em
// `cliente_documentos.caminho` — trocar disco por S3 não reescreve registro.
func chaveDoc(cpf, coluna, nome string) string {
	return path.Join("clientes", cpf, coluna, nome)
}

// Salvar grava os arquivos de um campo multipart, otimizados, e registra uma
// linha por arquivo. Devolve os documentos criados.
//
// Erro em um arquivo não aborta os outros: quem envia cinco páginas e tem uma
// corrompida deve ficar com quatro, não com zero.
func (s *DocumentosService) Salvar(
	ctx context.Context, cliente *models.Cliente, tipo string, arquivos []*multipart.FileHeader,
) ([]models.ClienteDocumento, []string, error) {
	coluna, ok := models.DocumentTypeMap[tipo]
	if !ok {
		return nil, nil, ErrTipoDocumentoInvalido
	}
	cpf := safeCPF(cliente)
	if cpf == "" {
		return nil, nil, ErrCaminhoInvalido
	}

	proximaOrdem, err := s.proximaOrdem(ctx, cliente.ID, tipo)
	if err != nil {
		return nil, nil, err
	}

	var criados []models.ClienteDocumento
	var falhas []string
	var totalBytes int64

	for _, fh := range arquivos {
		doc, err := s.salvarUm(ctx, cliente, tipo, coluna, fh, proximaOrdem)
		if err != nil {
			falhas = append(falhas, fh.Filename)
			continue
		}
		proximaOrdem++
		totalBytes += doc.Bytes
		criados = append(criados, *doc)
	}

	if len(criados) > 0 {
		// O cache do tipo e o dossiê completo deixaram de valer.
		s.invalidarConsolidado(ctx, cpf, coluna)
		if err := s.sincronizarColunaLegada(ctx, cliente, tipo); err != nil {
			return criados, falhas, err
		}
	}
	if totalBytes > 0 && s.storageSvc != nil && cliente.TenantID != 0 {
		_ = s.storageSvc.IncrementStorage(ctx, cliente.TenantID, totalBytes)
	}
	return criados, falhas, nil
}

func (s *DocumentosService) salvarUm(
	ctx context.Context, cliente *models.Cliente, tipo, coluna string,
	fh *multipart.FileHeader, ordem int,
) (*models.ClienteDocumento, error) {
	src, err := fh.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	dados, err := io.ReadAll(src)
	if err != nil {
		return nil, err
	}

	res, err := media.Otimizar(dados, fh.Filename, media.PerfilDocumento)
	if err != nil {
		return nil, err
	}

	base := sanitizarNome(fh.Filename)
	nomeArquivo := fmt.Sprintf("%03d_%s%s", ordem+1, base, res.Extensao)
	rel := chaveDoc(safeCPF(cliente), coluna, nomeArquivo)
	if err := s.store.Gravar(ctx, rel, res.Bytes, res.Mime); err != nil {
		return nil, err
	}

	doc := models.ClienteDocumento{
		ClienteID:    cliente.ID,
		TenantID:     cliente.TenantID,
		Tipo:         tipo,
		Ordem:        ordem,
		NomeOriginal: fh.Filename,
		Caminho:      rel,
		Mime:         res.Mime,
		Bytes:        int64(len(res.Bytes)),
		BytesOrigem:  res.BytesOrigem,
		Paginas:      res.Paginas,
	}
	if err := s.db.WithContext(ctx).Create(&doc).Error; err != nil {
		// O registro é a fonte da verdade; um objeto órfão no storage seria
		// invisível e nunca mais referenciado.
		_ = s.store.Remover(ctx, rel)
		return nil, err
	}
	return &doc, nil
}

// Listar devolve os documentos de um cliente, ordenados por tipo e ordem.
func (s *DocumentosService) Listar(ctx context.Context, clienteID uint) ([]models.ClienteDocumento, error) {
	var docs []models.ClienteDocumento
	err := s.db.WithContext(ctx).
		Where("cliente_id = ?", clienteID).
		Order("tipo ASC").Order("ordem ASC").Order("id ASC").
		Find(&docs).Error
	return docs, err
}

// ListarPorTipo devolve só os de um tipo.
func (s *DocumentosService) ListarPorTipo(ctx context.Context, clienteID uint, tipo string) ([]models.ClienteDocumento, error) {
	var docs []models.ClienteDocumento
	err := s.db.WithContext(ctx).
		Where("cliente_id = ? AND tipo = ?", clienteID, tipo).
		Order("ordem ASC").Order("id ASC").
		Find(&docs).Error
	return docs, err
}

// Buscar devolve um documento específico já confirmando que ele pertence ao
// cliente — sem isso, trocar o id na URL leria o documento de outra pessoa.
func (s *DocumentosService) Buscar(ctx context.Context, clienteID, docID uint) (*models.ClienteDocumento, error) {
	var doc models.ClienteDocumento
	err := s.db.WithContext(ctx).
		Where("id = ? AND cliente_id = ?", docID, clienteID).
		First(&doc).Error
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

// Remover apaga um documento (registro + arquivo) e devolve o espaço ao tenant.
func (s *DocumentosService) Remover(ctx context.Context, cliente *models.Cliente, docID uint) error {
	doc, err := s.Buscar(ctx, cliente.ID, docID)
	if err != nil {
		return err
	}
	if err := s.db.WithContext(ctx).Delete(&models.ClienteDocumento{}, doc.ID).Error; err != nil {
		return err
	}
	_ = s.store.Remover(ctx, doc.Caminho)
	if s.storageSvc != nil && cliente.TenantID != 0 {
		_ = s.storageSvc.DecrementStorage(ctx, cliente.TenantID, doc.Bytes)
	}
	if coluna, ok := models.DocumentTypeMap[doc.Tipo]; ok {
		s.invalidarConsolidado(ctx, safeCPF(cliente), coluna)
		_ = s.sincronizarColunaLegada(ctx, cliente, doc.Tipo)
	}
	return nil
}

// RemoverTipo apaga todos os documentos de um tipo.
func (s *DocumentosService) RemoverTipo(ctx context.Context, cliente *models.Cliente, tipo string) (int, error) {
	docs, err := s.ListarPorTipo(ctx, cliente.ID, tipo)
	if err != nil {
		return 0, err
	}
	var liberados int64
	for _, doc := range docs {
		_ = s.store.Remover(ctx, doc.Caminho)
		liberados += doc.Bytes
	}
	if err := s.db.WithContext(ctx).
		Where("cliente_id = ? AND tipo = ?", cliente.ID, tipo).
		Delete(&models.ClienteDocumento{}).Error; err != nil {
		return 0, err
	}
	if liberados > 0 && s.storageSvc != nil && cliente.TenantID != 0 {
		_ = s.storageSvc.DecrementStorage(ctx, cliente.TenantID, liberados)
	}
	if coluna, ok := models.DocumentTypeMap[tipo]; ok {
		s.invalidarConsolidado(ctx, safeCPF(cliente), coluna)
		_ = s.sincronizarColunaLegada(ctx, cliente, tipo)
	}
	return len(docs), nil
}

// PDFConsolidado devolve o caminho absoluto do PDF único de um tipo, montando-o
// se o cache não existir ou estiver mais velho que o arquivo mais recente.
func (s *DocumentosService) PDFConsolidado(ctx context.Context, cliente *models.Cliente, tipo string) (string, int, []string, error) {
	coluna, ok := models.DocumentTypeMap[tipo]
	if !ok {
		return "", 0, nil, ErrTipoDocumentoInvalido
	}
	docs, err := s.ListarPorTipo(ctx, cliente.ID, tipo)
	if err != nil {
		return "", 0, nil, err
	}
	if len(docs) == 0 {
		return "", 0, nil, media.ErrSemArquivos
	}
	return s.montarSeNecessario(ctx, chaveDoc(safeCPF(cliente), coluna, NomeConsolidado), docs)
}

// PDFDossie devolve a chave do PDF com TODOS os documentos do cliente, na ordem
// em que os tipos aparecem no formulário — é o que se manda ao banco de uma vez.
func (s *DocumentosService) PDFDossie(ctx context.Context, cliente *models.Cliente) (string, int, []string, error) {
	docs, err := s.Listar(ctx, cliente.ID)
	if err != nil {
		return "", 0, nil, err
	}
	if len(docs) == 0 {
		return "", 0, nil, media.ErrSemArquivos
	}
	ordenarPorTipoDoFormulario(docs)
	chave := path.Join("clientes", safeCPF(cliente), NomeDossie)
	return s.montarSeNecessario(ctx, chave, docs)
}

// montarSeNecessario devolve a chave do PDF consolidado, montando-o quando o
// cache não existe ou está mais velho que o arquivo de origem mais recente.
//
// Um dossiê de trinta páginas leva segundos para montar; refazer isso a cada
// clique de visualização seria desperdício visível.
func (s *DocumentosService) montarSeNecessario(
	ctx context.Context, chaveDestino string, docs []models.ClienteDocumento,
) (string, int, []string, error) {
	var maisRecente int64
	for _, doc := range docs {
		info, err := s.store.Info(ctx, doc.Caminho)
		if err != nil {
			continue
		}
		if info.Alterado > maisRecente {
			maisRecente = info.Alterado
		}
	}

	if info, err := s.store.Info(ctx, chaveDestino); err == nil && info.Alterado >= maisRecente {
		if dados, err := s.store.Ler(ctx, chaveDestino); err == nil {
			if n, err := media.ContarPaginas(dados); err == nil {
				return chaveDestino, n, nil, nil
			}
		}
		// Cache ilegível — cai para a remontagem abaixo.
	}

	// O pdfcpu trabalha sobre arquivos, e com S3 não há arquivo: os originais
	// são materializados num diretório temporário que morre no fim da função.
	tmp, err := os.MkdirTemp("", "consolidar-*")
	if err != nil {
		return "", 0, nil, err
	}
	defer os.RemoveAll(tmp)

	var origens []string
	var ignorados []string
	for i, doc := range docs {
		dados, err := s.store.Ler(ctx, doc.Caminho)
		if err != nil {
			ignorados = append(ignorados, doc.NomeOriginal)
			continue
		}
		local := filepath.Join(tmp, fmt.Sprintf("%04d%s", i, filepath.Ext(doc.Caminho)))
		if err := os.WriteFile(local, dados, 0o600); err != nil {
			ignorados = append(ignorados, doc.NomeOriginal)
			continue
		}
		origens = append(origens, local)
	}
	if len(origens) == 0 {
		return "", 0, ignorados, media.ErrSemArquivos
	}

	saida := filepath.Join(tmp, "saida.pdf")
	paginas, ignoradosPDF, err := media.ConstruirPDF(origens, saida)
	if err != nil {
		return "", 0, append(ignorados, ignoradosPDF...), err
	}
	dados, err := os.ReadFile(saida)
	if err != nil {
		return "", 0, ignorados, err
	}
	if err := s.store.Gravar(ctx, chaveDestino, dados, "application/pdf"); err != nil {
		return "", 0, ignorados, err
	}
	return chaveDestino, paginas, append(ignorados, ignoradosPDF...), nil
}

// invalidarConsolidado apaga os caches que dependem de um tipo. Apagar é mais
// seguro que confiar só em data de modificação: relógio de sistema volta atrás,
// cópia de objeto preserva a data, e um cache velho servido como atual é um
// documento errado na mão de quem analisa crédito.
func (s *DocumentosService) invalidarConsolidado(ctx context.Context, cpf, coluna string) {
	if cpf == "" {
		return
	}
	_ = s.store.Remover(ctx, chaveDoc(cpf, coluna, NomeConsolidado))
	_ = s.store.Remover(ctx, path.Join("clientes", cpf, NomeDossie))
}

// sincronizarColunaLegada mantém `clientes.<coluna>` apontando para o PDF
// consolidado do tipo, ou NULL quando não sobrou arquivo nenhum.
//
// Aquelas colunas continuam sendo o que o resto do sistema lê para saber se um
// cliente "tem documento"; mantê-las coerentes é o que permite trocar o
// armazenamento sem sair caçando todos os leitores.
func (s *DocumentosService) sincronizarColunaLegada(ctx context.Context, cliente *models.Cliente, tipo string) error {
	coluna, ok := models.DocumentTypeMap[tipo]
	if !ok {
		return ErrTipoDocumentoInvalido
	}
	var total int64
	if err := s.db.WithContext(ctx).Model(&models.ClienteDocumento{}).
		Where("cliente_id = ? AND tipo = ?", cliente.ID, tipo).
		Count(&total).Error; err != nil {
		return err
	}

	var valor *string
	if total > 0 {
		rel := chaveDoc(safeCPF(cliente), coluna, NomeConsolidado)
		valor = &rel
	}
	return s.db.WithContext(ctx).Model(&models.Cliente{}).
		Where("id = ?", cliente.ID).
		UpdateColumn(coluna, valor).Error
}

func (s *DocumentosService) proximaOrdem(ctx context.Context, clienteID uint, tipo string) (int, error) {
	var maior *int
	err := s.db.WithContext(ctx).Model(&models.ClienteDocumento{}).
		Where("cliente_id = ? AND tipo = ?", clienteID, tipo).
		Select("MAX(ordem)").Scan(&maior).Error
	if err != nil {
		return 0, err
	}
	if maior == nil {
		return 0, nil
	}
	return *maior + 1, nil
}

// ordenarPorTipoDoFormulario coloca os tipos na sequência em que aparecem no
// cadastro, para o dossiê sair na ordem que o analista espera folhear.
func ordenarPorTipoDoFormulario(docs []models.ClienteDocumento) {
	peso := map[string]int{
		"documentosPessoais":   0,
		"extratoBancario":      1,
		"documentosDependente": 2,
		"documentosConjuge":    3,
		"fiadorDocumentos":     4,
		"formulariosCaixa":     5,
		"tela_aprovacao":       6,
	}
	sort.SliceStable(docs, func(i, j int) bool {
		pi, pj := peso[docs[i].Tipo], peso[docs[j].Tipo]
		if pi != pj {
			return pi < pj
		}
		return docs[i].Ordem < docs[j].Ordem
	})
}

// sanitizarNome deixa o nome do arquivo seguro para o sistema de arquivos e
// para a URL, preservando o suficiente para a pessoa reconhecer o documento.
func sanitizarNome(nome string) string {
	base := strings.TrimSuffix(filepath.Base(nome), filepath.Ext(nome))
	limpo := reNomeInvalido.ReplaceAllString(base, "_")
	limpo = strings.Trim(reUnderscores.ReplaceAllString(limpo, "_"), "_")
	if limpo == "" {
		limpo = "documento"
	}
	if len(limpo) > 60 {
		limpo = limpo[:60]
	}
	return strings.ToLower(limpo)
}
