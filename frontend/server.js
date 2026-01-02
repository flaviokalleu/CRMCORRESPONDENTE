const express = require('express');
const path = require('path');
const compression = require('compression');
require('dotenv').config(); // Carrega as variáveis de ambiente do .env

const app = express();

// Ativa a compressão para servir arquivos estáticos comprimidos
app.use(compression());

// Servir arquivos estáticos da pasta 'build' (inclui 'public')
app.use(express.static(path.join(__dirname, 'build')));

// Servir arquivos da pasta 'public' diretamente, como as imagens
app.use(express.static(path.join(__dirname, 'public')));

// Rota padrão que retorna o arquivo index.html para qualquer rota desconhecida
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Define a porta do servidor a partir do .env ou usa 3333 como padrão
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Servidor React rodando na porta ${PORT}`);
});
