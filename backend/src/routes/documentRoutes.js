const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const bb = require('express-busboy');
const { authenticateToken } = require('../middleware/authMiddleware'); // Corrija o caminho se necessário

const router = express.Router();

// Configuração do express-busboy
bb.extend(router, {
  upload: true,
  path: path.join(__dirname, '../uploads'), // Diretório base para uploads
  allowedPath: /./, // Permite todas as rotas
  mimeTypeLimit: ['application/pdf'], // Opcional: restringe a PDFs
  filename: (fieldname, file, filename, encoding, mimetype) => {
    // Gera um nome de arquivo único para evitar conflitos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    return `${uniqueSuffix}-${filename}`;
  }
});

// Middleware para logar os arquivos recebidos (para depuração)
const logFiles = (req, res, next) => {
  console.log('Arquivos recebidos:', req.files);
  console.log('Corpo da requisição:', req.body);
  next();
};

// Rota para upload de documentos
router.post('/upload', authenticateToken, logFiles, async (req, res) => {
  const { username, cpf } = req.body;

  // Validação básica para garantir que username e cpf foram fornecidos
  if (!username || !cpf) {
    return res.status(400).json({ error: 'Username e CPF são obrigatórios' });
  }

  try {
    // Criar o diretório de destino
    const uploadPath = path.join(__dirname, `../Uploads/${username}/${cpf}`);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Criar o PDF com os documentos
    const doc = new PDFDocument();
    const pdfPath = path.join(uploadPath, 'documentacao.pdf');
    doc.pipe(fs.createWriteStream(pdfPath));

    doc.fontSize(18).text('Documentação do Cliente', { align: 'center' });
    doc.moveDown();

    // Adicionar todos os arquivos recebidos, agrupados por campo
    if (req.files && Object.keys(req.files).length > 0) {
      Object.keys(req.files).forEach(field => {
        doc.fontSize(14).text(`${field}:`);
        const files = Array.isArray(req.files[field]) ? req.files[field] : [req.files[field]];
        files.forEach(file => {
          // Mover o arquivo para o diretório correto
          const finalPath = path.join(uploadPath, path.basename(file.file));
          fs.renameSync(file.file, finalPath);
          doc.fontSize(12).text(`- ${path.basename(file.file)}`);
        });
        doc.moveDown();
      });
    } else {
      doc.fontSize(14).text('Nenhum arquivo enviado.');
    }

    doc.end();

    res.status(200).json({ message: 'Arquivos enviados e PDF gerado com sucesso' });
  } catch (error) {
    console.error('Erro ao processar arquivos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware para tratamento de erros genéricos
router.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

module.exports = router;