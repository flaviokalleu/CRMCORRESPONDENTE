const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { VistoriaAluguel, ClienteAluguel, Aluguel } = require('../models');

const router = express.Router();

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/vistorias');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, req.params.id || 'temp');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/vistorias — Criar vistoria
router.post('/vistorias', async (req, res) => {
  try {
    const { cliente_aluguel_id, aluguel_id, tipo, data_vistoria, observacoes_gerais, checklist } = req.body;

    const vistoria = await VistoriaAluguel.create({
      cliente_aluguel_id, aluguel_id: aluguel_id || null,
      tipo: tipo || 'entrada', data_vistoria, observacoes_gerais,
      checklist: checklist || getChecklistPadrao(),
    });

    res.status(201).json(vistoria);
  } catch (error) {
    console.error('Erro ao criar vistoria:', error);
    res.status(500).json({ error: 'Erro ao criar vistoria' });
  }
});

// GET /api/vistorias/cliente/:id — Listar vistorias de um inquilino
router.get('/vistorias/cliente/:id', async (req, res) => {
  try {
    const vistorias = await VistoriaAluguel.findAll({
      where: { cliente_aluguel_id: req.params.id },
      order: [['data_vistoria', 'DESC']],
    });
    res.status(200).json(vistorias);
  } catch (error) {
    console.error('Erro ao listar vistorias:', error);
    res.status(500).json({ error: 'Erro ao listar vistorias' });
  }
});

// GET /api/vistorias/:id — Detalhes da vistoria
router.get('/vistorias/:id', async (req, res) => {
  try {
    const vistoria = await VistoriaAluguel.findByPk(req.params.id, {
      include: [
        { model: ClienteAluguel, as: 'clienteAluguel', attributes: ['id', 'nome', 'cpf'] },
        { model: Aluguel, as: 'imovel', attributes: ['id', 'nome_imovel'] },
      ],
    });
    if (!vistoria) return res.status(404).json({ error: 'Vistoria nao encontrada' });
    res.status(200).json(vistoria);
  } catch (error) {
    console.error('Erro ao buscar vistoria:', error);
    res.status(500).json({ error: 'Erro ao buscar vistoria' });
  }
});

// PUT /api/vistorias/:id — Atualizar vistoria (checklist, observações)
router.put('/vistorias/:id', async (req, res) => {
  try {
    const vistoria = await VistoriaAluguel.findByPk(req.params.id);
    if (!vistoria) return res.status(404).json({ error: 'Vistoria nao encontrada' });

    const { checklist, observacoes_gerais, status } = req.body;
    await vistoria.update({
      checklist: checklist || vistoria.checklist,
      observacoes_gerais: observacoes_gerais !== undefined ? observacoes_gerais : vistoria.observacoes_gerais,
      status: status || vistoria.status,
    });

    res.status(200).json(vistoria);
  } catch (error) {
    console.error('Erro ao atualizar vistoria:', error);
    res.status(500).json({ error: 'Erro ao atualizar vistoria' });
  }
});

// POST /api/vistorias/:id/fotos — Upload de fotos da vistoria
router.post('/vistorias/:id/fotos', upload.array('fotos', 20), async (req, res) => {
  try {
    const vistoria = await VistoriaAluguel.findByPk(req.params.id);
    if (!vistoria) return res.status(404).json({ error: 'Vistoria nao encontrada' });

    const novasFotos = req.files.map(f => ({
      url: `/uploads/vistorias/${req.params.id}/${f.filename}`,
      descricao: req.body.descricao || '',
      comodo: req.body.comodo || '',
    }));

    const fotos = [...(vistoria.fotos || []), ...novasFotos];
    await vistoria.update({ fotos });

    res.status(200).json(vistoria);
  } catch (error) {
    console.error('Erro ao upload fotos:', error);
    res.status(500).json({ error: 'Erro ao fazer upload' });
  }
});

// POST /api/vistorias/:id/gerar-pdf — Gera PDF do laudo
router.post('/vistorias/:id/gerar-pdf', async (req, res) => {
  try {
    const vistoria = await VistoriaAluguel.findByPk(req.params.id, {
      include: [
        { model: ClienteAluguel, as: 'clienteAluguel' },
        { model: Aluguel, as: 'imovel' },
      ],
    });
    if (!vistoria) return res.status(404).json({ error: 'Vistoria nao encontrada' });

    const checklist = vistoria.checklist || [];
    const checklistHtml = checklist.map(item => `
      <tr>
        <td>${item.comodo || ''}</td>
        <td>${item.item || ''}</td>
        <td class="estado-${(item.estado || '').toLowerCase()}">${item.estado || ''}</td>
        <td>${item.observacao || ''}</td>
      </tr>`).join('');

    const fotosHtml = (vistoria.fotos || []).map(f => `
      <div class="foto-item">
        <p><strong>${f.comodo || ''}</strong> - ${f.descricao || ''}</p>
      </div>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body { font-family: Arial, sans-serif; margin: 30px; font-size: 12px; }
      h1 { text-align: center; color: #0B1426; border-bottom: 3px solid #F97316; padding-bottom: 10px; }
      h2 { color: #0B1426; margin-top: 25px; }
      .info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0; }
      .info p { margin: 3px 0; }
      table { width: 100%; border-collapse: collapse; margin: 15px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #0B1426; color: white; }
      .estado-bom { color: green; font-weight: bold; }
      .estado-regular { color: orange; font-weight: bold; }
      .estado-ruim, .estado-danificado { color: red; font-weight: bold; }
      .foto-item { display: inline-block; margin: 5px; padding: 5px; border: 1px solid #ddd; border-radius: 5px; }
      .rodape { text-align: center; font-size: 10px; color: #999; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 10px; }
      .assinatura { margin-top: 50px; display: flex; justify-content: space-between; }
      .assinatura-box { text-align: center; width: 45%; }
      .assinatura-box .linha { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; }
    </style></head><body>
      <h1>LAUDO DE VISTORIA - ${(vistoria.tipo || '').toUpperCase()}</h1>
      <div class="info">
        <p><strong>Data:</strong> ${new Date(vistoria.data_vistoria + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
        <p><strong>Inquilino:</strong> ${vistoria.clienteAluguel?.nome || 'N/A'} - CPF: ${vistoria.clienteAluguel?.cpf || 'N/A'}</p>
        <p><strong>Imovel:</strong> ${vistoria.imovel?.nome_imovel || 'N/A'}</p>
        <p><strong>Tipo:</strong> Vistoria de ${vistoria.tipo}</p>
      </div>
      <h2>Checklist de Itens</h2>
      <table><thead><tr><th>Comodo</th><th>Item</th><th>Estado</th><th>Observacao</th></tr></thead>
      <tbody>${checklistHtml || '<tr><td colspan="4">Nenhum item</td></tr>'}</tbody></table>
      ${fotosHtml ? `<h2>Fotos Registradas</h2>${fotosHtml}` : ''}
      ${vistoria.observacoes_gerais ? `<h2>Observacoes Gerais</h2><p>${vistoria.observacoes_gerais}</p>` : ''}
      <div class="assinatura">
        <div class="assinatura-box"><div class="linha">Locador / Administrador</div></div>
        <div class="assinatura-box"><div class="linha">Locatario - ${vistoria.clienteAluguel?.nome || ''}</div></div>
      </div>
      <div class="rodape">Laudo gerado pelo CRM IMOB em ${new Date().toLocaleString('pt-BR')}</div>
    </body></html>`;

    const pdfDir = path.join(UPLOADS_DIR, String(vistoria.id));
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
    const pdfPath = path.join(pdfDir, `vistoria_${vistoria.id}.pdf`);

    let browser;
    try {
      browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' } });
    } finally { if (browser) await browser.close(); }

    const pdfUrl = `/uploads/vistorias/${vistoria.id}/vistoria_${vistoria.id}.pdf`;
    await vistoria.update({ pdf_url: pdfUrl, status: 'finalizado' });

    res.status(200).json({ message: 'PDF gerado', pdf_url: pdfUrl });
  } catch (error) {
    console.error('Erro ao gerar PDF da vistoria:', error);
    res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
});

// GET /api/vistorias/:id/comparativo — Comparativo entrada vs saida
router.get('/vistorias/:clienteId/comparativo', async (req, res) => {
  try {
    const entrada = await VistoriaAluguel.findOne({
      where: { cliente_aluguel_id: req.params.clienteId, tipo: 'entrada' },
      order: [['data_vistoria', 'DESC']],
    });
    const saida = await VistoriaAluguel.findOne({
      where: { cliente_aluguel_id: req.params.clienteId, tipo: 'saida' },
      order: [['data_vistoria', 'DESC']],
    });

    res.status(200).json({ entrada, saida });
  } catch (error) {
    console.error('Erro ao buscar comparativo:', error);
    res.status(500).json({ error: 'Erro ao buscar comparativo' });
  }
});

// Checklist padrão
function getChecklistPadrao() {
  const comodos = ['Sala', 'Cozinha', 'Banheiro', 'Quarto 1', 'Quarto 2', 'Area de Servico', 'Garagem'];
  const itens = ['Piso', 'Paredes', 'Teto', 'Portas', 'Janelas', 'Tomadas', 'Interruptores', 'Iluminacao'];
  const checklist = [];
  for (const comodo of comodos) {
    for (const item of itens) {
      checklist.push({ comodo, item, estado: 'bom', observacao: '' });
    }
  }
  return checklist;
}

module.exports = router;
