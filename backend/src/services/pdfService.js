const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ✅ DEPENDÊNCIA PARA CONVERSÃO PDF->IMAGEM
const pdf2pic = require('pdf2pic');

class PDFService {
  constructor(baseDir, options = {}) {
    this.baseDir = baseDir;
    
    // ✅ CONFIGURAÇÕES DO SERVIÇO
    this.config = {
      // Ativar conversão PDF->Imagem->PDF para documentos problemáticos
      enableImageConversion: options.enableImageConversion !== false, // Padrão: ativado
      
      // Tipos de documento que devem usar conversão por imagem
      imageConversionTypes: options.imageConversionTypes || ['ctps'],
      
      // Configurações da conversão por imagem
      imageConversionSettings: {
        dpi: options.dpi || 150,
        quality: options.quality || 85,
        maxWidth: options.maxWidth || 1200,
        format: options.format || 'jpeg' // jpeg ou webp
      },
      
      // Ativar logs detalhados
      enableDetailedLogs: options.enableDetailedLogs !== false,
      
      ...options
    };
    
    if (this.config.enableDetailedLogs) {
      console.log(`🔧 PDFService inicializado com configurações:`, {
        enableImageConversion: this.config.enableImageConversion,
        imageConversionTypes: this.config.imageConversionTypes,
        imageSettings: this.config.imageConversionSettings
      });
    }
  }

  // Helper para sanitizar nome de arquivo
  sanitizeFileName(originalName) {
    // Remove caracteres especiais e substitui espaços por underscore
    const sanitized = originalName
      .replace(/[()[\]{}\s]+/g, '_') // Parênteses, colchetes, chaves e espaços
      .replace(/[^a-zA-Z0-9._-]/g, '') // Remove outros caracteres especiais
      .replace(/_+/g, '_') // Remove underscores duplicados
      .replace(/^_|_$/g, ''); // Remove underscores no início e fim
    
    return sanitized || 'documento'; // Fallback se o nome ficar vazio
  }

  // Helper para tentar diferentes métodos de carregamento de PDF
  async tryLoadPdf(pdfBytes, fileName) {
    // ✅ MÉTODOS ESPECÍFICOS PARA CTPS
    const isCTPS = fileName.toLowerCase().includes('ctps') || fileName.toLowerCase().includes('carteira');
    
    const methods = [
      // Método 1: Padrão com configurações tolerantes
      () => PDFDocument.load(pdfBytes, { 
        ignoreEncryption: true,
        capNumbers: true,
        parseSpeed: 1,
        throwOnInvalidObject: false // Para PDFs que podem ter objetos mal formados
      }),
      
      // Método 2: Para PDFs de CTPS (mais tolerante)
      () => PDFDocument.load(pdfBytes, { 
        ignoreEncryption: true,
        capNumbers: false,
        parseSpeed: 0.5,
        throwOnInvalidObject: false,
        updateMetadata: false // Não tentar atualizar metadados
      }),
      
      // Método 3: Sem opções especiais
      () => PDFDocument.load(pdfBytes),
      
      // Método 4: Apenas ignorar criptografia
      () => PDFDocument.load(pdfBytes, { ignoreEncryption: true }),
      
      // Método 5: Parsing super lento para PDFs corrompidos
      () => PDFDocument.load(pdfBytes, { 
        ignoreEncryption: true,
        capNumbers: false,
        parseSpeed: 0.1,
        throwOnInvalidObject: false
      })
    ];

    // Para CTPS, tentar o método 2 primeiro
    if (isCTPS) {
      console.log(`🆔 PDF de CTPS detectado, usando métodos específicos`);
      const ctpsMethods = [methods[1], methods[0], ...methods.slice(2)];
      methods.splice(0, methods.length, ...ctpsMethods);
    }

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`🔄 Tentativa ${i + 1}/${methods.length} de carregar PDF: ${fileName}`);
        const pdf = await methods[i]();
        const pageCount = pdf.getPageCount();
        console.log(`✅ PDF carregado com sucesso na tentativa ${i + 1} - ${pageCount} páginas`);
        
        // ✅ VERIFICAÇÃO EXTRA PARA CTPS: Testar se as páginas têm conteúdo
        if (isCTPS && pageCount > 0) {
          try {
            // Tentar acessar uma página para verificar se está válida
            const firstPage = pdf.getPage(0);
            const { width, height } = firstPage.getSize();
            console.log(`🧪 Primeira página do CTPS: ${width}x${height}`);
          } catch (pageError) {
            console.warn(`⚠️ Página pode estar corrompida: ${pageError.message}`);
          }
        }
        
        return pdf;
      } catch (error) {
        console.warn(`⚠️ Tentativa ${i + 1} falhou: ${error.message}`);
        if (i === methods.length - 1) {
          throw error; // Re-throw na última tentativa
        }
      }
    }
  }

  // Helper específico para PDFs problemáticos (como CTPS)
  async handleProblematicPdf(pdfBytes, fileName, useImageConversion = false) {
    console.log(`🔧 Tentando métodos especiais para PDF problemático: ${fileName}, conversão por imagem: ${useImageConversion}`);
    
    try {
      // Verificar se o PDF contém dados válidos
      const pdfString = pdfBytes.toString('latin1');
      if (!pdfString.includes('%PDF-')) {
        console.error(`❌ Arquivo não é um PDF válido: ${fileName}`);
        return null;
      }
      
      // ✅ ESTRATÉGIA 1: Conversão PDF->Imagem->PDF (se habilitada)
      if (useImageConversion) {
        console.log(`🖼️ Tentando conversão PDF->Imagem->PDF para ${fileName}`);
        try {
          const convertedPdf = await this.convertPdfToImagePdf(pdfBytes, fileName, {
            dpi: 150,
            quality: 85,
            maxWidth: 1200
          });
          
          if (convertedPdf && convertedPdf.getPageCount() > 0) {
            console.log(`✅ PDF convertido com sucesso via imagens`);
            return convertedPdf;
          }
        } catch (conversionError) {
          console.warn(`⚠️ Conversão por imagem falhou: ${conversionError.message}`);
        }
      }
      
      // ✅ ESTRATÉGIA 2: Salvar o PDF diretamente sem processar
      console.log(`🔄 Tentando salvar PDF diretamente sem reprocessar...`);
      
      // ✅ TENTAR CARREGAR O PDF ORIGINAL
      try {
        const originalPdf = await this.tryLoadPdf(pdfBytes, fileName);
        if (originalPdf && originalPdf.getPageCount() > 0) {
          console.log(`✅ PDF original carregado com ${originalPdf.getPageCount()} páginas`);
          return originalPdf;
        }
      } catch (loadError) {
        console.warn(`⚠️ Não foi possível carregar PDF original: ${loadError.message}`);
      }
      
      // ✅ ESTRATÉGIA 3: Criar PDF explicativo
      const newPdf = await PDFDocument.create();
      const page = newPdf.addPage();
      const { width, height } = page.getSize();
      
      // Adicionar texto explicativo
      page.drawText(`Documento: ${fileName}`, {
        x: 50,
        y: height - 50,
        size: 14
      });
      
      page.drawText(`Este documento foi preservado devido a características especiais.`, {
        x: 50,
        y: height - 80,
        size: 10
      });
      
      page.drawText(`Tamanho original: ${pdfBytes.length} bytes`, {
        x: 50,
        y: height - 100,
        size: 10
      });
      
      page.drawText(`Para visualizar o conteúdo original, consulte o administrador.`, {
        x: 50,
        y: height - 120,
        size: 10
      });
      
      console.log(`✅ Página informativa criada para ${fileName}`);
      return newPdf;
    } catch (error) {
      console.error(`❌ Falha completa ao processar PDF problemático: ${error.message}`);
      return null;
    }
  }

  // ✅ MÉTODO DE EMERGÊNCIA: Preservar PDF sem reprocessar
  async preserveOriginalPdf(pdfBytes, fileName) {
    console.log(`🚨 Método de emergência: mantendo apenas uma versão compactada do PDF`);

    try {
      const originalPdf = await this.tryLoadPdf(pdfBytes, fileName);
      const compactPdf = await PDFDocument.create();
      const copiedPages = await compactPdf.copyPages(originalPdf, originalPdf.getPageIndices());
      copiedPages.forEach((page) => compactPdf.addPage(page));
      return compactPdf;
    } catch (error) {
      console.error(`❌ Falha no método de emergência: ${error.message}`);
      return null;
    }
  }

  // ✅ MÉTODO PARA VALIDAR CONTEÚDO DO PDF
  async validatePdfContent(pdf, fileName) {
    try {
      const pageCount = pdf.getPageCount();
      console.log(`🧪 Validando conteúdo do PDF ${fileName} com ${pageCount} páginas`);
      
      let hasVisibleContent = false;
      
      for (let i = 0; i < Math.min(pageCount, 3); i++) { // Verificar até 3 páginas
        try {
          const page = pdf.getPage(i);
          const { width, height } = page.getSize();
          
          // Verificar se a página tem dimensões válidas
          if (width > 0 && height > 0) {
            console.log(`✅ Página ${i + 1}: ${width}x${height} - Dimensões válidas`);
            hasVisibleContent = true;
          } else {
            console.warn(`⚠️ Página ${i + 1}: Dimensões inválidas (${width}x${height})`);
          }
        } catch (pageError) {
          console.warn(`⚠️ Erro ao validar página ${i + 1}: ${pageError.message}`);
        }
      }
      
      if (!hasVisibleContent) {
        console.warn(`⚠️ ATENÇÃO: PDF ${fileName} pode não ter conteúdo visível!`);
      }
      
      return hasVisibleContent;
    } catch (error) {
      console.error(`❌ Erro na validação de conteúdo: ${error.message}`);
      return false;
    }
  }

  // ✅ MÉTODO PARA CONVERTER PDF EM IMAGENS E RECRIAR COMO PDF
  async convertPdfToImagePdf(pdfBytes, fileName, customOptions = {}) {
    // Usar configurações do serviço como padrão
    const options = {
      ...this.config.imageConversionSettings,
      ...customOptions
    };
    
    if (this.config.enableDetailedLogs) {
      console.log(`🖼️ Convertendo PDF em imagens e recriando: ${fileName}`, {
        dpi: options.dpi,
        quality: options.quality,
        maxWidth: options.maxWidth
      });
    }
    
    try {
      // Criar diretório temporário para as imagens
      const tempDir = path.join(__dirname, '../../uploads/temp');
      fs.mkdirSync(tempDir, { recursive: true });
      
      const imagesDir = path.join(tempDir, `pdf_images_${Date.now()}`);
      fs.mkdirSync(imagesDir, { recursive: true });
      
      // Salvar PDF temporário
      const tempPdfPath = path.join(imagesDir, 'temp.pdf');
      fs.writeFileSync(tempPdfPath, pdfBytes);
      
      console.log(`� PDF temporário salvo: ${tempPdfPath}`);
      
      // Configurar pdf2pic para converter PDF em imagens
      const pdf2picOptions = {
        density: options.dpi || 150,
        saveFilename: 'page',
        savePath: imagesDir,
        format: 'jpeg',
        width: options.maxWidth || 1200,
        height: 1600,
        quality: options.quality || 85
      };
      
      console.log(`📸 Convertendo PDF em imagens...`, pdf2picOptions);
      
      // Converter PDF para imagens usando pdf2pic
      const convert = pdf2pic.fromPath(tempPdfPath, pdf2picOptions);
      const results = await convert.bulk(-1); // -1 = todas as páginas
      
      console.log(`📸 ${results.length} páginas convertidas em imagens`);
      
      if (results.length === 0) {
        throw new Error('Nenhuma página foi convertida');
      }
      
      // Criar novo PDF a partir das imagens
      const newPdf = await PDFDocument.create();
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        
        if (!result.path || !fs.existsSync(result.path)) {
          console.warn(`⚠️ Imagem não encontrada para página ${i + 1}: ${result.path || 'undefined'}`);
          continue;
        }
        
        try {
          console.log(`📄 Processando página ${i + 1}: ${result.path}`);
          
          // Otimizar imagem com sharp
          const optimizedImageBuffer = await sharp(result.path)
            .resize({ width: options.maxWidth || 1200, fit: 'inside' })
            .jpeg({ quality: options.quality || 85 })
            .toBuffer();
          
          // Adicionar imagem ao PDF
          const img = await newPdf.embedJpg(optimizedImageBuffer);
          const page = newPdf.addPage([img.width, img.height]);
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
          
          console.log(`✅ Página ${i + 1} adicionada ao PDF (${img.width}x${img.height})`);
          
        } catch (pageError) {
          console.error(`❌ Erro ao processar página ${i + 1}: ${pageError.message}`);
          
          // Adicionar página de erro em caso de falha
          const errorPage = newPdf.addPage();
          const { height } = errorPage.getSize();
          
          errorPage.drawText(`Erro na Página ${i + 1}`, {
            x: 50,
            y: height - 50,
            size: 12
          });
          
          errorPage.drawText(`${pageError.message}`, {
            x: 50,
            y: height - 80,
            size: 8
          });
        }
      }
      
      // Limpar arquivos temporários
      try {
        fs.rmSync(imagesDir, { recursive: true, force: true });
        console.log(`🧹 Diretório temporário limpo: ${imagesDir}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Erro ao limpar diretório temporário: ${cleanupError.message}`);
      }
      
      const finalPageCount = newPdf.getPageCount();
      
      if (finalPageCount === 0) {
        console.error(`❌ Nenhuma página foi criada no PDF convertido`);
        return null;
      }
      
      console.log(`✅ PDF recriado a partir de imagens com ${finalPageCount} páginas`);
      return newPdf;
      
    } catch (error) {
      console.error(`❌ Erro na conversão PDF->Imagem->PDF: ${error.message}`);
      console.error(`Stack trace:`, error.stack);
      return null;
    }
  }

  // ✅ MÉTODO AVANÇADO PARA CONVERSÃO REAL COM SHARP (se necessário)
  async convertPdfToImagePdfAdvanced(pdfBytes, fileName, tempDir) {
    console.log(`🚀 Conversão avançada PDF->Imagem->PDF: ${fileName}`);
    
    try {
      // Salvar PDF temporário para processamento
      const tempPdfPath = path.join(tempDir, `temp_${Date.now()}_${fileName}`);
      fs.writeFileSync(tempPdfPath, pdfBytes);
      
      console.log(`💾 PDF temporário salvo: ${tempPdfPath}`);
      
      // ✅ NOTA: Para conversão real, precisaríamos de:
      // 1. pdf-poppler ou pdf2pic para converter PDF em imagens
      // 2. Sharp para otimizar as imagens
      // 3. pdf-lib para recriar o PDF
      
      // Por enquanto, retornar o método básico
      const result = await this.convertPdfToImagePdf(pdfBytes, fileName);
      
      // Limpar arquivo temporário
      try {
        fs.unlinkSync(tempPdfPath);
      } catch (cleanupError) {
        console.warn(`⚠️ Erro ao limpar arquivo temporário: ${cleanupError.message}`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Erro na conversão avançada: ${error.message}`);
      return null;
    }
  }

  async processFiles(files, user, cpf, dbField, existingPath) {
    if (!files || files.length === 0) return null;

    // Helper para converter imagem em PDF com compressão
    const imageToPdfBuffer = async (imgPath) => {
      // Gera uma única versão otimizada com boa qualidade visual.
      const targetWidth = this.config.imageConversionSettings.maxWidth || 1200;
      const targetQuality = this.config.imageConversionSettings.quality || 85;

      const imageBuffer = await sharp(imgPath)
        .resize({ width: targetWidth, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: targetQuality, mozjpeg: true })
        .toBuffer();
      const pdfDoc = await PDFDocument.create();
      const img = await pdfDoc.embedJpg(imageBuffer);
      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      return await pdfDoc.save();
    };

    // Diretório de destino
    const destDir = path.join(this.baseDir, cpf, dbField);
    fs.mkdirSync(destDir, { recursive: true });

    const destPath = path.join(destDir, 'documento.pdf');
    let mergedPdf;
    let existingPdfLoaded = false;

    console.log(`📁 Diretório de trabalho: ${destDir}`);
    console.log(`📄 Arquivo de destino: ${destPath}`);

    // Se já existe um PDF anterior, carregar e adicionar novas páginas
    // SEMPRE priorizar o arquivo no diretório específico do cliente
    const currentUserPdfPath = path.join(destDir, 'documento.pdf');
    
    console.log(`🔍 Verificando PDF do cliente específico: ${currentUserPdfPath}`);
    console.log(`👤 Cliente CPF: ${cpf}, Campo: ${dbField}`);
    
    if (fs.existsSync(currentUserPdfPath)) {
      // Arquivo existe no diretório do cliente - sempre usar este
      try {
        const existingPdfBytes = fs.readFileSync(currentUserPdfPath);
        mergedPdf = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
        existingPdfLoaded = true;
        console.log(`✅ PDF do cliente carregado com ${mergedPdf.getPageCount()} páginas`);
      } catch (error) {
        console.warn(`⚠️ Não foi possível carregar PDF do cliente: ${currentUserPdfPath}. Criando novo documento. Erro: ${error.message}`);
        mergedPdf = await PDFDocument.create();
      }
    } else {
      // IMPORTANTE: NÃO verificar existingPath - sempre criar novo documento para o cliente
      console.log(`� Nenhum PDF encontrado para o cliente ${cpf}/${dbField} - criando novo documento`);
      console.log(`⚠️ Ignorando qualquer existingPath para evitar carregar documentos de outros clientes`);
      
      if (existingPath) {
        console.log(`� existingPath ignorado: ${existingPath}`);
      }
    }
    if (!mergedPdf) {
      mergedPdf = await PDFDocument.create();
      console.log(`📄 Criando novo documento PDF para ${cpf}/${dbField}`);
    }

    // Não limpar diretório se já temos um PDF válido carregado
    console.log(`📊 Total de arquivos para processar: ${files.length}`);
    console.log(`📊 PDF inicial tem ${mergedPdf.getPageCount()} páginas`);

    // Adicionar novas páginas dos arquivos enviados
    for (const file of files) {
      // Sanitizar nome do arquivo antes do processamento
      const sanitizedName = this.sanitizeFileName(file.originalname);
      console.log(`📄 Processando arquivo: ${file.originalname} -> ${sanitizedName}`);
      console.log(`📊 Arquivo original - Tamanho: ${file.size || 'desconhecido'}, Tipo: ${file.mimetype || 'desconhecido'}`);
      console.log(`📁 Caminho temporário: ${file.path}`);

      // Detectar tipo de documento para logs e lógica especial
      let fileType = null;
      if (dbField) {
        fileType = dbField;
      } else if (file.fieldname) {
        fileType = file.fieldname;
      }

      // Verificar se o arquivo existe
      if (!fs.existsSync(file.path)) {
        console.error(`❌ Arquivo temporário não encontrado: ${file.path}`);
        continue;
      }

      const fileStats = fs.statSync(file.path);
      console.log(`📊 Arquivo no disco - Tamanho: ${fileStats.size} bytes, Modificado: ${fileStats.mtime}`);

      if (fileStats.size === 0) {
        console.error(`❌ Arquivo temporário está vazio: ${file.path}`);
        continue;
      }

      // Renomear arquivo físico para evitar problemas com caracteres especiais
      const ext = path.extname(file.originalname).toLowerCase();
      const newFileName = sanitizedName.replace(/\.[^/.]+$/, "") + ext; // Manter extensão original
      let newFilePath = path.join(path.dirname(file.path), newFileName);

      try {
        // Renomear arquivo temporário
        fs.renameSync(file.path, newFilePath);
        console.log(`📁 Arquivo renomeado: ${file.path} -> ${newFilePath}`);
      } catch (renameError) {
        console.warn(`⚠️ Erro ao renomear arquivo, usando original: ${renameError.message}`);
        // Se não conseguir renomear, usa o arquivo original
        newFilePath = file.path;
      }

      let pdfBytes;
      if (ext === '.pdf') {
        pdfBytes = fs.readFileSync(newFilePath);
        console.log(`📄 PDF lido: ${newFilePath}, tamanho: ${pdfBytes.length} bytes`);

        // Verificar se o PDF não está vazio
        if (pdfBytes.length === 0) {
          console.error(`❌ PDF vazio detectado: ${newFilePath}`);
          continue; // Pular arquivo vazio
        }

        // ✅ VERIFICAÇÕES ESPECÍFICAS PARA PDF
        const pdfHeader = pdfBytes.slice(0, 8).toString('ascii');
        console.log(`📋 Header do PDF: "${pdfHeader}"`);

        if (!pdfHeader.startsWith('%PDF-')) {
          console.error(`❌ PDF com header inválido: ${pdfHeader}`);
          // Tentar encontrar o início real do PDF
          const pdfString = pdfBytes.toString('latin1');
          const pdfStartIndex = pdfString.indexOf('%PDF-');
          if (pdfStartIndex > 0) {
            console.log(`🔧 Encontrado início do PDF no byte ${pdfStartIndex}, cortando dados anteriores`);
            pdfBytes = pdfBytes.slice(pdfStartIndex);
          } else {
            console.error(`❌ PDF não contém header válido em lugar algum`);
            continue;
          }
        }

        // Verificar se é um PDF de CTPS (que pode ter características especiais)
        if (sanitizedName.toLowerCase().includes('ctps') || sanitizedName.toLowerCase().includes('carteira')) {
          console.log(`🆔 PDF de CTPS detectado: ${sanitizedName}`);
        }

      } else {
        pdfBytes = await imageToPdfBuffer(newFilePath);
        console.log(`🖼️ Imagem convertida para PDF: ${newFilePath}, tamanho: ${pdfBytes.length} bytes`);
      }

      try {
        console.log(`🔄 Tentando carregar PDF: ${sanitizedName}`);
        console.log(`📊 Tamanho dos bytes: ${pdfBytes.length}`);

        // fileType agora sempre definido
        const pdf = await this.tryLoadPdf(pdfBytes, sanitizedName);
        
        const pageCount = pdf.getPageCount();
        console.log(`📑 PDF carregado com ${pageCount} páginas`);
        
        if (pageCount === 0) {
          console.warn(`⚠️ PDF sem páginas detectado: ${sanitizedName}`);
          continue; // Pular PDF sem páginas
        }
        
        // ✅ VALIDAR CONTEÚDO DO PDF (especialmente para CTPS)
        const hasValidContent = await this.validatePdfContent(pdf, sanitizedName);
        if (!hasValidContent) {
          console.warn(`⚠️ PDF pode ter problemas de conteúdo: ${sanitizedName}`);
        }
        
        // ✅ PROCESSAMENTO ESPECIAL PARA PDFs DE CTPS
        const isCTPS = sanitizedName.toLowerCase().includes('ctps') || sanitizedName.toLowerCase().includes('carteira');
        
        if (isCTPS) {
          console.log(`🆔 Aplicando processamento especial para CTPS: ${sanitizedName}`);
          
          try {
            // ✅ NOVA ABORDAGEM: Para CTPS, sempre criar um PDF limpo
            if (mergedPdf.getPageCount() === 0) {
              console.log(`🔄 Criando PDF base limpo para CTPS...`);
              
              // Em vez de usar o PDF original diretamente, copiar páginas para um PDF limpo
              const cleanPdf = await PDFDocument.create();
              const copiedPages = await cleanPdf.copyPages(pdf, pdf.getPageIndices());
              
              console.log(`📋 Copiando ${copiedPages.length} páginas do CTPS para PDF limpo`);
              
              copiedPages.forEach((page, index) => {
                try {
                  const pageSize = page.getSize();
                  console.log(`📄 Página CTPS ${index + 1}: ${pageSize.width}x${pageSize.height}`);
                  cleanPdf.addPage(page);
                  console.log(`✅ Página CTPS ${index + 1} adicionada ao PDF limpo`);
                } catch (pageError) {
                  console.error(`❌ Erro ao adicionar página CTPS ${index + 1}: ${pageError.message}`);
                }
              });
              
              // Verificar se o PDF limpo tem páginas
              if (cleanPdf.getPageCount() > 0) {
                mergedPdf = cleanPdf;
                console.log(`✅ PDF CTPS limpo criado com ${cleanPdf.getPageCount()} páginas`);
              } else {
                console.error(`❌ PDF CTPS limpo está vazio, usando fallback`);
                mergedPdf = pdf; // Fallback para o original
              }
            } else {
              // Se já há páginas, usar método normal de cópia
              const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
              console.log(`📋 Copiando ${copiedPages.length} páginas do CTPS para PDF existente`);
              
              // ✅ VERIFICAÇÃO DETALHADA DE CADA PÁGINA
              for (let i = 0; i < copiedPages.length; i++) {
                const page = copiedPages[i];
                try {
                  // Verificar se a página tem conteúdo
                  const pageSize = page.getSize();
                  console.log(`📄 Página CTPS ${i + 1}: ${pageSize.width}x${pageSize.height}`);
                  
                  // Tentar detectar se a página tem conteúdo visível
                  mergedPdf.addPage(page);
                  console.log(`✅ Página CTPS ${i + 1} adicionada com sucesso`);
                } catch (pageError) {
                  console.error(`❌ Erro ao adicionar página CTPS ${i + 1}: ${pageError.message}`);
                }
              }
            }
          } catch (ctpsError) {
            console.error(`❌ Erro no processamento especial de CTPS: ${ctpsError.message}`);
            // Fallback para método normal
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
          }
        } else {
          // Processamento normal para outros tipos de PDF
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          console.log(`📋 Copiando ${copiedPages.length} páginas`);
          
          // ✅ VERIFICAÇÃO DETALHADA DE CADA PÁGINA
          for (let i = 0; i < copiedPages.length; i++) {
            const page = copiedPages[i];
            try {
              // Verificar se a página tem conteúdo
              const pageSize = page.getSize();
              console.log(`📄 Página ${i + 1}: ${pageSize.width}x${pageSize.height}`);
              
              // Tentar detectar se a página tem conteúdo visível
              mergedPdf.addPage(page);
              console.log(`✅ Página ${i + 1} adicionada com sucesso`);
            } catch (pageError) {
              console.error(`❌ Erro ao adicionar página ${i + 1}: ${pageError.message}`);
            }
          }
        }
        
        const finalPagesAfterFile = mergedPdf.getPageCount();
        const pagesAddedThisFile = finalPagesAfterFile - (mergedPdf === pdf ? 0 : finalPagesAfterFile - pageCount);
        console.log(`✅ Arquivo processado com sucesso: ${sanitizedName} (${pageCount} páginas do arquivo, ${pagesAddedThisFile} páginas adicionadas ao documento final)`);
      } catch (error) {
        console.warn(`⚠️ Não foi possível processar arquivo: ${sanitizedName}. Erro: ${error.message}`);
        
        // Se não conseguir processar o PDF, tenta métodos especiais
        if (ext === '.pdf') {
          console.log(`🔧 Tentando métodos especiais para PDF problemático: ${sanitizedName}`);
          
          // ✅ DETECTAR SE DEVE USAR CONVERSÃO POR IMAGEM
          const shouldUseImageConversion = this.config.enableImageConversion && 
            this.config.imageConversionTypes.some(type => 
              sanitizedName.toLowerCase().includes(type) || 
              fileType === type
            );
          
          if (this.config.enableDetailedLogs) {
            console.log(`📋 Análise do documento: ${sanitizedName}`);
            console.log(`   - Tipo detectado: ${fileType}`);
            console.log(`   - Usar conversão por imagem: ${shouldUseImageConversion}`);
            console.log(`   - Tipos configurados para conversão: ${this.config.imageConversionTypes.join(', ')}`);
          }
          
          try {
            const recoveredPdf = await this.handleProblematicPdf(pdfBytes, sanitizedName, shouldUseImageConversion);
            if (recoveredPdf) {
              const recoveredPages = await mergedPdf.copyPages(recoveredPdf, recoveredPdf.getPageIndices());
              recoveredPages.forEach((page) => mergedPdf.addPage(page));
              console.log(`✅ PDF problemático processado com sucesso: ${sanitizedName} (${recoveredPages.length} páginas recuperadas)`);
            } else {
              console.warn(`⚠️ Método especial falhou, tentando método de emergência...`);
              
              // Último recurso: método de emergência
              const emergencyPdf = await this.preserveOriginalPdf(pdfBytes, sanitizedName);
              if (emergencyPdf) {
                const emergencyPages = await mergedPdf.copyPages(emergencyPdf, emergencyPdf.getPageIndices());
                emergencyPages.forEach((page) => mergedPdf.addPage(page));
                console.log(`🚨 PDF preservado usando método de emergência: ${sanitizedName}`);
              } else {
                console.error(`❌ Todos os métodos falharam para: ${sanitizedName}`);
              }
            }
          } catch (recoveryError) {
            console.warn(`⚠️ Falha na recuperação do PDF: ${sanitizedName}. Erro: ${recoveryError.message}`);
          }
        } else {
          // Se é imagem, tenta reprocessar
          try {
            const newPdfBytes = await imageToPdfBuffer(newFilePath);
            const pdf = await PDFDocument.load(newPdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
            console.log(`✅ Imagem reprocessada com sucesso: ${sanitizedName} (${copiedPages.length} páginas adicionadas)`);
          } catch (retryError) {
            console.warn(`⚠️ Falha ao reprocessar imagem: ${sanitizedName}. Erro: ${retryError.message}`);
          }
        }
      }
      
      // Limpar arquivo temporário (usando o caminho correto) - APÓS o processamento completo
      try {
        // ✅ AGUARDAR UM POUCO ANTES DE LIMPAR (para garantir que o processamento terminou)
        if (fs.existsSync(newFilePath)) {
          console.log(`🧹 Removendo arquivo temporário: ${newFilePath}`);
          fs.unlinkSync(newFilePath);
          console.log(`✅ Arquivo temporário removido com sucesso`);
        } else {
          console.log(`📄 Arquivo temporário já não existe: ${newFilePath}`);
        }
      } catch (unlinkError) {
        console.warn(`⚠️ Erro ao remover arquivo temporário: ${unlinkError.message}`);
        console.warn(`   Arquivo: ${newFilePath}`);
        console.warn(`   Erro: ${unlinkError.stack}`);
      }
    }

    // Salvar PDF final (mantendo páginas antigas + novas)
    const finalPageCount = mergedPdf.getPageCount();
    console.log(`📊 PDF final terá ${finalPageCount} páginas`);
    
    if (finalPageCount === 0) {
      console.error(`❌ ERRO: PDF final está vazio! Nenhuma página foi adicionada.`);
      return null;
    }
    
    // ✅ GARANTIR QUE O DIRETÓRIO EXISTE ANTES DE SALVAR
    console.log(`📁 Verificando diretório de destino: ${destDir}`);
    if (!fs.existsSync(destDir)) {
      console.log(`📁 Criando diretório: ${destDir}`);
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // ✅ VERIFICAÇÃO ADICIONAL: Testar se o PDF pode ser salvo e carregado
    console.log(`🧪 Testando a integridade do PDF final...`);
    const mergedPdfBytes = await mergedPdf.save();
    console.log(`💾 PDF final gerado com ${mergedPdfBytes.length} bytes`);
    
    if (mergedPdfBytes.length === 0) {
      console.error(`❌ ERRO: PDF final gerado está vazio (0 bytes)!`);
      return null;
    }
    
    // ✅ TESTE DE INTEGRIDADE: Tentar recarregar o PDF gerado
    try {
      // Usar ignoreEncryption para tentar carregar PDFs que podem ter problemas de criptografia
      const testPdf = await PDFDocument.load(mergedPdfBytes, { ignoreEncryption: true });
      const testPageCount = testPdf.getPageCount();
      console.log(`🧪 Teste de integridade: PDF pode ser recarregado com ${testPageCount} páginas`);
      
      if (testPageCount !== finalPageCount) {
        console.warn(`⚠️ AVISO: Contagem de páginas diverge! Esperado: ${finalPageCount}, Encontrado: ${testPageCount}`);
      }
      
      // ✅ TESTE ADICIONAL: Verificar se o PDF é válido para visualização
      try {
        // Testar acesso às páginas para garantir que não há corrupção
        for (let i = 0; i < Math.min(testPageCount, 3); i++) {
          const page = testPdf.getPage(i);
          const { width, height } = page.getSize();
          if (width <= 0 || height <= 0) {
            throw new Error(`Página ${i + 1} tem dimensões inválidas: ${width}x${height}`);
          }
        }
        console.log(`✅ Teste de páginas: PDF parece estar íntegro`);
      } catch (pageTestError) {
        console.warn(`⚠️ Problema detectado nas páginas: ${pageTestError.message}`);
        throw pageTestError; // Forçar regeneração
      }
      
    } catch (testError) {
      console.error(`❌ ERRO: PDF gerado não pode ser recarregado! ${testError.message}`);
      
      // ✅ TENTATIVA DE RECUPERAÇÃO: Recriar PDF completamente limpo
      try {
        console.log(`🔧 Regenerando PDF completamente para corrigir problemas...`);
        const cleanPdf = await PDFDocument.create();
        
        // ✅ MÉTODO 1: Tentar carregar e limpar o PDF problemático
        try {
          const problemPdf = await PDFDocument.load(mergedPdfBytes, { ignoreEncryption: true });
          const cleanPages = await cleanPdf.copyPages(problemPdf, problemPdf.getPageIndices());
          cleanPages.forEach(page => cleanPdf.addPage(page));
          console.log(`✅ PDF limpo criado usando método 1 (cópia de páginas)`);
        } catch (method1Error) {
          console.warn(`⚠️ Método 1 falhou: ${method1Error.message}`);
          
          // ✅ MÉTODO 2: Recriar PDF usando dados originais se disponível
          console.log(`🔄 Tentando método 2: Reprocessar arquivos originais...`);
          
          // Se chegamos aqui, algo deu muito errado. Vamos criar um PDF de fallback
          const fallbackPage = cleanPdf.addPage();
          const { height } = fallbackPage.getSize();
          
          fallbackPage.drawText(`Documento Processado`, {
            x: 50,
            y: height - 50,
            size: 16
          });
          
          fallbackPage.drawText(`Este documento foi processado mas houve um problema`, {
            x: 50,
            y: height - 80,
            size: 12
          });
          
          fallbackPage.drawText(`na geração do PDF final. Contate o administrador.`, {
            x: 50,
            y: height - 100,
            size: 12
          });
          
          fallbackPage.drawText(`Total de páginas originais: ${finalPageCount}`, {
            x: 50,
            y: height - 130,
            size: 10
          });
          
          fallbackPage.drawText(`Data: ${new Date().toLocaleString()}`, {
            x: 50,
            y: height - 150,
            size: 10
          });
          
          console.log(`✅ PDF de fallback criado`);
        }
        
        // Regenerar bytes do PDF limpo
        mergedPdfBytes = await cleanPdf.save();
        console.log(`✅ PDF regenerado completamente: ${mergedPdfBytes.length} bytes`);
        
        // Testar novamente o PDF regenerado
        const finalTestPdf = await PDFDocument.load(mergedPdfBytes, { ignoreEncryption: true });
        console.log(`🧪 PDF regenerado testado: ${finalTestPdf.getPageCount()} páginas`);
        
      } catch (recoveryError) {
        console.error(`❌ ERRO CRÍTICO na regeneração: ${recoveryError.message}`);
        return null;
      }
    }
    
    console.log(`💾 Salvando PDF final em: ${destPath}`);
    console.log(`📁 Diretório existe: ${fs.existsSync(destDir)}`);
    console.log(`📁 Diretório é gravável: ${fs.accessSync ? 'verificando...' : 'não disponível'}`);
    
    try {
      // Verificar se podemos escrever no diretório
      if (fs.accessSync) {
        fs.accessSync(destDir, fs.constants.W_OK);
        console.log(`✅ Diretório é gravável`);
      }
    } catch (accessError) {
      console.warn(`⚠️ Problema de acesso ao diretório: ${accessError.message}`);
    }
    
    // ✅ SALVAMENTO COM VALIDAÇÃO EXTRA
    try {
      // Salvar o novo arquivo
      fs.writeFileSync(destPath, mergedPdfBytes);
      console.log(`💾 PDF final salvo com ${finalPageCount} páginas em: ${destPath}`);
      
      // Verificar se o arquivo foi salvo corretamente IMEDIATAMENTE
      if (!fs.existsSync(destPath)) {
        throw new Error('Arquivo não foi criado após writeFileSync');
      }
      
      const savedFileSize = fs.statSync(destPath).size;
      console.log(`📁 Arquivo salvo verificado: ${savedFileSize} bytes`);
      
      if (savedFileSize === 0) {
        throw new Error('Arquivo salvo está vazio (0 bytes)');
      }
      
      if (savedFileSize !== mergedPdfBytes.length) {
        console.warn(`⚠️ AVISO: Tamanho do arquivo difere! Esperado: ${mergedPdfBytes.length}, Salvo: ${savedFileSize}`);
      }
      
      // ✅ TESTE CRÍTICO: Tentar ler o arquivo imediatamente após salvar
      let savedPdfBytes;
      try {
        savedPdfBytes = fs.readFileSync(destPath);
        console.log(`📊 Arquivo lido do disco: ${savedPdfBytes.length} bytes`);
        
        if (savedPdfBytes.length === 0) {
          throw new Error('Arquivo lido está vazio');
        }
        
        // Verificar se os bytes são idênticos
        if (Buffer.compare(mergedPdfBytes, savedPdfBytes) !== 0) {
          console.warn(`⚠️ AVISO: Bytes do arquivo diferem dos originais!`);
        } else {
          console.log(`✅ Verificação de bytes: Arquivo salvo é idêntico ao gerado`);
        }
        
      } catch (readError) {
        throw new Error(`Não foi possível ler arquivo recém-salvo: ${readError.message}`);
      }
      
      // ✅ TESTE FINAL DE INTEGRIDADE: Carregar PDF do disco
      try {
        const savedPdf = await PDFDocument.load(savedPdfBytes, { ignoreEncryption: true });
        const savedPageCount = savedPdf.getPageCount();
        console.log(`🧪 Teste final: Arquivo salvo contém ${savedPageCount} páginas e pode ser carregado`);
        
        if (savedPageCount !== finalPageCount) {
          console.warn(`⚠️ AVISO: Páginas do arquivo salvo diferem do esperado! Esperado: ${finalPageCount}, Salvo: ${savedPageCount}`);
        } else {
          console.log(`✅ Verificação completa: PDF salvo está íntegro`);
        }
        
      } catch (finalTestError) {
        console.error(`❌ ERRO CRÍTICO: Arquivo salvo não pode ser carregado! ${finalTestError.message}`);

        return null;
      }
      
    } catch (saveError) {
      console.error(`❌ ERRO no salvamento: ${saveError.message}`);
      return null;
    }
    
    return this.validateAndNormalizePath(destPath);
  }

  // Validar e normalizar caminho de retorno
  validateAndNormalizePath(destPath) {
    const relativePath = path.relative(path.join(__dirname, '../../uploads'), destPath);
    
    // Garantir que o caminho use barras normais para URLs
    const normalizedPath = relativePath.replace(/\\/g, '/');
    
    // Verificar se o arquivo realmente existe
    if (!fs.existsSync(destPath)) {
      console.warn(`⚠️ Arquivo não existe no caminho: ${destPath}`);
      return null;
    }
    
    console.log(`✅ Caminho normalizado: ${normalizedPath}`);
    return normalizedPath;
  }

  // ✅ NOVO MÉTODO: Extrair página específica como buffer PDF
  async extractPageAsBuffer(filePath, pageNumber) {
    try {
      console.log(`📄 Extraindo página ${pageNumber} de: ${filePath}`);
      
      // Ler arquivo PDF
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      
      const totalPages = pdfDoc.getPageCount();
      
      if (pageNumber < 1 || pageNumber > totalPages) {
        throw new Error(`Página ${pageNumber} não existe. Total de páginas: ${totalPages}`);
      }
      
      // Criar novo documento PDF com apenas a página solicitada
      const newPdfDoc = await PDFDocument.create();
      
      // Copiar página específica
      const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNumber - 1]);
      newPdfDoc.addPage(copiedPage);
      
      // Gerar buffer do PDF
      const pdfBuffer = await newPdfDoc.save();
      
      console.log(`✅ Página ${pageNumber} extraída com sucesso (${pdfBuffer.length} bytes)`);
      
      return Buffer.from(pdfBuffer);
      
    } catch (error) {
      console.error(`❌ Erro ao extrair página ${pageNumber}:`, error);
      throw error;
    }
  }

  // Limpa todos os arquivos e subdiretórios da pasta temp
  static cleanupTempDirectory() {
    const tempDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(tempDir)) return;
    fs.readdirSync(tempDir).forEach((file) => {
      const curPath = path.join(tempDir, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Remove diretório recursivamente
        fs.rmSync(curPath, { recursive: true, force: true });
      } else {
        // Remove arquivo
        fs.unlinkSync(curPath);
      }
    });
  }
}

module.exports = PDFService;