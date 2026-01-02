const { Nota, Corretor, Correspondente, Administrador } = require('../models'); // Ajuste o caminho conforme necessário
const { getSocketIO } = require('../socket');

// Função para buscar notas pelo ID do cliente e incluir o nome do criador
const getNotasByClienteId = async (req, res) => {
    const clienteId = req.params.id;
    console.log('Cliente ID recebido:', clienteId);

    if (!clienteId) {
        return res.status(400).json({ error: 'Cliente ID é necessário' });
    }

    try {
        // Verifica se clienteId é um número
        const parsedClienteId = parseInt(clienteId, 10);
        if (isNaN(parsedClienteId)) {
            return res.status(400).json({ error: 'Cliente ID deve ser um número válido' });
        }

        // Busca as notas associadas ao clienteId
        const notas = await Nota.findAll({ where: { cliente_id: parsedClienteId } });

        if (notas.length === 0) {
            return res.status(404).json({ message: 'Nenhuma nota encontrada para o cliente' });
        }

        // Função auxiliar para buscar o nome do criador
        const getCreatorName = async (id) => {
            let creator = await Corretor.findOne({ where: { id } });
            if (!creator) {
                creator = await Correspondente.findOne({ where: { id } });
            }
            if (!creator) {
                creator = await Administrador.findOne({ where: { id } });
            }
            return creator ? creator.nome || creator.email : 'Desconhecido';
        };

        // Inclui o nome do criador em cada nota
        const notasComNomeCriador = await Promise.all(notas.map(async (nota) => {
            const nomeCriador = await getCreatorName(nota.criado_por_id);
            return {
                ...nota.toJSON(),
                criado_por_nome: nomeCriador,
            };
        }));

        // Exemplo: emitir evento socket ao buscar notas
        try {
            getSocketIO().emit('notas-buscadas', {
                clienteId: parsedClienteId,
                totalNotas: notasComNomeCriador.length
            });
        } catch (e) {
            console.warn('Socket.IO não inicializado:', e.message);
        }
        res.json(notasComNomeCriador);
    } catch (error) {
        console.error('Erro ao buscar notas:', error);
        res.status(500).json({ error: 'Erro ao buscar notas' });
    }
};

module.exports = { getNotasByClienteId };
