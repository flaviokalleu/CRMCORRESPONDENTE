const jwt = require('jsonwebtoken');
const { Token, User } = require('../models');
const SECRET_KEY = process.env.JWT_SECRET_KEY || process.env.ACCESS_TOKEN_SECRET || process.env.SECRET_KEY || 'chave_secreta_padrao';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  try {
    const tokenRecord = await Token.findOne({ where: { token } });
    if (!tokenRecord || new Date() > (tokenRecord.expires_at || tokenRecord.expiresAt)) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      if (err) return res.sendStatus(403);

      // Busca o usuário no banco pelo id do token JWT
      const user = await User.findByPk(decoded.id);
      if (!user) return res.sendStatus(401);

      const userData = user.toJSON();
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role || user.tipo || null,
        tenant_id: userData.tenant_id,
        is_super_admin: userData.is_super_admin || false,
        ...userData
      };
      next();
    });
  } catch (error) {
    console.error('Erro ao verificar o token:', error);
    res.sendStatus(500);
  }
};

module.exports = authenticateToken;
