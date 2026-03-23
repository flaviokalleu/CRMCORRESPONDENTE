'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notificacoes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      tenant_id: { type: Sequelize.INTEGER, allowNull: true },
      tipo: {
        type: Sequelize.ENUM('info', 'alerta', 'sucesso', 'erro', 'vencimento', 'proposta', 'visita', 'pagamento'),
        defaultValue: 'info',
      },
      titulo: { type: Sequelize.STRING, allowNull: false },
      mensagem: { type: Sequelize.TEXT, allowNull: true },
      lida: { type: Sequelize.BOOLEAN, defaultValue: false },
      link: { type: Sequelize.STRING, allowNull: true },
      dados: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('notificacoes', ['user_id']);
    await queryInterface.addIndex('notificacoes', ['tenant_id']);
    await queryInterface.addIndex('notificacoes', ['lida']);
    await queryInterface.addIndex('notificacoes', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notificacoes');
  },
};
