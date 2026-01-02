const jwt = require('jsonwebtoken');
const { Token } = require('../models'); // Importar o modelo Token
const SECRET_KEY = process.env.JWT_SECRET_KEY || 'your_jwt_secret_key';

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Exemplo: "Bearer <token>"

    if (token == null) return res.sendStatus(401); // Se não houver token, retorna 401

    try {
        // Verifique se o token está no banco de dados
        const tokenRecord = await Token.findOne({ where: { token } });
        if (!tokenRecord) return res.sendStatus(401); // Token não encontrado

        // Verifique e decodifique o token
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (err) return res.sendStatus(403); // Token inválido
            req.user = user; // Adiciona o usuário ao objeto `req`
            next(); // Prossegue para a próxima middleware ou rota
        });
    } catch (error) {
        console.error('Erro ao autenticar o token:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = authenticateToken;
