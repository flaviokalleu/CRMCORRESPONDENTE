'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ClienteAluguels', 'aluguel_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'aluguels', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('ClienteAluguels', 'data_inicio_contrato', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn('ClienteAluguels', 'data_fim_contrato', {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn('ClienteAluguels', 'indice_reajuste', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'IGPM',
    });

    await queryInterface.addColumn('ClienteAluguels', 'percentual_multa', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 2.00,
    });

    await queryInterface.addColumn('ClienteAluguels', 'percentual_juros_mora', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 1.00,
    });

    await queryInterface.addColumn('ClienteAluguels', 'score_inquilino', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('ClienteAluguels', 'score_detalhes', {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn('ClienteAluguels', 'score_atualizado_em', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ClienteAluguels', 'aluguel_id');
    await queryInterface.removeColumn('ClienteAluguels', 'data_inicio_contrato');
    await queryInterface.removeColumn('ClienteAluguels', 'data_fim_contrato');
    await queryInterface.removeColumn('ClienteAluguels', 'indice_reajuste');
    await queryInterface.removeColumn('ClienteAluguels', 'percentual_multa');
    await queryInterface.removeColumn('ClienteAluguels', 'percentual_juros_mora');
    await queryInterface.removeColumn('ClienteAluguels', 'score_inquilino');
    await queryInterface.removeColumn('ClienteAluguels', 'score_detalhes');
    await queryInterface.removeColumn('ClienteAluguels', 'score_atualizado_em');
  }
};
