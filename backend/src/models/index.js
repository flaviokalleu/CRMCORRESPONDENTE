const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

// Carregar as variáveis de ambiente do arquivo .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const config = {
  development: {
    database: process.env.DB_NAME || 'crm',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: false
    },
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true,
      // Set default index configuration
      indexes: []
    }
  }
};

const sequelize = new Sequelize(config[process.env.NODE_ENV || 'development']);
sequelize.options.logging = false; // Disable logging for index operations

const db = {};

// Carregar todos os modelos
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== 'index.js' &&
      file.slice(-3) === '.js'
    );
  })
  .forEach(file => {
    const modelPath = path.join(__dirname, file);
    const model = require(modelPath);

    if (typeof model === 'function') {
      const modelInstance = model(sequelize, Sequelize.DataTypes);
      db[modelInstance.name] = modelInstance;
    } else if (model instanceof Sequelize.Model) {
      db[model.name] = model;
    } else {
      throw new Error(`Modelo em ${file} não é uma função ou classe válida`);
    }
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});


db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
