const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/contratos');

// Garante que o diretorio existe
const garantirDiretorio = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Gera contrato PDF usando Puppeteer
const gerarContratoPDF = async (clienteAluguel, aluguel) => {
  const clienteDir = path.join(UPLOADS_DIR, String(clienteAluguel.id));
  garantirDiretorio(clienteDir);

  const nomeArquivo = `contrato_${clienteAluguel.id}_${Date.now()}.pdf`;
  const caminhoArquivo = path.join(clienteDir, nomeArquivo);

  const valorExtenso = valorPorExtenso(parseFloat(clienteAluguel.valor_aluguel));
  const dataInicio = clienteAluguel.data_inicio_contrato || new Date().toISOString().split('T')[0];
  const dataFim = clienteAluguel.data_fim_contrato || calcularDataFim(dataInicio, 12);

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.8; color: #222; margin: 40px 60px; }
    h1 { text-align: center; font-size: 18px; text-transform: uppercase; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { font-size: 14px; text-transform: uppercase; margin-top: 25px; color: #444; }
    .dados { background: #f8f8f8; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .dados p { margin: 5px 0; }
    .clausula { margin: 15px 0; text-align: justify; }
    .assinatura { margin-top: 60px; display: flex; justify-content: space-between; }
    .assinatura-box { text-align: center; width: 45%; }
    .assinatura-box .linha { border-top: 1px solid #333; margin-top: 60px; padding-top: 5px; }
    .rodape { text-align: center; font-size: 10px; color: #999; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px; }
  </style>
</head>
<body>
  <h1>Contrato de Locacao Residencial</h1>

  <h2>1. Das Partes</h2>
  <div class="dados">
    <p><strong>LOCADOR:</strong> Conforme cadastro do administrador do sistema</p>
    <p><strong>LOCATARIO:</strong> ${clienteAluguel.nome}</p>
    <p><strong>CPF:</strong> ${clienteAluguel.cpf}</p>
    <p><strong>E-mail:</strong> ${clienteAluguel.email}</p>
    <p><strong>Telefone:</strong> ${clienteAluguel.telefone}</p>
  </div>

  ${aluguel ? `
  <h2>2. Do Imovel</h2>
  <div class="dados">
    <p><strong>Imovel:</strong> ${aluguel.nome_imovel}</p>
    <p><strong>Descricao:</strong> ${aluguel.descricao}</p>
    <p><strong>Quartos:</strong> ${aluguel.quartos} | <strong>Banheiros:</strong> ${aluguel.banheiro}</p>
  </div>
  ` : ''}

  <h2>${aluguel ? '3' : '2'}. Do Valor e Pagamento</h2>
  <div class="clausula">
    <p>O valor mensal do aluguel e de <strong>R$ ${parseFloat(clienteAluguel.valor_aluguel).toFixed(2)}</strong> (${valorExtenso}), com vencimento todo dia <strong>${clienteAluguel.dia_vencimento}</strong> de cada mes.</p>
    <p>O pagamento devera ser realizado por meio dos canais disponibilizados pelo LOCADOR (PIX, boleto bancario ou cartao de credito).</p>
  </div>

  <h2>${aluguel ? '4' : '3'}. Do Prazo</h2>
  <div class="clausula">
    <p>O presente contrato tem vigencia de <strong>${formatarData(dataInicio)}</strong> a <strong>${formatarData(dataFim)}</strong>, podendo ser renovado mediante acordo entre as partes.</p>
  </div>

  <h2>${aluguel ? '5' : '4'}. Do Reajuste</h2>
  <div class="clausula">
    <p>O valor do aluguel sera reajustado anualmente pelo indice <strong>${clienteAluguel.indice_reajuste || 'IGPM'}</strong> (Indice Geral de Precos do Mercado) acumulado nos ultimos 12 meses, ou outro indice que venha a substitui-lo.</p>
  </div>

  <h2>${aluguel ? '6' : '5'}. Da Multa e Juros</h2>
  <div class="clausula">
    <p>Em caso de atraso no pagamento, incidira multa de <strong>${clienteAluguel.percentual_multa || 2}%</strong> sobre o valor do aluguel, acrescida de juros de mora de <strong>${clienteAluguel.percentual_juros_mora || 1}%</strong> ao mes.</p>
  </div>

  <h2>${aluguel ? '7' : '6'}. Das Obrigacoes do Locatario</h2>
  <div class="clausula">
    <p>a) Pagar pontualmente o aluguel e encargos nas datas estipuladas;</p>
    <p>b) Manter o imovel em bom estado de conservacao;</p>
    <p>c) Nao realizar modificacoes estruturais sem autorizacao previa do LOCADOR;</p>
    <p>d) Restituir o imovel nas mesmas condicoes em que o recebeu ao termino do contrato;</p>
    <p>e) Comunicar imediatamente ao LOCADOR qualquer dano ou problema no imovel.</p>
  </div>

  <h2>${aluguel ? '8' : '7'}. Da Rescisao</h2>
  <div class="clausula">
    <p>A rescisao antecipada por parte do LOCATARIO implicara no pagamento de multa equivalente a 3 (tres) alugueis vigentes, proporcional ao periodo restante do contrato.</p>
  </div>

  <h2>${aluguel ? '9' : '8'}. Do Foro</h2>
  <div class="clausula">
    <p>Fica eleito o foro da comarca de Valparaiso de Goias - GO para dirimir quaisquer duvidas oriundas do presente contrato.</p>
  </div>

  <p style="margin-top: 30px;">Por estarem justos e contratados, as partes assinam o presente instrumento em 2 (duas) vias de igual teor.</p>

  <p style="text-align: center; margin-top: 20px;">Valparaiso de Goias, ${formatarDataCompleta(new Date())}</p>

  <div class="assinatura">
    <div class="assinatura-box">
      <div class="linha">LOCADOR</div>
    </div>
    <div class="assinatura-box">
      <div class="linha">LOCATARIO - ${clienteAluguel.nome}</div>
    </div>
  </div>

  <div class="rodape">
    Contrato gerado automaticamente pelo sistema CRM IMOB em ${new Date().toLocaleString('pt-BR')}
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
    console.log('Contrato PDF gerado:', caminhoArquivo);
  } finally {
    if (browser) await browser.close();
  }

  return {
    caminho: caminhoArquivo,
    nome_arquivo: nomeArquivo,
    url_relativa: `/uploads/contratos/${clienteAluguel.id}/${nomeArquivo}`,
  };
};

// Calcula reajuste anual
const calcularReajuste = (clienteAluguel, indiceAnual) => {
  const valorAtual = parseFloat(clienteAluguel.valor_aluguel);
  const indice = indiceAnual || 5.0; // Default 5% se nao informado
  const valorReajustado = valorAtual * (1 + indice / 100);

  // Data do proximo reajuste (aniversario do contrato)
  let dataReajuste = null;
  if (clienteAluguel.data_inicio_contrato) {
    const inicio = new Date(clienteAluguel.data_inicio_contrato);
    const hoje = new Date();
    dataReajuste = new Date(hoje.getFullYear(), inicio.getMonth(), inicio.getDate());
    if (dataReajuste <= hoje) {
      dataReajuste.setFullYear(dataReajuste.getFullYear() + 1);
    }
  }

  return {
    valor_atual: valorAtual,
    indice_nome: clienteAluguel.indice_reajuste || 'IGPM',
    indice_percentual: indice,
    valor_reajustado: Math.round(valorReajustado * 100) / 100,
    diferenca: Math.round((valorReajustado - valorAtual) * 100) / 100,
    data_reajuste: dataReajuste ? dataReajuste.toISOString().split('T')[0] : null,
    dias_para_reajuste: dataReajuste ? Math.ceil((dataReajuste - new Date()) / (1000 * 60 * 60 * 24)) : null,
  };
};

// Verifica contratos proximos ao reajuste (para cron job)
const verificarContratosReajuste = async (ClienteAluguel) => {
  const clientes = await ClienteAluguel.findAll({
    where: {
      data_inicio_contrato: { [require('sequelize').Op.ne]: null },
    },
  });

  const alertas = [];
  const hoje = new Date();

  for (const cliente of clientes) {
    const inicio = new Date(cliente.data_inicio_contrato);
    const aniversario = new Date(hoje.getFullYear(), inicio.getMonth(), inicio.getDate());
    if (aniversario <= hoje) aniversario.setFullYear(aniversario.getFullYear() + 1);

    const diasParaReajuste = Math.ceil((aniversario - hoje) / (1000 * 60 * 60 * 24));

    if (diasParaReajuste === 30) {
      const reajuste = calcularReajuste(cliente);
      alertas.push({
        cliente,
        reajuste,
        dias: diasParaReajuste,
      });
    }
  }

  return alertas;
};

// Helpers
function formatarData(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

function formatarDataCompleta(date) {
  const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
}

function calcularDataFim(dataInicio, meses) {
  const d = new Date(dataInicio + 'T00:00:00');
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().split('T')[0];
}

function valorPorExtenso(valor) {
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);
  // Simplificado - retorna formato numerico legivel
  return `${inteiro.toLocaleString('pt-BR')} reais${centavos > 0 ? ` e ${centavos} centavos` : ''}`;
}

module.exports = {
  gerarContratoPDF,
  calcularReajuste,
  verificarContratosReajuste,
};
