

// backend/src/migrations/20250606151000-add-timestamps-to-lembretes.js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Lembretes', 'created_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    });
    await queryInterface.addColumn('Lembretes', 'updated_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('Lembretes', 'created_at');
    await queryInterface.removeColumn('Lembretes', 'updated_at');
  }
};