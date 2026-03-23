'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('visitas', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      cliente_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'clientes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      imovel_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'imoveis', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      corretor_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      criado_por_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      tenant_id: { type: Sequelize.INTEGER, allowNull: true },
      data_visita: { type: Sequelize.DATE, allowNull: false },
      status: {
        type: Sequelize.ENUM('agendada', 'realizada', 'cancelada', 'reagendada'),
        defaultValue: 'agendada',
      },
      observacoes: { type: Sequelize.TEXT, allowNull: true },
      feedback_cliente: { type: Sequelize.TEXT, allowNull: true },
      nota_avaliacao: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('visitas', ['cliente_id']);
    await queryInterface.addIndex('visitas', ['imovel_id']);
    await queryInterface.addIndex('visitas', ['corretor_id']);
    await queryInterface.addIndex('visitas', ['tenant_id']);
    await queryInterface.addIndex('visitas', ['data_visita']);
    await queryInterface.addIndex('visitas', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('visitas');
  },
};
