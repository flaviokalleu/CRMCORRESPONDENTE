require('dotenv').config();

const config = {
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crm',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5432',
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: false
  },
  define: {
    timestamps: true,
    underscored: true,
    underscoredAll: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
};

// Exportar para sequelize-cli e aplicação
module.exports = {
  development: config,
  test: {
    ...config,
    database: process.env.DB_TEST_NAME || 'crm_test'
  },
  production: config
};
