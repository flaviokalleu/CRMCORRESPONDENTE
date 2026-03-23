'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Token } = require('../models');
const { Op } = require('sequelize');

const SECRET_KEY = process.env.JWT_SECRET_KEY || process.env.ACCESS_TOKEN_SECRET || 'chave_secreta_padrao';
const REFRESH_SECRET_KEY = process.env.REFRESH_TOKEN_SECRET || 'chave_refresh_secreta_padrao';

function getUserRole(user) {
  if (user.is_administrador) return 'administrador';
  if (user.is_corretor) return 'corretor';
  if (user.is_correspondente) return 'correspondente';
  return 'User';
}

function getExpirationDate(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function generateTokens(user, role) {
  const payload = {
    id: user.id,
    email: user.email,
    role,
    is_administrador: user.is_administrador,
    is_corretor: user.is_corretor,
    is_correspondente: user.is_correspondente,
    tenant_id: user.tenant_id || null,
    is_super_admin: user.is_super_admin || false
  };
  const accessToken = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET_KEY, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

async function login(email, password) {
  const user = await User.findOne({ where: { email } });
  if (!user) return { error: 'Credenciais inválidas', status: 401 };

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return { error: 'Credenciais inválidas', status: 401 };

  const role = getUserRole(user);
  const { accessToken, refreshToken } = generateTokens(user, role);

  // Limpar tokens antigos
  await Token.destroy({ where: { user_id: user.id } });

  // Criar novos tokens no DB
  await Token.create({
    user_id: user.id,
    token: accessToken,
    type: 'access',
    expires_at: getExpirationDate(60)
  });
  await Token.create({
    user_id: user.id,
    token: refreshToken,
    type: 'refresh',
    expires_at: getExpirationDate(7 * 24 * 60)
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      foto: user.foto,
      role,
      is_administrador: user.is_administrador,
      is_corretor: user.is_corretor,
      is_correspondente: user.is_correspondente,
      is_super_admin: user.is_super_admin || false,
      tenant_id: user.tenant_id
    },
    token: accessToken,
    refreshToken
  };
}

async function refreshToken(token) {
  if (!token) return { error: 'Refresh token é obrigatório', status: 400 };

  const tokenRecord = await Token.findOne({
    where: { token, type: 'refresh', expires_at: { [Op.gt]: new Date() } }
  });
  if (!tokenRecord) return { error: 'Refresh token inválido ou expirado', status: 401 };

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET_KEY);
    const user = await User.findByPk(decoded.id);
    if (!user) return { error: 'Usuário não encontrado', status: 404 };

    const role = getUserRole(user);
    const payload = {
      id: user.id, email: user.email, role,
      is_administrador: user.is_administrador, is_corretor: user.is_corretor,
      is_correspondente: user.is_correspondente,
      tenant_id: user.tenant_id || null, is_super_admin: user.is_super_admin || false
    };
    const newAccessToken = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

    // Atualizar token no DB
    await Token.destroy({ where: { user_id: user.id, type: 'access' } });
    await Token.create({
      user_id: user.id, token: newAccessToken, type: 'access',
      expires_at: getExpirationDate(60)
    });

    return { token: newAccessToken, user: payload };
  } catch (error) {
    return { error: 'Token inválido', status: 401 };
  }
}

async function logout(token) {
  if (!token) return;
  await Token.destroy({ where: { token } });
}

async function getProfile(userId) {
  const user = await User.findByPk(userId, { attributes: { exclude: ['password'] } });
  if (!user) return null;
  return { ...user.toJSON(), role: getUserRole(user) };
}

async function updateProfile(email, data, file, requestingUser) {
  const user = await User.findOne({ where: { email } });
  if (!user) return null;

  // Apenas o próprio usuário ou admin pode atualizar
  if (requestingUser.email !== email && !requestingUser.is_administrador) {
    return { forbidden: true };
  }

  const updateData = {};
  const allowedFields = ['first_name', 'last_name', 'telefone'];
  for (const field of allowedFields) {
    if (data[field] !== undefined) updateData[field] = data[field];
  }

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  if (file) {
    updateData.foto = file.path.replace(/\\/g, '/').split('uploads/')[1];
  }

  await user.update(updateData);
  const updated = await User.findByPk(user.id, { attributes: { exclude: ['password'] } });
  return updated;
}

module.exports = {
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  getUserRole,
  generateTokens,
  SECRET_KEY,
  REFRESH_SECRET_KEY
};
