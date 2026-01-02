'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Verificar se a tabela já existe
    const tableExists = await queryInterface.showAllTables()
      .then(tables => tables.includes('pagamentos'));

    if (!tableExists) {
      await queryInterface.createTable('pagamentos', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
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
          allowNull: true,
          comment: 'ID da preferência no Mercado Pago'
        },
        mp_payment_id: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'ID do pagamento no Mercado Pago'
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
          allowNull: false,
          comment: 'Valor formatado como string (ex: 2.000,00)'
        },
        valor_numerico: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Valor numérico para cálculos'
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
          allowNull: true,
          comment: 'Link para pagamento (boleto, PIX, etc)'
        },
        observacoes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        dados_mp: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Dados completos retornados pelo Mercado Pago'
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

      console.log('✅ Tabela pagamentos criada com sucesso');
    } else {
      console.log('ℹ️ Tabela pagamentos já existe');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pagamentos');
  }
};