const express = require('express');
const router = express.Router(); // Definindo o router
const { Lembrete } = require('../models'); // Ajuste conforme necessário
const moment = require('moment');


// Criar um novo lembrete
router.post('/lembretes', async (req, res) => {
    console.log("Dados recebidos:", req.body); // Log dos dados recebidos
    try {
        const { titulo, descricao, data, ...lembreteData } = req.body;

        // Converter a data recebida para o horário de Brasília (sem horário de verão)
        const dataLocal = moment(data).tz("America/Sao_Paulo").format(); // Convertendo para horário de Brasília

        // Verificar se já existe um lembrete com o mesmo título e data
        const existingLembrete = await Lembrete.findOne({
            where: {
                titulo,
                data: dataLocal, // Usar a data convertida
            },
        });

        if (existingLembrete) {
            return res.status(400).json({ error: 'Lembrete já existe com o mesmo título e data.' });
        }

        // Criar o lembrete com os dados filtrados
        const lembrete = await Lembrete.create({ titulo, descricao, data: dataLocal, ...lembreteData });
        res.status(201).json(lembrete);
    } catch (error) {
        console.error("Erro ao criar lembrete:", error); // Log do erro
        res.status(400).json({ error: error.message });
    }
});

// Obter todos os lembretes
router.get('/lembretes', async (req, res) => {
    try {
        const lembretes = await Lembrete.findAll();
        res.status(200).json(lembretes);
    } catch (error) {
        console.error("Erro ao obter lembretes:", error); // Log do erro
        res.status(500).json({ error: error.message });
    }
});

// Obter um lembrete por ID
router.get('/lembretes/:id', async (req, res) => {
    try {
        const lembrete = await Lembrete.findByPk(req.params.id);
        if (!lembrete) return res.status(404).json({ error: 'Lembrete não encontrado' });
        res.status(200).json(lembrete);
    } catch (error) {
        console.error("Erro ao obter lembrete:", error); // Log do erro
        res.status(500).json({ error: error.message });
    }
});

// Rota para atualizar lembrete
router.put('/lembretes/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // ou 'concluido' dependendo da estrutura do seu corpo de solicitação
  
    try {
      const lembrete = await Lembrete.findByPk(id);
      if (!lembrete) {
        return res.status(404).json({ message: 'Lembrete não encontrado' });
      }
  
      // Atualiza o status do lembrete
      lembrete.concluido = status === 'concluido'; // ou `true` se preferir
      await lembrete.save();
  
      return res.status(200).json(lembrete);
    } catch (error) {
      console.error('Erro ao atualizar lembrete:', error);
      return res.status(500).json({ message: 'Erro ao atualizar lembrete' });
    }
  });

// Deletar um lembrete
router.delete('/lembretes/:id', async (req, res) => {
    try {
        const lembrete = await Lembrete.findByPk(req.params.id);
        if (!lembrete) return res.status(404).json({ error: 'Lembrete não encontrado' });
        
        await lembrete.destroy();
        res.status(204).send(); // Devolver um status 204 No Content
    } catch (error) {
        console.error("Erro ao deletar lembrete:", error); // Log do erro
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
