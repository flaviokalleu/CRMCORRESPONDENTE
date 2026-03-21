'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('regua_cobrancas', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      cliente_aluguel_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'ClienteAluguels', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      cobranca_aluguel_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'cobranca_aluguels', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      etapa: { type: Sequelize.STRING, allowNull: false }, // D-5, D-1, D+1, D+7, D+15
      dias_referencia: { type: Sequelize.INTEGER, allowNull: false }, // -5, -1, 1, 7, 15
      mensagem_enviada: { type: Sequelize.BOOLEAN, defaultValue: false },
      data_envio: { type: Sequelize.DATE, allowNull: true },
      data_referencia: { type: Sequelize.DATEONLY, allowNull: false }, // data de vencimento da cobrança
      mes_referencia: { type: Sequelize.STRING, allowNull: true }, // "2026-03"
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('regua_cobrancas'); }
};
