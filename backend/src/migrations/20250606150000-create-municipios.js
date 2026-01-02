// backend/src/migrations/20250606150000-create-municipios.js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('municipios', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome: { type: Sequelize.STRING, allowNull: false },
      estado_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'estados', key: 'id' }
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('municipios');
  }
};