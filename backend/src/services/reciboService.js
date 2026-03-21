const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/recibos');

const garantirDiretorio = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Gera recibo de pagamento em PDF
const gerarReciboPDF = async (cobranca, clienteAluguel) => {
  const clienteDir = path.join(UPLOADS_DIR, String(clienteAluguel.id));
  garantirDiretorio(clienteDir);

  const nomeArquivo = `recibo_${cobranca.id}_${Date.now()}.pdf`;
  const caminhoArquivo = path.join(clienteDir, nomeArquivo);

  const formaPagamento = {
    BOLETO: 'Boleto Bancario',
    PIX: 'PIX',
    CREDIT_CARD: 'Cartao de Credito',
    UNDEFINED: 'Pagamento Online',
  }[cobranca.billing_type] || cobranca.billing_type || 'Nao especificado';

  const mesReferencia = calcularMesReferencia(cobranca.data_vencimento);

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; border-bottom: 3px solid #F97316; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #0B1426; margin: 0; font-size: 24px; }
    .header p { color: #666; margin: 5px 0; }
    .numero { background: #F97316; color: white; display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; margin-top: 10px; }
    .secao { margin: 20px 0; }
    .secao h3 { color: #0B1426; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .dados-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .dado { padding: 8px; background: #f8f8f8; border-radius: 5px; }
    .dado label { font-size: 11px; color: #666; text-transform: uppercase; display: block; }
    .dado span { font-size: 14px; font-weight: bold; color: #333; }
    .valor-destaque { text-align: center; margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #0B1426, #162a4a); border-radius: 10px; color: white; }
    .valor-destaque .label { font-size: 14px; opacity: 0.8; }
    .valor-destaque .valor { font-size: 36px; font-weight: bold; color: #F97316; }
    .status { text-align: center; margin: 20px 0; }
    .status-badge { display: inline-block; padding: 10px 30px; border-radius: 25px; font-weight: bold; font-size: 16px; background: #22c55e; color: white; }
    .rodape { margin-top: 40px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 15px; }
    .assinatura { margin-top: 50px; text-align: center; }
    .assinatura .linha { border-top: 1px solid #333; width: 300px; margin: 0 auto; padding-top: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RECIBO DE PAGAMENTO DE ALUGUEL</h1>
    <p>CRM IMOB - Gestao Imobiliaria</p>
    <div class="numero">Recibo N. ${String(cobranca.id).padStart(6, '0')}</div>
  </div>

  <div class="secao">
    <h3>Dados do Locatario</h3>
    <div class="dados-grid">
      <div class="dado">
        <label>Nome</label>
        <span>${clienteAluguel.nome}</span>
      </div>
      <div class="dado">
        <label>CPF</label>
        <span>${clienteAluguel.cpf}</span>
      </div>
      <div class="dado">
        <label>E-mail</label>
        <span>${clienteAluguel.email}</span>
      </div>
      <div class="dado">
        <label>Telefone</label>
        <span>${clienteAluguel.telefone}</span>
      </div>
    </div>
  </div>

  <div class="secao">
    <h3>Detalhes do Pagamento</h3>
    <div class="dados-grid">
      <div class="dado">
        <label>Referencia</label>
        <span>${mesReferencia}</span>
      </div>
      <div class="dado">
        <label>Data de Vencimento</label>
        <span>${formatarData(cobranca.data_vencimento)}</span>
      </div>
      <div class="dado">
        <label>Data de Pagamento</label>
        <span>${formatarData(cobranca.data_pagamento || new Date().toISOString().split('T')[0])}</span>
      </div>
      <div class="dado">
        <label>Forma de Pagamento</label>
        <span>${formaPagamento}</span>
      </div>
    </div>
  </div>

  <div class="valor-destaque">
    <div class="label">Valor Pago</div>
    <div class="valor">R$ ${parseFloat(cobranca.valor).toFixed(2)}</div>
  </div>

  <div class="status">
    <span class="status-badge">PAGO</span>
  </div>

  <div class="assinatura">
    <div class="linha">CRM IMOB - Gestao Imobiliaria</div>
  </div>

  <div class="rodape">
    <p>Este recibo foi gerado automaticamente pelo sistema CRM IMOB.</p>
    <p>Data de emissao: ${new Date().toLocaleString('pt-BR')} | ID Asaas: ${cobranca.asaas_payment_id || 'N/A'}</p>
  </div>
</body>
</html>`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: caminhoArquivo,
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });
    console.log('Recibo PDF gerado:', caminhoArquivo);
  } finally {
    if (browser) await browser.close();
  }

  return {
    caminho: caminhoArquivo,
    nome_arquivo: nomeArquivo,
    url_relativa: `/uploads/recibos/${clienteAluguel.id}/${nomeArquivo}`,
  };
};

function formatarData(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

function calcularMesReferencia(dataVencimento) {
  if (!dataVencimento) return 'N/A';
  const d = new Date(dataVencimento + 'T00:00:00');
  const meses = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${meses[d.getMonth()]}/${d.getFullYear()}`;
}

module.exports = { gerarReciboPDF };
