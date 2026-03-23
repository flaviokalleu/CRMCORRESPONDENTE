'use strict';

const authService = require('../services/authService');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function refreshToken(req, res) {
  try {
    const { refreshToken: token } = req.body;
    const result = await authService.refreshToken(token);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  } catch (error) {
    console.error('Erro ao refresh token:', error);
    res.status(500).json({ error: 'Erro ao renovar token' });
  }
}

async function validateToken(req, res) {
  res.json({ valid: true, user: req.user });
}

async function getProfile(req, res) {
  try {
    const profile = await authService.getProfile(req.user.id);
    if (!profile) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(profile);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
}

async function logout(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    await authService.logout(token);
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ error: 'Erro ao realizar logout' });
  }
}

async function getUserByEmail(req, res) {
  try {
    const { User } = require('../models');
    const user = await User.findOne({
      where: { email: req.params.email },
      attributes: { exclude: ['password'] }
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (req.user.email !== req.params.email && !req.user.is_administrador) {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
}

async function updateProfile(req, res) {
  try {
    const result = await authService.updateProfile(req.params.email, req.body, req.file, req.user);
    if (!result) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (result.forbidden) return res.status(403).json({ error: 'Sem permissão' });
    res.json(result);
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
}

module.exports = {
  login,
  refreshToken,
  validateToken,
  getProfile,
  logout,
  getUserByEmail,
  updateProfile
};
