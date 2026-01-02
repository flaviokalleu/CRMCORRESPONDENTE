const { Sequelize } = require('sequelize');
require('dotenv').config();

const defaultConfig = {
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

// Config for Sequelize CLI and application
module.exports = {
  development: defaultConfig,
  test: {
    ...defaultConfig,
    database: process.env.DB_TEST_NAME || 'crm_test',
    logging: false
  },
  production: {
    ...defaultConfig,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  },
  // For application use
  sequelize: new Sequelize(
    defaultConfig.database,
    defaultConfig.username, 
    defaultConfig.password,
    defaultConfig
  )
};