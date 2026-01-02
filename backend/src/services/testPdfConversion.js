// ✅ SCRIPT DE TESTE PARA CONVERSÃO PDF->IMAGEM->PDF
// Execute este arquivo para testar a funcionalidade de conversão

const PDFService = require('./pdfService');
const fs = require('fs');
const path = require('path');

async function testarConversaoPorImagem() {
  console.log(`🧪 ====== TESTE DE CONVERSÃO PDF->IMAGEM->PDF ======`);
  
  // ✅ PASSO 1: Verificar dependências
  console.log(`\n🔍 Verificando dependências...`);
  
  try {
    require('pdf2pic');
    console.log(`✅ pdf2pic: OK`);
  } catch (e) {
    console.log(`❌ pdf2pic: FALTANDO - Execute: npm install pdf2pic`);
    return;
  }
  
  try {
    require('sharp');
    console.log(`✅ sharp: OK`);
  } catch (e) {
    console.log(`❌ sharp: FALTANDO - Execute: npm install sharp`);
    return;
  }
  
  try {
    require('pdf-lib');
    console.log(`✅ pdf-lib: OK`);
  } catch (e) {
    console.log(`❌ pdf-lib: FALTANDO - Execute: npm install pdf-lib`);
    return;
  }
  
  // ✅ PASSO 2: Criar diretório de teste
  const testDir = path.join(__dirname, '../../uploads/test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
    console.log(`📁 Diretório de teste criado: ${testDir}`);
  }
  
  // ✅ PASSO 3: Criar um PDF de teste simples
  const { PDFDocument, rgb } = require('pdf-lib');
  const testPdf = await PDFDocument.create();
  
  // Adicionar algumas páginas de teste
  for (let i = 1; i <= 3; i++) {
    const page = testPdf.addPage();
    const { width, height } = page.getSize();
    
    page.drawText(`PÁGINA DE TESTE ${i}`, {
      x: 50,
      y: height - 100,
      size: 24
    });
    
    page.drawText(`Esta é uma página de teste para verificar`, {
      x: 50,
      y: height - 150,
      size: 12
    });
    
    page.drawText(`se a conversão PDF->Imagem->PDF está funcionando.`, {
      x: 50,
      y: height - 170,
      size: 12
    });
    
    page.drawText(`Página ${i} de 3`, {
      x: 50,
      y: height - 200,
      size: 10
    });
    
    // Desenhar algumas formas para testar renderização
    page.drawRectangle({
      x: 100,
      y: height - 300,
      width: 200,
      height: 50,
      borderColor: rgb(0, 0, 1), // Azul
      borderWidth: 2
    });
    
    page.drawText(`Retângulo na página ${i}`, {
      x: 120,
      y: height - 285,
      size: 10
    });
  }
  
  const testPdfBytes = await testPdf.save();
  const testPdfPath = path.join(testDir, 'teste_original.pdf');
  fs.writeFileSync(testPdfPath, testPdfBytes);
  console.log(`📄 PDF de teste criado: ${testPdfPath}`);
  console.log(`📊 Tamanho do PDF original: ${testPdfBytes.length} bytes`);
  
  // ✅ PASSO 4: Instanciar PDFService com conversão por imagem
  console.log(`\n🔧 Configurando PDFService com conversão por imagem...`);
  
  const pdfService = new PDFService(testDir, {
    enableImageConversion: true,
    imageConversionTypes: ['teste'], // Para que nosso arquivo seja processado
    dpi: 150,
    quality: 90,
    maxWidth: 1200,
    enableDetailedLogs: true
  });
  
  // ✅ PASSO 5: Testar conversão
  console.log(`\n🖼️ Iniciando conversão PDF->Imagem->PDF...`);
  
  try {
    const convertedPdf = await pdfService.convertPdfToImagePdf(testPdfBytes, 'teste_conversao.pdf');
    
    if (convertedPdf) {
      const convertedBytes = await convertedPdf.save();
      const convertedPath = path.join(testDir, 'teste_convertido.pdf');
      fs.writeFileSync(convertedPath, convertedBytes);
      
      console.log(`✅ CONVERSÃO REALIZADA COM SUCESSO!`);
      console.log(`📄 PDF convertido salvo: ${convertedPath}`);
      console.log(`📊 Páginas originais: ${testPdf.getPageCount()}`);
      console.log(`📊 Páginas convertidas: ${convertedPdf.getPageCount()}`);
      console.log(`📊 Tamanho original: ${testPdfBytes.length} bytes`);
      console.log(`📊 Tamanho convertido: ${convertedBytes.length} bytes`);
      
      // ✅ PASSO 6: Verificar se o PDF convertido pode ser carregado
      try {
        const verificationPdf = await PDFDocument.load(convertedBytes);
        const verificationPageCount = verificationPdf.getPageCount();
        console.log(`✅ Verificação: PDF convertido carregou com ${verificationPageCount} páginas`);
        
        if (verificationPageCount === testPdf.getPageCount()) {
          console.log(`✅ TESTE COMPLETO: Conversão preservou todas as páginas!`);
        } else {
          console.log(`⚠️ AVISO: Número de páginas diferente (original: ${testPdf.getPageCount()}, convertido: ${verificationPageCount})`);
        }
        
      } catch (verifyError) {
        console.log(`❌ ERRO na verificação: ${verifyError.message}`);
      }
      
    } else {
      console.log(`❌ CONVERSÃO FALHOU: convertPdfToImagePdf retornou null`);
    }
    
  } catch (conversionError) {
    console.log(`❌ ERRO na conversão: ${conversionError.message}`);
    console.log(`Stack trace:`, conversionError.stack);
  }
  
  // ✅ PASSO 7: Testar processFiles com conversão automática
  console.log(`\n🔄 Testando processFiles com detecção automática...`);
  
  try {
    // Simular arquivo de upload para CTPS
    const mockFile = {
      originalname: 'ctps_teste.pdf',
      path: testPdfPath,
      size: testPdfBytes.length,
      mimetype: 'application/pdf'
    };
    
    const result = await pdfService.processFiles(
      [mockFile],
      { id: 1, nome: 'Usuario Teste' },
      '12345678901',
      'ctps',
      null
    );
    
    if (result) {
      console.log(`✅ processFiles funcionou: ${result}`);
      
      // Verificar arquivo final
      const finalPath = path.join(testDir, '12345678901', 'ctps', 'documento.pdf');
      if (fs.existsSync(finalPath)) {
        const finalStats = fs.statSync(finalPath);
        console.log(`📄 Arquivo final existe: ${finalPath}`);
        console.log(`📊 Tamanho do arquivo final: ${finalStats.size} bytes`);
        
        // Tentar carregar para verificar
        const finalBytes = fs.readFileSync(finalPath);
        const finalPdf = await PDFDocument.load(finalBytes);
        console.log(`✅ Arquivo final carregado com ${finalPdf.getPageCount()} páginas`);
      } else {
        console.log(`❌ Arquivo final não foi criado: ${finalPath}`);
      }
    } else {
      console.log(`❌ processFiles falhou`);
    }
    
  } catch (processError) {
    console.log(`❌ ERRO no processFiles: ${processError.message}`);
  }
  
  console.log(`\n🎉 ====== TESTE CONCLUÍDO ======`);
  console.log(`📁 Arquivos de teste estão em: ${testDir}`);
  console.log(`   - teste_original.pdf: PDF original`);
  console.log(`   - teste_convertido.pdf: PDF convertido via imagens`);
  console.log(`   - 12345678901/ctps/documento.pdf: Resultado do processFiles`);
}

// ✅ EXECUTAR TESTE SE ESTE ARQUIVO FOR EXECUTADO DIRETAMENTE
if (require.main === module) {
  testarConversaoPorImagem().catch(error => {
    console.error(`❌ ERRO NO TESTE:`, error);
  });
}

module.exports = { testarConversaoPorImagem };
