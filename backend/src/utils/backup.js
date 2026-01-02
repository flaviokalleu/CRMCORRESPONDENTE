const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const backupDatabase = async () => {
  const dbName = process.env.DB_NAME || 'crm';
  const dbUser = process.env.DB_USERNAME || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const backupDir = path.resolve(__dirname, '../../backups');
  const backupFile = `backup_${dbName}_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupPath = path.join(backupDir, backupFile);

  return new Promise((resolve, reject) => {
    // Caminho do pg_dump (ajuste se necessário)
    const pgDumpPath = 'pg_dump';

    // Configura variável de ambiente para senha
    const env = { ...process.env, PGPASSWORD: dbPassword };

    const args = [
      '-U', dbUser,
      '-h', dbHost,
      '-p', dbPort,
      '-F', 'c', // formato custom, pode ser 'plain' se preferir .sql puro
      '-b',
      '-v',
      '-f', backupPath,
      dbName
    ];

    const dump = spawn(pgDumpPath, args, { env });

    dump.stderr.on('data', (data) => {
      console.error(`pg_dump stderr: ${data}`);
    });

    dump.on('error', (error) => {
      console.error('Erro ao criar backup:', error);
      reject(error);
    });

    dump.on('close', (code) => {
      if (code === 0) {
        console.log(`Backup criado com sucesso: ${backupPath}`);
        resolve(backupPath);
      } else {
        reject(new Error(`pg_dump finalizou com código ${code}`));
      }
    });
  });
};

module.exports = { backupDatabase };