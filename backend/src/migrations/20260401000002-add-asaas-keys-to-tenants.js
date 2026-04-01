'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('tenants');

    if (!tableDesc.asaas_api_key) {
      await queryInterface.addColumn('tenants', 'asaas_api_key', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Chave de API do Asaas para este tenant',
      });
    }

    if (!tableDesc.asaas_webhook_token) {
      await queryInterface.addColumn('tenants', 'asaas_webhook_token', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Token de validação do webhook Asaas para este tenant',
      });
    }
  },

  async down(queryInterface) {
    const tableDesc = await queryInterface.describeTable('tenants');

    if (tableDesc.asaas_api_key) {
      await queryInterface.removeColumn('tenants', 'asaas_api_key');
    }

    if (tableDesc.asaas_webhook_token) {
      await queryInterface.removeColumn('tenants', 'asaas_webhook_token');
    }
  },
};
