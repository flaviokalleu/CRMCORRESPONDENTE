'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Adicionar campos de proprietário e taxa admin ao ClienteAluguel
    await queryInterface.addColumn('ClienteAluguels', 'proprietario_nome', {
      type: Sequelize.STRING, allowNull: true,
    });
    await queryInterface.addColumn('ClienteAluguels', 'proprietario_telefone', {
      type: Sequelize.STRING, allowNull: true,
    });
    await queryInterface.addColumn('ClienteAluguels', 'proprietario_pix', {
      type: Sequelize.STRING, allowNull: true,
    });
    await queryInterface.addColumn('ClienteAluguels', 'taxa_administracao', {
      type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 10.00, // 10% padrão
    });

    // Tabela de repasses
    await queryInterface.createTable('repasse_proprietarios', {
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
      valor_aluguel: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      taxa_administracao_percentual: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      valor_taxa: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      valor_repasse: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      mes_referencia: { type: Sequelize.STRING, allowNull: false }, // "2026-03"
      status: { type: Sequelize.STRING, defaultValue: 'PENDENTE' }, // PENDENTE, REALIZADO
      data_repasse: { type: Sequelize.DATEONLY, allowNull: true },
      observacao: { type: Sequelize.STRING, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('repasse_proprietarios');
    await queryInterface.removeColumn('ClienteAluguels', 'proprietario_nome');
    await queryInterface.removeColumn('ClienteAluguels', 'proprietario_telefone');
    await queryInterface.removeColumn('ClienteAluguels', 'proprietario_pix');
    await queryInterface.removeColumn('ClienteAluguels', 'taxa_administracao');
  }
};
