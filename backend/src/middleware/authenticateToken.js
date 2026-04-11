const jwt = require('jsonwebtoken');
const { Token, User } = require('../models');
if (!process.env.JWT_SECRET_KEY && !process.env.ACCESS_TOKEN_SECRET && !process.env.SECRET_KEY) {
  console.error('AVISO: Nenhuma variável JWT_SECRET_KEY, ACCESS_TOKEN_SECRET ou SECRET_KEY configurada!');
}
const SECRET_KEY = process.env.JWT_SECRET_KEY || process.env.ACCESS_TOKEN_SECRET || process.env.SECRET_KEY;

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  try {
    const tokenRecord = await Token.findOne({ where: { token } });
    if (!tokenRecord || new Date() > (tokenRecord.expires_at || tokenRecord.expiresAt)) {
      return res.status(401).json({ error: 'Token expirado ou inválido' });
    }

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
      if (err) return res.status(403).json({ error: 'Token inválido' });

      const user = await User.findByPk(decoded.id);
      if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

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
    res.status(500).json({ error: 'Erro interno de autenticação' });
  }
};

module.exports = authenticateToken;
