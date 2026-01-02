// backend/src/migrations/20250606170000-add-processo-id-to-notas.js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('notas', 'processo_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('notas', 'processo_id');
  }
};