'use strict';

const storageService = require('../services/storageService');

/**
 * Middleware que verifica limites de storage ANTES do upload (via Content-Length).
 * Usar antes do multer nas rotas de upload.
 *
 * Uso: router.post('/upload', checkStorageLimit, upload.fields([...]), controller)
 */
const checkStorageLimit = async (req, res, next) => {
  try {
    // Super admin bypass
    if (req.isSuperAdmin) return next();

    const tenantId = req.tenantId || req.user?.tenant_id;
    if (!tenantId) return next(); // Sem tenant, deixar passar

    const limits = await storageService.getStorageLimits(tenantId);

    // 0 = ilimitado
    if (limits.maxStorageMb === 0) return next();

    // Verificar espaço disponível
    const usage = await storageService.getStorageUsage(tenantId);
    const limitBytes = limits.maxStorageMb * 1024 * 1024;

    if (usage.usedBytes >= limitBytes) {
      return res.status(413).json({
        error: 'Limite de armazenamento atingido',
        message: `Seu plano permite ${limits.maxStorageMb} MB de armazenamento. Você já utilizou ${usage.usedMb} MB.`,
        code: 'STORAGE_LIMIT_REACHED',
        usado_mb: usage.usedMb,
        limite_mb: limits.maxStorageMb,
        upgrade_necessario: true
      });
    }

    // Verificar tamanho do arquivo via Content-Length (estimativa)
    const contentLength = parseInt(req.headers['content-length'] || 0);
    if (contentLength > 0 && limits.maxFileSizeMb > 0) {
      const maxFileBytes = limits.maxFileSizeMb * 1024 * 1024;
      if (contentLength > maxFileBytes) {
        return res.status(413).json({
          error: 'Arquivo muito grande',
          message: `O tamanho máximo por arquivo é ${limits.maxFileSizeMb} MB.`,
          code: 'FILE_TOO_LARGE',
          limite_arquivo_mb: limits.maxFileSizeMb
        });
      }
    }

    // Salvar limites no req para uso posterior
    req.storageLimits = limits;
    req.storageUsage = usage;

    next();
  } catch (error) {
    console.error('Erro ao verificar limite de storage:', error);
    next(); // Fail-open para não bloquear o usuário
  }
};

/**
 * Middleware que atualiza o uso de storage DEPOIS do upload.
 * Usar depois do multer e do handler de sucesso.
 *
 * Uso: router.post('/upload', multer, controller, trackStorageUsage)
 * Ou chamar manualmente: trackUploadedFiles(req)
 */
const trackStorageAfterUpload = async (req, res, next) => {
  // Só rastrear se houve upload bem-sucedido
  if (res.statusCode < 400 && req.files) {
    const tenantId = req.tenantId || req.user?.tenant_id;
    if (tenantId) {
      let totalBytes = 0;
      const files = req.files;

      if (Array.isArray(files)) {
        files.forEach(f => { totalBytes += f.size || 0; });
      } else {
        Object.values(files).forEach(fileArray => {
          if (Array.isArray(fileArray)) {
            fileArray.forEach(f => { totalBytes += f.size || 0; });
          }
        });
      }

      if (totalBytes > 0) {
        await storageService.incrementStorage(tenantId, totalBytes);
      }
    }
  }

  if (next) next();
};

/**
 * Helper para rastrear bytes de arquivos uploaded manualmente.
 */
async function trackUploadedFiles(tenantId, files) {
  if (!tenantId || !files) return;
  let totalBytes = 0;

  if (Array.isArray(files)) {
    files.forEach(f => { totalBytes += f.size || 0; });
  } else {
    Object.values(files).forEach(fileArray => {
      if (Array.isArray(fileArray)) {
        fileArray.forEach(f => { totalBytes += f.size || 0; });
      }
    });
  }

  if (totalBytes > 0) {
    await storageService.incrementStorage(tenantId, totalBytes);
  }
}

/**
 * Cria um multer fileFilter que respeita o limite por arquivo do plano.
 */
function createFileSizeFilter(defaultMaxMb = 10) {
  return async (req, file, cb) => {
    // O limite real será verificado pelo checkStorageLimit
    // Aqui só definimos o multer limits dinamicamente
    cb(null, true);
  };
}

module.exports = {
  checkStorageLimit,
  trackStorageAfterUpload,
  trackUploadedFiles,
  createFileSizeFilter
};
