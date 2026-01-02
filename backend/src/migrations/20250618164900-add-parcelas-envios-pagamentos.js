'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Função para verificar se coluna existe
    const columnExists = async (tableName, columnName) => {
      try {
        const result = await queryInterface.sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = '${tableName}' 
          AND column_name = '${columnName}';
        `);
        return result[0].length > 0;
      } catch (error) {
        console.log(`Erro ao verificar coluna ${columnName}:`, error.message);
        return false;
      }
    };

    // Lista de colunas para adicionar
    const columnsToAdd = [
      {
        name: 'parcelas',
        definition: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Número de parcelas (1 = à vista)'
        }
      },
      {
        name: 'valor_parcela',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Valor de cada parcela formatado'
        }
      },
      {
        name: 'valor_parcela_numerico',
        definition: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Valor numérico de cada parcela'
        }
      },
      {
        name: 'whatsapp_enviado',
        definition: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'Se foi enviado para WhatsApp'
        }
      },
      {
        name: 'email_enviado',
        definition: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'Se foi enviado por email'
        }
      },
      {
        name: 'data_envio_whatsapp',
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Data do envio do WhatsApp'
        }
      },
      {
        name: 'data_envio_email',
        definition: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Data do envio do email'
        }
      },
      {
        name: 'link_curto',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Link encurtado para compartilhamento'
        }
      },
      {
        name: 'codigo_barras',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Código de barras do boleto'
        }
      },
      {
        name: 'linha_digitavel',
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Linha digitável do boleto'
        }
      },
      {
        name: 'qr_code',
        definition: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'QR Code para PIX'
        }
      },
      {
        name: 'qr_code_base64',
        definition: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'QR Code em base64'
        }
      }
    ];

    // Adicionar cada coluna se não existir
    for (const column of columnsToAdd) {
      const exists = await columnExists('pagamentos', column.name);
      
      if (!exists) {
        try {
          await queryInterface.addColumn('pagamentos', column.name, column.definition);
          console.log(`✅ Coluna '${column.name}' adicionada com sucesso`);
        } catch (error) {
          console.error(`❌ Erro ao adicionar coluna '${column.name}':`, error.message);
        }
      } else {
        console.log(`ℹ️ Coluna '${column.name}' já existe, pulando...`);
      }
    }

    console.log('🎉 Migration concluída!');
  },

  async down(queryInterface, Sequelize) {
    // Lista de colunas para remover (em ordem reversa)
    const columnsToRemove = [
      'qr_code_base64',
      'qr_code',
      'linha_digitavel',
      'codigo_barras',
      'link_curto',
      'data_envio_email',
      'data_envio_whatsapp',
      'email_enviado',
      'whatsapp_enviado',
      'valor_parcela_numerico',
      'valor_parcela',
      'parcelas'
    ];

    for (const columnName of columnsToRemove) {
      try {
        await queryInterface.removeColumn('pagamentos', columnName);
        console.log(`✅ Coluna '${columnName}' removida`);
      } catch (error) {
        console.log(`⚠️ Erro ao remover coluna '${columnName}':`, error.message);
      }
    }
  }
};