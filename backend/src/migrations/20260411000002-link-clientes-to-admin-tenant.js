'use strict';

/**
 * Vincula os clientes legados ao tenant do usuário admin@admin.com.
 *
 * Cenário: a base existente pertence integralmente à empresa principal,
 * mas os registros podem estar sem tenant_id correto por terem sido criados
 * antes da implantação do isolamento multi-tenant.
 */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [adminUsers] = await queryInterface.sequelize.query(
        `
          SELECT id, tenant_id
          FROM users
          WHERE email = 'admin@admin.com'
          LIMIT 1
        `,
        { transaction }
      );

      let adminTenantId = adminUsers.length > 0 ? adminUsers[0].tenant_id : null;

      if (!adminTenantId) {
        const [tenants] = await queryInterface.sequelize.query(
          `
            SELECT id
            FROM tenants
            WHERE slug = 'admin-principal'
            ORDER BY id ASC
            LIMIT 1
          `,
          { transaction }
        );

        if (!tenants.length) {
          throw new Error('Tenant admin-principal não encontrado para vincular clientes existentes');
        }

        adminTenantId = tenants[0].id;

        await queryInterface.sequelize.query(
          `
            UPDATE users
            SET tenant_id = :tenantId,
                updated_at = CURRENT_TIMESTAMP
            WHERE email = 'admin@admin.com'
          `,
          {
            replacements: { tenantId: adminTenantId },
            transaction
          }
        );
      }

      await queryInterface.sequelize.query(
        `
          UPDATE clientes
          SET tenant_id = :tenantId,
              updated_at = CURRENT_TIMESTAMP
        `,
        {
          replacements: { tenantId: adminTenantId },
          transaction
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `
          UPDATE clientes
          SET tenant_id = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id IS NOT NULL
        `,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};