'use strict';

const path = require('path');
const fs = require('fs');
const { Tenant, Plan, Subscription } = require('../models');

/**
 * Resolve o limite efetivo de storage (tenant override > plano).
 * @returns {{ maxStorageMb: number, maxFileSizeMb: number }}
 */
async function getStorageLimits(tenantId) {
  const tenant = await Tenant.findByPk(tenantId, {
    include: [{
      model: Subscription,
      as: 'subscriptions',
      where: { status: ['active', 'trialing'] },
      include: [{ model: Plan, as: 'plan' }],
      order: [['created_at', 'DESC']],
      limit: 1,
      required: false
    }]
  });

  if (!tenant) return { maxStorageMb: 500, maxFileSizeMb: 10 };

  const plan = tenant.subscriptions?.[0]?.plan;

  const maxStorageMb = (tenant.max_storage_mb !== null && tenant.max_storage_mb !== undefined)
    ? tenant.max_storage_mb
    : (plan?.max_storage_mb || 500);

  const maxFileSizeMb = (tenant.max_file_size_mb !== null && tenant.max_file_size_mb !== undefined)
    ? tenant.max_file_size_mb
    : (plan?.max_file_size_mb || 10);

  return { maxStorageMb, maxFileSizeMb };
}

/**
 * Obtém o uso atual de storage de um tenant.
 * @returns {{ usedBytes: number, usedMb: number }}
 */
async function getStorageUsage(tenantId) {
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) return { usedBytes: 0, usedMb: 0 };

  const usedBytes = parseInt(tenant.storage_used_bytes || 0);
  return {
    usedBytes,
    usedMb: Math.round((usedBytes / (1024 * 1024)) * 100) / 100
  };
}

/**
 * Obtém info completa de storage (limites + uso + percentual).
 */
async function getStorageInfo(tenantId) {
  const [limits, usage] = await Promise.all([
    getStorageLimits(tenantId),
    getStorageUsage(tenantId)
  ]);

  const percentUsed = limits.maxStorageMb > 0
    ? Math.round((usage.usedMb / limits.maxStorageMb) * 100)
    : 0;

  return {
    usado_mb: usage.usedMb,
    usado_bytes: usage.usedBytes,
    limite_mb: limits.maxStorageMb,
    limite_arquivo_mb: limits.maxFileSizeMb,
    percentual: percentUsed,
    ilimitado: limits.maxStorageMb === 0,
    disponivel_mb: limits.maxStorageMb === 0 ? null : Math.max(0, limits.maxStorageMb - usage.usedMb)
  };
}

/**
 * Incrementa o uso de storage após upload.
 * @param {number} tenantId
 * @param {number} bytes - bytes adicionados
 */
async function incrementStorage(tenantId, bytes) {
  if (!tenantId || !bytes) return;
  await Tenant.increment('storage_used_bytes', {
    by: bytes,
    where: { id: tenantId }
  });
}

/**
 * Decrementa o uso de storage após deletar arquivo.
 * @param {number} tenantId
 * @param {number} bytes - bytes removidos
 */
async function decrementStorage(tenantId, bytes) {
  if (!tenantId || !bytes) return;
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) return;

  const newUsed = Math.max(0, parseInt(tenant.storage_used_bytes || 0) - bytes);
  await tenant.update({ storage_used_bytes: newUsed });
}

/**
 * Recalcula o storage usado por um tenant escaneando os arquivos em disco.
 * Útil para sincronização ou correção.
 */
async function recalculateStorage(tenantId) {
  const uploadsDir = path.resolve(__dirname, '../../uploads');
  let totalBytes = 0;

  const scanDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else {
        totalBytes += fs.statSync(fullPath).size;
      }
    }
  };

  // Por enquanto, conta tudo em uploads/ (single-tenant por enquanto)
  // Quando multi-tenant real, filtrar por tenant_id nos paths
  scanDir(uploadsDir);

  await Tenant.update(
    { storage_used_bytes: totalBytes },
    { where: { id: tenantId } }
  );

  return {
    tenant_id: tenantId,
    bytes: totalBytes,
    mb: Math.round((totalBytes / (1024 * 1024)) * 100) / 100
  };
}

module.exports = {
  getStorageLimits,
  getStorageUsage,
  getStorageInfo,
  incrementStorage,
  decrementStorage,
  recalculateStorage
};
