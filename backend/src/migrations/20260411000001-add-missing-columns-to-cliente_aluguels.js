'use strict';

// Adds missing columns to the `cliente_aluguels` table.
// These columns exist on the wrong `ClienteAluguels` table due to earlier
// migrations targeting the wrong table name casing.

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('cliente_aluguels');
    const existing = Object.keys(tableDesc);

    const toAdd = [
      ['asaas_customer_id',       { type: Sequelize.STRING, allowNull: true }],
      ['asaas_subscription_id',   { type: Sequelize.STRING, allowNull: true }],
      ['asaas_subscription_status', { type: Sequelize.STRING, allowNull: true }],
      ['aluguel_id',              { type: Sequelize.INTEGER, allowNull: true, references: { model: 'alugueis', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' }],
      ['data_inicio_contrato',    { type: Sequelize.DATEONLY, allowNull: true }],
      ['data_fim_contrato',       { type: Sequelize.DATEONLY, allowNull: true }],
      ['indice_reajuste',         { type: Sequelize.STRING, allowNull: true, defaultValue: 'IGPM' }],
      ['percentual_multa',        { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 2.00 }],
      ['percentual_juros_mora',   { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 1.00 }],
      ['score_inquilino',         { type: Sequelize.INTEGER, allowNull: true }],
      ['score_detalhes',          { type: Sequelize.JSON, allowNull: true }],
      ['score_atualizado_em',     { type: Sequelize.DATE, allowNull: true }],
      ['proprietario_nome',       { type: Sequelize.STRING, allowNull: true }],
      ['proprietario_telefone',   { type: Sequelize.STRING, allowNull: true }],
      ['proprietario_pix',        { type: Sequelize.STRING, allowNull: true }],
      ['taxa_administracao',      { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 10.00 }],
      ['corretor_percentual',     { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 0 }],
      ['corretor_nome',           { type: Sequelize.STRING, allowNull: true }],
      ['corretor_pix',            { type: Sequelize.STRING, allowNull: true }],
      ['tenant_id',               { type: Sequelize.INTEGER, allowNull: true, references: { model: 'tenants', key: 'id' } }],
    ];

    for (const [col, def] of toAdd) {
      if (!existing.includes(col)) {
        await queryInterface.addColumn('cliente_aluguels', col, def);
      }
    }
  },

  async down(queryInterface) {
    const cols = [
      'asaas_customer_id', 'asaas_subscription_id', 'asaas_subscription_status',
      'aluguel_id', 'data_inicio_contrato', 'data_fim_contrato', 'indice_reajuste',
      'percentual_multa', 'percentual_juros_mora', 'score_inquilino', 'score_detalhes',
      'score_atualizado_em', 'proprietario_nome', 'proprietario_telefone', 'proprietario_pix',
      'taxa_administracao', 'corretor_percentual', 'corretor_nome', 'corretor_pix', 'tenant_id',
    ];
    const tableDesc = await queryInterface.describeTable('cliente_aluguels');
    const existing = Object.keys(tableDesc);
    for (const col of cols) {
      if (existing.includes(col)) {
        await queryInterface.removeColumn('cliente_aluguels', col);
      }
    }
  },
};
