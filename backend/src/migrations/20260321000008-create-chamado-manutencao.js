'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('chamado_manutencaos', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      cliente_aluguel_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'ClienteAluguels', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      aluguel_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'aluguels', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      titulo: { type: Sequelize.STRING, allowNull: false },
      descricao: { type: Sequelize.TEXT, allowNull: false },
      categoria: { type: Sequelize.STRING, allowNull: true }, // eletrica, hidraulica, estrutural, outros
      prioridade: { type: Sequelize.STRING, defaultValue: 'media' }, // baixa, media, alta, urgente
      status: { type: Sequelize.STRING, defaultValue: 'aberto' }, // aberto, em_andamento, resolvido, cancelado
      fotos: { type: Sequelize.JSON, allowNull: true, defaultValue: [] },
      resposta_admin: { type: Sequelize.TEXT, allowNull: true },
      data_resolucao: { type: Sequelize.DATE, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },
  async down(queryInterface) { await queryInterface.dropTable('chamado_manutencaos'); }
};
