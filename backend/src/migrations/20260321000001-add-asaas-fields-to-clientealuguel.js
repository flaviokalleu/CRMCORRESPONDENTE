'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ClienteAluguels', 'asaas_customer_id', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('ClienteAluguels', 'asaas_subscription_id', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('ClienteAluguels', 'asaas_subscription_status', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ClienteAluguels', 'asaas_customer_id');
    await queryInterface.removeColumn('ClienteAluguels', 'asaas_subscription_id');
    await queryInterface.removeColumn('ClienteAluguels', 'asaas_subscription_status');
  }
};
