'use strict';
const axios = require('axios');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // 1. Buscar todos os estados
    const estadosResponse = await axios.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados');
    const estados = estadosResponse.data.map(e => ({
      nome: e.nome,
      sigla: e.sigla,
      createdAt: now,
      updatedAt: now
    }));
    await queryInterface.bulkInsert('estados', estados, {});

    // 2. Buscar IDs dos estados inseridos
    const estadosInseridos = await queryInterface.sequelize.query(
      'SELECT id, sigla FROM estados',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const siglaToId = {};
    estadosInseridos.forEach(e => { siglaToId[e.sigla] = e.id; });

    // 3. Buscar todos os municípios
    const municipiosResponse = await axios.get('https://servicodados.ibge.gov.br/api/v1/localidades/municipios');
    const municipios = municipiosResponse.data
      .map(m => {
        const sigla =
          m &&
          m.microrregiao &&
          m.microrregiao.mesorregiao &&
          m.microrregiao.mesorregiao.UF &&
          m.microrregiao.mesorregiao.UF.sigla
            ? m.microrregiao.mesorregiao.UF.sigla
            : null;
        return sigla
          ? {
              nome: m.nome,
              estado_id: siglaToId[sigla],
              created_at: now,      // <-- snake_case aqui
              updated_at: now       // <-- snake_case aqui
            }
          : null;
      })
      .filter(Boolean);

    // 4. Remover duplicados (nome + estadoId)
    const seen = new Set();
    const uniqueMunicipios = municipios.filter(m => {
      const key = `${m.nome}-${m.estado_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 5. Inserir municípios na tabela "municipios"
    await queryInterface.bulkInsert('municipios', uniqueMunicipios, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('municipios', null, {});
    await queryInterface.bulkDelete('estados', null, {});
  }
};