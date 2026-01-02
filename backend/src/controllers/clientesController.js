// controllers/clienteController.js
const { clientes, Nota } = require('../models');


const getClientes = async (req, res) => {
    try {
        const clientes = await findAll({
            include: [{
                model: Nota,
                attributes: []
            }],
            attributes: {
                include: [
                    [sequelize.fn('COUNT', sequelize.col('Notas.id')), 'notaCount']
                ]
            },
            group: ['Cliente.id']
        });

        res.json(clientes);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
};

export default {
    getClientes
};
