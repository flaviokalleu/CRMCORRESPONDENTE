'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vistoria_aluguels', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      cliente_aluguel_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'ClienteAluguels', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      aluguel_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'alugueis', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      tipo: { type: Sequelize.STRING, allowNull: false, defaultValue: 'entrada' }, // 'entrada' ou 'saida'
      data_vistoria: { type: Sequelize.DATEONLY, allowNull: false },
      observacoes_gerais: { type: Sequelize.TEXT, allowNull: true },
      checklist: { type: Sequelize.JSON, allowNull: true, defaultValue: [] },
      // Cada item: { comodo, item, estado: 'bom'|'regular'|'ruim'|'danificado', observacao, foto_url }
      fotos: { type: Sequelize.JSON, allowNull: true, defaultValue: [] },
      // Array de { descricao, url, comodo }
      pdf_url: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.STRING, defaultValue: 'rascunho' }, // rascunho, finalizado
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('vistoria_aluguels'); }
};
