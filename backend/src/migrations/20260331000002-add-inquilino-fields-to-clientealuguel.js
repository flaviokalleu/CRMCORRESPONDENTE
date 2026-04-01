'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('cliente_aluguels');

    const addIfMissing = async (column, definition) => {
      if (!tableDesc[column]) {
        await queryInterface.addColumn('cliente_aluguels', column, definition);
      }
    };

    await addIfMissing('data_nascimento', { type: Sequelize.DATEONLY, allowNull: true });
    await addIfMissing('cidade_nascimento', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('tem_fiador', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await addIfMissing('fiador_nome', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('fiador_telefone', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('fiador_email', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('fiador_cpf', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('fiador_data_nascimento', { type: Sequelize.DATEONLY, allowNull: true });
    await addIfMissing('fiador_cidade_nascimento', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('documento_id_path', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('contrato_path', { type: Sequelize.STRING, allowNull: true });
    await addIfMissing('fiador_documento_id_path', { type: Sequelize.STRING, allowNull: true });
  },

  async down(queryInterface) {
    const cols = [
      'data_nascimento', 'cidade_nascimento', 'tem_fiador',
      'fiador_nome', 'fiador_telefone', 'fiador_email', 'fiador_cpf',
      'fiador_data_nascimento', 'fiador_cidade_nascimento',
      'documento_id_path', 'contrato_path', 'fiador_documento_id_path',
    ];
    for (const col of cols) {
      await queryInterface.removeColumn('cliente_aluguels', col);
    }
  },
};
