// ✅ EXEMPLO DE USO DO PDFSERVICE COM CONVERSÃO POR IMAGEM
// Este arquivo demonstra como configurar e usar o PDFService atualizado

const PDFService = require('./pdfService');
const path = require('path');

// ✅ CONFIGURAÇÃO 1: PDFService padrão (conversão por imagem ativada)
const pdfServiceDefault = new PDFService(path.join(__dirname, '../../uploads'));

// ✅ CONFIGURAÇÃO 2: PDFService com conversão por imagem personalizada
const pdfServiceCustom = new PDFService(path.join(__dirname, '../../uploads'), {
  // Ativar conversão por imagem para documentos problemáticos
  enableImageConversion: true,
  
  // Tipos de documento que devem usar conversão por imagem
  imageConversionTypes: ['ctps', 'carteira', 'rg', 'cpf'], // Adicionar mais tipos se necessário
  
  // Configurações da conversão por imagem
  dpi: 200, // Maior qualidade
  quality: 90, // Melhor qualidade de imagem
  maxWidth: 1500, // Maior resolução
  format: 'jpeg',
  
  // Logs detalhados
  enableDetailedLogs: true
});

// ✅ CONFIGURAÇÃO 3: PDFService sem conversão por imagem (modo legado)
const pdfServiceLegacy = new PDFService(path.join(__dirname, '../../uploads'), {
  enableImageConversion: false,
  enableDetailedLogs: false
});

// ✅ EXEMPLO DE USO EM UMA ROTA DE UPLOAD
async function exemploUploadCliente(req, res) {
  try {
    const { cpf, tipo_documento } = req.body;
    const files = req.files; // Arquivos enviados via multer
    
    // Selecionar PDFService baseado no tipo de documento
    let pdfService;
    
    if (tipo_documento === 'ctps' || tipo_documento === 'carteira_trabalho') {
      // Para CTPS, usar configuração com conversão por imagem de alta qualidade
      pdfService = pdfServiceCustom;
      console.log(`📋 Usando PDFService com conversão por imagem para ${tipo_documento}`);
    } else {
      // Para outros documentos, usar configuração padrão
      pdfService = pdfServiceDefault;
      console.log(`📋 Usando PDFService padrão para ${tipo_documento}`);
    }
    
    // Processar arquivos
    const processedPath = await pdfService.processFiles(
      files,
      req.user,
      cpf,
      tipo_documento,
      null // existingPath - sempre null para garantir isolamento
    );
    
    if (processedPath) {
      console.log(`✅ Documentos processados com sucesso: ${processedPath}`);
      res.json({ 
        success: true, 
        path: processedPath,
        message: 'Documentos processados com sucesso',
        usedImageConversion: pdfService.config.enableImageConversion
      });
    } else {
      console.error(`❌ Falha no processamento dos documentos`);
      res.status(500).json({ 
        success: false, 
        message: 'Erro no processamento dos documentos' 
      });
    }
    
  } catch (error) {
    console.error(`❌ Erro no upload: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: error.message 
    });
  }
}

// ✅ EXEMPLO DE TESTE MANUAL
async function testeConversaoPorImagem() {
  console.log(`🧪 Iniciando teste de conversão por imagem`);
  
  const fs = require('fs');
  
  // Simuler um arquivo PDF problemático
  const testPdfPath = path.join(__dirname, '../../uploads/test_problematic.pdf');
  
  if (!fs.existsSync(testPdfPath)) {
    console.log(`❌ Arquivo de teste não encontrado: ${testPdfPath}`);
    return;
  }
  
  const pdfBytes = fs.readFileSync(testPdfPath);
  const fileName = 'teste_ctps.pdf';
  
  try {
    const convertedPdf = await pdfServiceCustom.convertPdfToImagePdf(pdfBytes, fileName);
    
    if (convertedPdf) {
      const outputPath = path.join(__dirname, '../../uploads/converted_test.pdf');
      const pdfBytesOutput = await convertedPdf.save();
      fs.writeFileSync(outputPath, pdfBytesOutput);
      
      console.log(`✅ Teste concluído! PDF convertido salvo em: ${outputPath}`);
      console.log(`📊 Páginas no PDF convertido: ${convertedPdf.getPageCount()}`);
    } else {
      console.log(`❌ Conversão falhou`);
    }
  } catch (error) {
    console.error(`❌ Erro no teste: ${error.message}`);
  }
}

// ✅ UTILITÁRIO PARA VERIFICAR DEPENDÊNCIAS
function verificarDependencias() {
  console.log(`🔍 Verificando dependências do PDFService...`);
  
  try {
    require('pdf2pic');
    console.log(`✅ pdf2pic: Instalado`);
  } catch (e) {
    console.log(`❌ pdf2pic: NÃO instalado - Execute: npm install pdf2pic`);
  }
  
  try {
    require('sharp');
    console.log(`✅ sharp: Instalado`);
  } catch (e) {
    console.log(`❌ sharp: NÃO instalado - Execute: npm install sharp`);
  }
  
  try {
    require('pdf-lib');
    console.log(`✅ pdf-lib: Instalado`);
  } catch (e) {
    console.log(`❌ pdf-lib: NÃO instalado - Execute: npm install pdf-lib`);
  }
}

module.exports = {
  pdfServiceDefault,
  pdfServiceCustom,
  pdfServiceLegacy,
  exemploUploadCliente,
  testeConversaoPorImagem,
  verificarDependencias
};

// Para testar diretamente este arquivo:
if (require.main === module) {
  console.log(`🧪 Executando verificação de dependências...`);
  verificarDependencias();
  
  // Descomentar para executar teste
  // testeConversaoPorImagem();
}
