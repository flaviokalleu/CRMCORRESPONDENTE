'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('pagamentos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      cliente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'clientes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      mp_preference_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      mp_payment_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      tipo: {
        type: Sequelize.ENUM('boleto', 'pix', 'cartao'),
        allowNull: false,
        defaultValue: 'boleto'
      },
      status: {
        type: Sequelize.ENUM('pendente', 'aprovado', 'rejeitado', 'cancelado', 'expirado'),
        allowNull: false,
        defaultValue: 'pendente'
      },
      titulo: {
        type: Sequelize.STRING,
        allowNull: false
      },
      descricao: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      valor: {
        type: Sequelize.STRING,
        allowNull: false
      },
      valor_numerico: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      data_vencimento: {
        type: Sequelize.DATE,
        allowNull: true
      },
      data_pagamento: {
        type: Sequelize.DATE,
        allowNull: true
      },
      link_pagamento: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      codigo_barras: {
        type: Sequelize.STRING,
        allowNull: true
      },
      linha_digitavel: {
        type: Sequelize.STRING,
        allowNull: true
      },
      qr_code: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      qr_code_base64: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      observacoes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      dados_mp: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('pagamentos');
  }
};