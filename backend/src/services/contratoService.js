const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/contratos');

const NOME_ARQUIVO_TEXTO_CONTRATO = 'contrato_editavel.txt';

// Garante que o diretorio existe
const garantirDiretorio = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Gera contrato PDF usando Puppeteer
const gerarContratoPDF = async (clienteAluguel, aluguel, options = {}) => {
  const clienteDir = path.join(UPLOADS_DIR, String(clienteAluguel.id));
  garantirDiretorio(clienteDir);

  const nomeArquivo = `contrato_${clienteAluguel.id}_${Date.now()}.pdf`;
  const caminhoArquivo = path.join(clienteDir, nomeArquivo);

  const valorExtenso = valorPorExtenso(parseFloat(clienteAluguel.valor_aluguel));
  const dataInicio = clienteAluguel.data_inicio_contrato || new Date().toISOString().split('T')[0];
  const dataFim = clienteAluguel.data_fim_contrato || calcularDataFim(dataInicio, 12);

  const textoInformado = typeof options.textoContrato === 'string' ? options.textoContrato.trim() : '';
  let textoContrato = textoInformado;

  if (!textoContrato) {
    textoContrato = carregarTextoContrato(clienteAluguel.id) || gerarTextoContrato(clienteAluguel, aluguel);
  } else {
    salvarTextoContrato(clienteAluguel.id, textoContrato);
  }

  const html = construirHtmlContrato(textoContrato);

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

const obterTextoContrato = (clienteAluguel, aluguel) => {
  return carregarTextoContrato(clienteAluguel.id) || gerarTextoContrato(clienteAluguel, aluguel);
};

const obterModeloContratoPadrao = (clienteAluguel, aluguel) => {
  return gerarTextoContrato(clienteAluguel, aluguel);
};

function getClienteContratoDir(clienteId) {
  return path.join(UPLOADS_DIR, String(clienteId));
}

function getTextoContratoPath(clienteId) {
  return path.join(getClienteContratoDir(clienteId), NOME_ARQUIVO_TEXTO_CONTRATO);
}

function salvarTextoContrato(clienteId, texto) {
  const clienteDir = getClienteContratoDir(clienteId);
  garantirDiretorio(clienteDir);
  fs.writeFileSync(getTextoContratoPath(clienteId), texto, 'utf8');
}

function carregarTextoContrato(clienteId) {
  const caminho = getTextoContratoPath(clienteId);
  if (!fs.existsSync(caminho)) return null;

  const conteudo = fs.readFileSync(caminho, 'utf8');
  return conteudo && conteudo.trim() ? conteudo : null;
}

function gerarTextoContrato(clienteAluguel, aluguel) {
  const valorBase = Number.parseFloat(clienteAluguel.valor_aluguel || aluguel?.valor_aluguel || 0);
  const valorAluguel = Number.isFinite(valorBase) ? valorBase : 0;
  const valorExtenso = valorPorExtenso(Number.isFinite(valorAluguel) ? valorAluguel : 0);
  const dataInicio = clienteAluguel.data_inicio_contrato || new Date().toISOString().split('T')[0];
  const dataFim = clienteAluguel.data_fim_contrato || calcularDataFim(dataInicio, 12);
  const multa = Number.parseFloat(clienteAluguel.percentual_multa || 2).toFixed(2);
  const juros = Number.parseFloat(clienteAluguel.percentual_juros_mora || 1).toFixed(2);
  const diaVencimento = clienteAluguel.dia_vencimento || aluguel?.dia_vencimento || '-';
  const indice = clienteAluguel.indice_reajuste || 'IGPM';

  const locadorNome = clienteAluguel.proprietario_nome || 'Conforme cadastro do administrador do sistema';
  const locadorTelefone = clienteAluguel.proprietario_telefone || '-';
  const locadorPix = clienteAluguel.proprietario_pix || '-';
  const locatarioNome = clienteAluguel.nome || '-';
  const locatarioCpf = clienteAluguel.cpf || '-';
  const locatarioEmail = clienteAluguel.email || '-';
  const locatarioTelefone = clienteAluguel.telefone || '-';
  const fiadorAtivo = Boolean(clienteAluguel.tem_fiador);

  const blocoImovel = aluguel
    ? `\n## 2. DO IMOVEL
- **Imovel:** ${aluguel.nome_imovel || '-'}
- **Descricao:** ${aluguel.descricao || '-'}
- **Quartos:** ${aluguel.quartos ?? '-'}
- **Banheiros:** ${aluguel.banheiro ?? '-'}
`
    : '';

  const blocoFiador = fiadorAtivo
    ? `\n## ${aluguel ? '3' : '2'}. DO FIADOR
- **Nome:** ${clienteAluguel.fiador_nome || '-'}
- **CPF:** ${clienteAluguel.fiador_cpf || '-'}
- **Telefone:** ${clienteAluguel.fiador_telefone || '-'}
- **E-mail:** ${clienteAluguel.fiador_email || '-'}

O FIADOR declara ciencia integral deste contrato, obrigando-se solidariamente pelo cumprimento das obrigacoes do LOCATARIO, nos termos da legislacao civil aplicavel.
`
    : '';

  const base = aluguel ? 3 : 2;
  const offsetFiador = fiadorAtivo ? 1 : 0;
  const secaoValorNumero = String(base + offsetFiador);
  const secaoPrazoNumero = String(base + 1 + offsetFiador);
  const secaoReajusteNumero = String(base + 2 + offsetFiador);
  const secaoMultaNumero = String(base + 3 + offsetFiador);
  const secaoObrigacoesNumero = String(base + 4 + offsetFiador);
  const secaoLocadorNumero = String(base + 5 + offsetFiador);
  const secaoRescisaoNumero = String(base + 6 + offsetFiador);
  const secaoDisposicoesNumero = String(base + 7 + offsetFiador);
  const secaoForoNumero = String(base + 8 + offsetFiador);

  return `# CONTRATO DE LOCACAO RESIDENCIAL (LINGUAGEM SIMPLES)

## RESUMO RAPIDO
- **Quem aluga (LOCADOR):** ${locadorNome}
- **Quem mora no imovel (LOCATARIO):** ${locatarioNome}
- **Valor do aluguel:** R$ ${valorAluguel.toFixed(2)} (${valorExtenso})
- **Dia de pagamento:** dia ${diaVencimento} de cada mes
- **Prazo do contrato:** de ${formatarData(dataInicio)} ate ${formatarData(dataFim)}

Este contrato foi escrito para ficar facil de entender. Em caso de duvida, as partes podem pedir orientacao juridica.

## 1. QUEM SAO AS PARTES
- **LOCADOR:** ${locadorNome}
- **Telefone LOCADOR:** ${locadorTelefone}
- **PIX LOCADOR:** ${locadorPix}
- **LOCATARIO:** ${locatarioNome}
- **CPF:** ${locatarioCpf}
- **E-mail:** ${locatarioEmail}
- **Telefone:** ${locatarioTelefone}

## 2. DADOS DO IMOVEL
${aluguel ? `- **Imovel:** ${aluguel.nome_imovel || '-'}
- **Descricao:** ${aluguel.descricao || '-'}
- **Quartos:** ${aluguel.quartos ?? '-'}
- **Banheiros:** ${aluguel.banheiro ?? '-'}` : '- Dados do imovel nao informados.'}

${fiadorAtivo ? `## 3. DADOS DO FIADOR
- **Nome:** ${clienteAluguel.fiador_nome || '-'}
- **CPF:** ${clienteAluguel.fiador_cpf || '-'}
- **Telefone:** ${clienteAluguel.fiador_telefone || '-'}
- **E-mail:** ${clienteAluguel.fiador_email || '-'}

O fiador concorda em responder pelo contrato se o locatario nao cumprir com os pagamentos e obrigacoes.
` : ''}

## ${secaoValorNumero}. VALOR E FORMA DE PAGAMENTO
O aluguel mensal sera de **R$ ${valorAluguel.toFixed(2)}** (${valorExtenso}).

O vencimento sera todo dia **${diaVencimento}** de cada mes.

O pagamento podera ser feito por PIX, boleto ou cartao, conforme combinado com o LOCADOR.

Se o locatario nao receber boleto, mensagem ou link de pagamento, mesmo assim deve pagar no dia certo.

## ${secaoPrazoNumero}. TEMPO DE VIGENCIA
Este contrato vale de **${formatarData(dataInicio)}** ate **${formatarData(dataFim)}**.

Ao final desse periodo, as partes podem renovar com novo acordo.

## ${secaoReajusteNumero}. REAJUSTE DO VALOR
Uma vez por ano, o aluguel pode ser reajustado pelo indice **${indice}** (ou outro indice que substitua legalmente).

## ${secaoMultaNumero}. ATRASO NO PAGAMENTO
Se houver atraso:
- multa de **${multa}%** sobre o valor do aluguel;
- juros de **${juros}%** ao mes.

## ${secaoObrigacoesNumero}. O QUE O LOCATARIO PRECISA FAZER
- Pagar o aluguel e encargos na data correta;
- Cuidar do imovel;
- Nao fazer obra estrutural sem autorizacao;
- Avisar problemas no imovel assim que perceber;
- Devolver o imovel em boas condicoes ao final do contrato, salvo desgaste natural de uso.

## ${secaoLocadorNumero}. O QUE O LOCADOR PRECISA FAZER
- Entregar o imovel em condicoes de uso;
- Respeitar o uso tranquilo do imovel pelo locatario;
- Informar claramente os meios de pagamento;
- Cumprir a legislacao aplicavel.

## ${secaoRescisaoNumero}. ENCERRAMENTO ANTES DO PRAZO
Se o LOCATARIO quiser encerrar antes do prazo, pagara multa proporcional, limitada ao equivalente a 3 alugueis, conforme regra legal e periodo restante do contrato.

Se houver descumprimento grave de qualquer parte, o contrato pode ser encerrado conforme a lei.

## ${secaoDisposicoesNumero}. REGRAS GERAIS
- Alteracoes neste contrato devem ser feitas por escrito;
- Tolerancia em um momento nao significa perda de direito depois;
- Este contrato segue a Lei do Inquilinato (Lei 8.245/1991) e o Codigo Civil.

## ${secaoForoNumero}. ONDE RESOLVER CONFLITOS
Fica escolhido o foro da comarca de Valparaiso de Goias - GO para resolver questoes deste contrato.

Por estarem de acordo, as partes assinam este documento.

Valparaiso de Goias, ${formatarDataCompleta(new Date())}

---

**LOCADOR**

**LOCATARIO - ${locatarioNome}**

---

Contrato gerado automaticamente pelo sistema CRM IMOB em ${new Date().toLocaleString('pt-BR')}`;
}

function escaparHtml(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function construirHtmlContrato(textoContrato) {
  const conteudo = markdownToHtml(textoContrato);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page { size: A4; margin: 22mm 16mm 18mm 16mm; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 12.5px;
      line-height: 1.65;
      color: #1f2937;
      margin: 0;
      word-wrap: break-word;
    }
    .documento {
      width: 100%;
    }
    h1 {
      font-size: 20px;
      text-align: center;
      letter-spacing: 0.5px;
      margin: 0 0 18px 0;
      text-transform: uppercase;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 8px;
    }
    h2 {
      font-size: 14px;
      margin: 18px 0 8px;
      text-transform: uppercase;
      color: #111827;
    }
    p {
      margin: 0 0 8px;
      text-align: justify;
    }
    ul, ol {
      margin: 6px 0 12px 20px;
      padding: 0;
    }
    li {
      margin: 0 0 6px;
    }
    hr {
      border: none;
      border-top: 1px solid #d1d5db;
      margin: 18px 0;
    }
    strong {
      font-weight: 700;
      color: #111827;
    }
  </style>
</head>
<body>
  <main class="documento">${conteudo}</main>
</body>
</html>`;
}

function markdownToHtml(markdown) {
  const lines = String(markdown || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  const html = [];
  let listMode = null;

  const closeList = () => {
    if (listMode) {
      html.push(`</${listMode}>`);
      listMode = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    if (/^---+$/.test(line)) {
      closeList();
      html.push('<hr />');
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const content = renderInlineMarkdown(headingMatch[2]);
      html.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (listMode !== 'ul') {
        closeList();
        listMode = 'ul';
        html.push('<ul>');
      }
      html.push(`<li>${renderInlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (listMode !== 'ol') {
        closeList();
        listMode = 'ol';
        html.push('<ol>');
      }
      html.push(`<li>${renderInlineMarkdown(olMatch[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  closeList();
  return html.join('');
}

function renderInlineMarkdown(text) {
  let value = escaparHtml(text);
  value = value.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  value = value.replace(/__(.+?)__/g, '<strong>$1</strong>');
  return value;
}

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
  obterTextoContrato,
  obterModeloContratoPadrao,
  calcularReajuste,
  verificarContratosReajuste,
};
