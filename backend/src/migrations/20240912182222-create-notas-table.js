'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notas', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cliente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'clientes', // Nome da tabela associada
          key: 'id',
        },
        onUpdate: 'CASCADE', // Atualiza se o cliente for atualizado
        onDelete: 'CASCADE',  // Deleta as notas se o cliente for deletado
      },
      processoId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      nova: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      destinatario: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      texto: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      conteudo: { // Adicionando a nova coluna 'conteudo'
        type: Sequelize.TEXT,
        allowNull: true,
      },
      data_criacao: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      criado_por_id: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: { // Corrigido para camelCase
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: { // Corrigido para camelCase
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('notas');
  }
};
