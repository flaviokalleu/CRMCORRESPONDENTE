'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('clientes', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      nome: {
        type: Sequelize.STRING,
        allowNull: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      telefone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      cpf: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      valor_renda: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      estado_civil: {
        type: Sequelize.STRING,
        allowNull: true
      },
      naturalidade: {
        type: Sequelize.STRING,
        allowNull: true
      },
      profissao: {
        type: Sequelize.STRING,
        allowNull: true
      },
      data_admissao: {
        type: Sequelize.STRING(10), // YYYY-MM-DD
        allowNull: true
      },
      data_nascimento: {
        type: Sequelize.STRING(10), // YYYY-MM-DD
        allowNull: true
      },
      renda_tipo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      possui_carteira_mais_tres_anos: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      numero_pis: {
        type: Sequelize.STRING,
        allowNull: true
      },
      possui_dependente: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      documentos_pessoais: {
        type: Sequelize.STRING,
        allowNull: true
      },
      extrato_bancario: {
        type: Sequelize.STRING,
        allowNull: true
      },
      documentos_dependente: {
        type: Sequelize.STRING,
        allowNull: true
      },
      documentos_conjuge: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'aguardando_aprovação',
        allowNull: false
      },
      opcoes_processo: {
        type: Sequelize.JSON,
        allowNull: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('clientes');
  }
};
