const logger = require('../config/logger');

/**
 * Middleware global de tratamento de erros.
 * Deve ser registrado APÓS todas as rotas no Express.
 */
const errorHandler = (err, req, res, _next) => {
  // Log estruturado do erro
  logger.error({
    err,
    method: req.method,
    url: req.originalUrl,
    ip: req.clientIp || req.ip,
    userId: req.user?.id || null,
  }, 'Erro não tratado na requisição');

  // Erros de validação do Sequelize
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors?.map(e => ({ field: e.path, message: e.message })) || [];
    return res.status(422).json({
      success: false,
      error: 'Erro de validação',
      details: errors,
    });
  }

  // Erros de upload (Multer)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'Arquivo muito grande. Tamanho máximo: 10MB',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Campo de arquivo inesperado',
    });
  }

  // Erros de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expirado',
    });
  }

  // Erro genérico
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Erro interno do servidor'
    : err.message || 'Erro interno do servidor';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

module.exports = errorHandler;
