const jwt = require('jsonwebtoken');
const { Token, User } = require('../models'); // Ajuste o caminho conforme sua estrutura
const SECRET_KEY = process.env.SECRET_KEY;

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  try {
    const tokenRecord = await Token.findOne({ where: { token } });
    if (!tokenRecord || new Date() > tokenRecord.expiresAt) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      if (err) return res.sendStatus(403);

      // Busca o usuário no banco pelo id do token JWT
      const user = await User.findByPk(decoded.id);
      if (!user) return res.sendStatus(401);

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role || user.tipo || null, // ajuste conforme seu model
        ...user.toJSON()
      };
      next();
    });
  } catch (error) {
    console.error('Erro ao verificar o token:', error);
    res.sendStatus(500);
  }
};

module.exports = authenticateToken;
