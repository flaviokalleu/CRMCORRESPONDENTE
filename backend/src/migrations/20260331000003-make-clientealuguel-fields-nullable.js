'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('cliente_aluguels');

    // Make these fields nullable so partial form submissions don't fail
    const colsToMakeNullable = ['cpf', 'email', 'telefone'];
    for (const col of colsToMakeNullable) {
      if (tableDesc[col] && !tableDesc[col].allowNull) {
        await queryInterface.changeColumn('cliente_aluguels', col, {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const colsToMakeRequired = ['cpf', 'email', 'telefone'];
    for (const col of colsToMakeRequired) {
      await queryInterface.changeColumn('cliente_aluguels', col, {
        type: Sequelize.STRING,
        allowNull: false,
      });
    }
  },
};
