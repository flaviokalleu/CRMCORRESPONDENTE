'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('cliente_aluguels');

    if (!table.proprietario_id) {
      await queryInterface.addColumn('cliente_aluguels', 'proprietario_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'proprietario', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    if (!table.contrato_documentos) {
      await queryInterface.addColumn('cliente_aluguels', 'contrato_documentos', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array de { nome, path, tipo, data_upload }',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('cliente_aluguels');
    if (table.proprietario_id)      await queryInterface.removeColumn('cliente_aluguels', 'proprietario_id');
    if (table.contrato_documentos)  await queryInterface.removeColumn('cliente_aluguels', 'contrato_documentos');
  },
};
